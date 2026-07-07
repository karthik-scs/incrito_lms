/**
 * AES-128 HLS encryption pipeline.
 *
 * When a VIDEO lesson's contentUrl is set, `triggerHlsPackaging` is called asynchronously.
 * FFmpeg re-packages the MP4 into 10-second .ts segments encrypted with a per-lesson AES-128 key.
 * The key is stored in the DB (base64). Segments are stored in S3 under `hls/{lessonId}/`.
 *
 * At playback time:
 *  1. GET /api/lessons/:id/content-url → { url: '/api/lessons/:id/hls-manifest?t=TOKEN', type: 'hls' }
 *  2. HLS.js fetches the manifest — we serve it with presigned segment URLs rewritten inline.
 *  3. HLS.js fetches the key from the URI embedded in the manifest (#EXT-X-KEY).
 *     Both calls carry the same IP-bound stream token → same machine required.
 */

import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

// S3 segment presigned URL lifetime — long enough for a full video session.
const SEGMENT_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const PLACEHOLDER_KEY_URI = "__HLS_KEY_URI__";

// ---------------------------------------------------------------------------
// FFmpeg detection
// ---------------------------------------------------------------------------

let _ffmpegPath: string | null | undefined = undefined; // undefined = not checked yet

async function getFfmpegPath(): Promise<string> {
  if (_ffmpegPath !== undefined) {
    if (_ffmpegPath === null) throw new AppError("FFmpeg is not installed. Install it from https://ffmpeg.org/download.html and ensure it is in your PATH.", 500);
    return _ffmpegPath;
  }
  try {
    const { execSync } = await import("node:child_process");
    const result = execSync(process.platform === "win32" ? "where ffmpeg" : "which ffmpeg", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    _ffmpegPath = result.trim().split("\n")[0].trim();
    return _ffmpegPath;
  } catch {
    _ffmpegPath = null;
    throw new AppError("FFmpeg is not installed. Install it from https://ffmpeg.org/download.html and ensure it is in your PATH.", 500);
  }
}

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

/** Fire-and-forget: called after contentUrl is saved. Errors are caught and recorded on the lesson. */
export function triggerHlsPackaging(lessonId: string): void {
  packageLessonHls(lessonId).catch((err) => {
    console.error(`[HLS] packaging failed for lesson ${lessonId}:`, err?.message ?? err);
    prisma.lesson.update({ where: { id: lessonId }, data: { hlsStatus: "FAILED" } }).catch(() => null);
  });
}

async function packageLessonHls(lessonId: string): Promise<void> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson?.contentUrl) throw new Error("Lesson has no contentUrl");

  // Mark in-progress so the player knows to wait.
  await prisma.lesson.update({ where: { id: lessonId }, data: { hlsStatus: "PROCESSING", hlsManifestKey: null, hlsEncryptionKey: null } });

  const tmpDir = await mkdtemp(join(tmpdir(), `hls-${lessonId}-`));
  try {
    await runPackaging(lessonId, lesson.contentUrl, tmpDir);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function runPackaging(lessonId: string, contentUrl: string, tmpDir: string): Promise<void> {
  const ffmpegPath = await getFfmpegPath();

  // -- Download source MP4 from S3 --
  const key = contentUrl.split("/api/files/")[1];
  if (!key) throw new Error("contentUrl is not an S3-backed file");

  const { getConfigAndClient } = await import("../lib/s3");
  const { config, client } = await getConfigAndClient();

  const getObj = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!getObj.Body) throw new Error("Empty S3 response");

  const inputPath = join(tmpDir, "input.mp4");
  const body = getObj.Body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeStream: NodeJS.ReadableStream = typeof (body as any).pipe === "function"
    ? body as unknown as NodeJS.ReadableStream
    : Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, createWriteStream(inputPath));

  // -- Generate AES-128 key --
  const aesKey = randomBytes(16);
  const keyPath = join(tmpDir, "enc.key");
  await writeFile(keyPath, aesKey);

  const keyInfoPath = join(tmpDir, "enc.keyinfo");
  // Line 1: key URI embedded in the manifest (replaced at serve time)
  // Line 2: path to the binary key file
  await writeFile(keyInfoPath, `${PLACEHOLDER_KEY_URI}\n${keyPath}\n`);

  // -- Run FFmpeg --
  const manifestPath = join(tmpDir, "manifest.m3u8");
  const segPattern = join(tmpDir, "seg%04d.ts");

  await runFfmpeg(ffmpegPath, [
    "-i", inputPath,
    "-c:v", "copy",
    "-c:a", "copy",
    "-hls_time", "10",
    "-hls_key_info_file", keyInfoPath,
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", segPattern,
    "-hls_list_size", "0",
    manifestPath,
  ]);

  // -- Upload all generated files to S3 --
  const prefix = `hls/${lessonId}`;
  const files = await readdir(tmpDir);
  const segFiles = files.filter((f) => f.endsWith(".ts"));

  await Promise.all([
    // Upload segments
    ...segFiles.map(async (seg) => {
      const content = await readFile(join(tmpDir, seg));
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: `${prefix}/${seg}`, Body: content, ContentType: "video/MP2T" }));
    }),
    // Upload manifest
    (async () => {
      const manifest = await readFile(manifestPath, "utf8");
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: `${prefix}/manifest.m3u8`, Body: manifest, ContentType: "application/vnd.apple.mpegurl" }));
    })(),
  ]);

  // -- Persist to DB --
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      hlsManifestKey: prefix,
      hlsEncryptionKey: aesKey.toString("base64"),
      hlsStatus: "READY",
    },
  });

  console.log(`[HLS] packaged lesson ${lessonId}: ${segFiles.length} segments`);
}

