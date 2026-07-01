import { prisma } from "../lib/prisma";
import { env } from "../config/env";

/** Lazy singleton — seeded from env vars on first creation if those vars are set. */
async function getOrCreate() {
  const existing = await prisma.storageSetting.findFirst();
  if (existing) return existing;
  return prisma.storageSetting.create({
    data: {
      awsRegion: env.AWS_REGION ?? null,
      awsBucket: env.AWS_S3_BUCKET ?? null,
      awsAccessKeyId: env.AWS_ACCESS_KEY_ID ?? null,
      awsSecretKey: env.AWS_SECRET_ACCESS_KEY ?? null,
    },
  });
}

export type StorageConfig = { region: string; bucket: string; accessKeyId: string; secretKey: string };

/** Returns the active S3 config — DB row takes precedence over env vars, env vars act as fallback. Returns null if not configured at all. */
export async function getActiveStorageConfig(): Promise<StorageConfig | null> {
  const row = await getOrCreate();
  const region = row.awsRegion ?? env.AWS_REGION;
  const bucket = row.awsBucket ?? env.AWS_S3_BUCKET;
  const accessKeyId = row.awsAccessKeyId ?? env.AWS_ACCESS_KEY_ID;
  const secretKey = row.awsSecretKey ?? env.AWS_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretKey) return null;
  return { region, bucket, accessKeyId, secretKey };
}

export async function getSettings() {
  const row = await getOrCreate();
  const { awsSecretKey, ...rest } = row;
  return { ...rest, awsSecretKeySet: Boolean(awsSecretKey) };
}

export async function updateSettings(data: Partial<{
  awsRegion: string; awsBucket: string; awsAccessKeyId: string; awsSecretKey: string;
}>) {
  const row = await getOrCreate();
  const updated = await prisma.storageSetting.update({ where: { id: row.id }, data });
  const { awsSecretKey, ...rest } = updated;
  return { ...rest, awsSecretKeySet: Boolean(awsSecretKey) };
}
