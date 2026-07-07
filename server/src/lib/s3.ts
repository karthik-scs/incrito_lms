import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * Every uploaded file lives in S3, never on local disk — never served from a permanent public URL.
 * Credentials are read from the `StorageSetting` DB row first (updatable via Admin > Settings >
 * Storage without a server restart), falling back to AWS_* env vars. The resolved config is cached
 * in-process for 60 seconds to avoid a DB round-trip on every S3 operation.
 */

type S3Config = { region: string; bucket: string; accessKeyId: string; secretKey: string };
let configCache: { config: S3Config; expiresAt: number; client: S3Client } | null = null;
const CONFIG_TTL_MS = 60_000;

export async function getConfigAndClient(): Promise<{ config: S3Config; client: S3Client }> {
  const now = Date.now();
  if (configCache && now < configCache.expiresAt) {
    return configCache;
  }

  // Lazy import to avoid a circular-dep at module-init time (storageSetting.service imports prisma
  // which imports the generated client — both are fine at request time, just not at boot).
  const { getActiveStorageConfig } = await import("../services/storage-setting.service");
  const config = await getActiveStorageConfig();

  if (!config) {
    throw new AppError(
      "AWS S3 is not configured — add your credentials in Admin → Settings → Storage.",
      500
    );
  }

  const client = new S3Client({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretKey },
    ...(config.endpointUrl ? { endpoint: config.endpointUrl, forcePathStyle: true } : {}),
  });
  configCache = { config, expiresAt: now + CONFIG_TTL_MS, client };
  return configCache;
}

/** Call this after saving new S3 credentials so the next operation picks them up immediately. */
export function invalidateS3Cache() {
  configCache = null;
}

/** Extracts the S3 key from a stored file URL (`${PUBLIC_API_URL}/api/files/<key>`). Returns null for external/non-S3 URLs. */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/api/files/";
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}

/** Consistent, collision-proof key naming per content type — mirrors the old local-disk folder layout. */
export function buildS3Key(folder: string, ownerId: string, originalExt: string) {
  return `${folder}/${ownerId}-${Date.now()}-${randomUUID()}${originalExt}`;
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  const { config, client } = await getConfigAndClient();
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

export async function deleteObject(key: string) {
  const { config, client } = await getConfigAndClient().catch(() => null as never);
  if (!config) return;
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })).catch(() => null);
}

/** Direct browser-to-S3 upload — used for large files (recordings) so they never pass through our server. */
export async function getPresignedPutUrl(key: string, contentType: string, expiresInSeconds = env.S3_SIGNED_URL_TTL_SECONDS) {
  const { config, client } = await getConfigAndClient();
  const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** Short-lived read access — the only way any protected file (recording/resource) is ever fetched. */
export async function getPresignedGetUrl(key: string, expiresInSeconds = env.S3_SIGNED_URL_TTL_SECONDS) {
  const { config, client } = await getConfigAndClient();
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Proxies an S3 object to an HTTP response, with full Range-request support (video seeking).
 * The caller must have already validated access — this function trusts the key is authorised.
 *
 * Returns { status, headers } so the controller can set them before piping the body.
 */
export async function proxyS3Stream(
  key: string,
  rangeHeader: string | undefined,
  res: import("express").Response,
): Promise<void> {
  const { config, client } = await getConfigAndClient();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ...(rangeHeader ? { Range: rangeHeader } : {}),
  });

  const s3Response = await client.send(command);
  const body = s3Response.Body;
  if (!body) throw new AppError("No content returned from storage", 502);

  const status = rangeHeader ? 206 : 200;
  res.status(status);
  if (s3Response.ContentType) res.setHeader("Content-Type", s3Response.ContentType);
  if (s3Response.ContentLength != null) res.setHeader("Content-Length", s3Response.ContentLength);
  if (s3Response.ContentRange) res.setHeader("Content-Range", s3Response.ContentRange);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  // The AWS SDK returns a web-api ReadableStream; convert to Node.js stream for piping.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (body as any).pipe === "function") {
    (body as unknown as NodeJS.ReadableStream).pipe(res);
  } else {
    const { Readable } = await import("node:stream");
    Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  }
}

export async function isS3Configured() {
  const { getActiveStorageConfig } = await import("../services/storage-setting.service");
  return Boolean(await getActiveStorageConfig().catch(() => null));
}