function runFfmpeg(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stderrChunks: Buffer[] = [];
    proc.stderr?.on("data", (d: Buffer) => stderrChunks.push(d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg exited ${code}: ${Buffer.concat(stderrChunks).toString().slice(-500)}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Manifest serving
// ---------------------------------------------------------------------------

/**
 * Returns the HLS manifest with:
 *  - #EXT-X-KEY URI replaced with our key endpoint + the caller's stream token
 *  - Relative .ts segment paths replaced with presigned S3 URLs (4-hour TTL)
 */
export async function buildManifestResponse(lessonId: string, streamToken: string): Promise<string> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson?.hlsManifestKey || lesson.hlsStatus !== "READY") {
    throw new AppError("HLS content is not ready yet", 404);
  }

  const { getConfigAndClient } = await import("../lib/s3");
  const { config, client } = await getConfigAndClient();

  const prefix = lesson.hlsManifestKey;

  // Fetch raw manifest
  const obj = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: `${prefix}/manifest.m3u8` }));
  if (!obj.Body) throw new AppError("Manifest not found in storage", 502);
  const chunks: Buffer[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream: NodeJS.ReadableStream = typeof (obj.Body as any).pipe === "function"
    ? obj.Body as unknown as NodeJS.ReadableStream
    : Readable.fromWeb(obj.Body as unknown as Parameters<typeof Readable.fromWeb>[0]);
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const rawManifest = Buffer.concat(chunks).toString("utf8");

  // Rewrite lines
  const keyUrl = `${env.PUBLIC_API_URL}/api/lessons/${lessonId}/hls-key?t=${encodeURIComponent(streamToken)}`;
  const lines = rawManifest.split("\n");
  const rewritten: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#EXT-X-KEY")) {
      // Replace the URI="..." attribute
      rewritten.push(line.replace(/URI="[^"]*"/, `URI="${keyUrl}"`));
    } else if (line.trim().endsWith(".ts")) {
      // Relative segment filename → presigned S3 URL
      const segKey = `${prefix}/${line.trim()}`;
      const presigned = await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: segKey }), { expiresIn: SEGMENT_TTL_SECONDS });
      rewritten.push(presigned);
    } else {
      rewritten.push(line);
    }
  }

  return rewritten.join("\n");
}

// ---------------------------------------------------------------------------
// Key serving
// ---------------------------------------------------------------------------

/** Returns the raw 16-byte AES-128 key for the lesson. Access must be validated before calling. */
export async function getLessonHlsKey(lessonId: string): Promise<Buffer> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { hlsEncryptionKey: true, hlsStatus: true } });
  if (!lesson?.hlsEncryptionKey || lesson.hlsStatus !== "READY") {
    throw new AppError("HLS key not available", 404);
  }
  return Buffer.from(lesson.hlsEncryptionKey, "base64");
}
