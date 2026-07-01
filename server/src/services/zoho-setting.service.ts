import { prisma } from "../lib/prisma";
import { env } from "../config/env";

async function getOrCreate() {
  const existing = await prisma.zohoOrgSetting.findFirst();
  if (existing) return existing;
  return prisma.zohoOrgSetting.create({
    data: {
      clientId: env.ZOHO_CLIENT_ID ?? null,
      clientSecret: env.ZOHO_CLIENT_SECRET ?? null,
      accountsDomain: env.ZOHO_ACCOUNTS_DOMAIN,
      apiDomain: env.ZOHO_API_DOMAIN,
    },
  });
}

export type ZohoOrgConfig = { clientId: string; clientSecret: string; accountsDomain: string; apiDomain: string };

/** Returns the active Zoho org config — DB row takes precedence over env vars. Returns null if not configured. */
export async function getActiveZohoConfig(): Promise<ZohoOrgConfig | null> {
  const row = await getOrCreate();
  const clientId = row.clientId ?? env.ZOHO_CLIENT_ID;
  const clientSecret = row.clientSecret ?? env.ZOHO_CLIENT_SECRET;
  const accountsDomain = row.accountsDomain;
  const apiDomain = row.apiDomain;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, accountsDomain, apiDomain };
}

export async function getSettings() {
  const row = await getOrCreate();
  const { clientSecret, ...rest } = row;
  return { ...rest, clientSecretSet: Boolean(clientSecret) };
}

export async function updateSettings(data: Partial<{
  clientId: string; clientSecret: string; accountsDomain: string; apiDomain: string;
}>) {
  const row = await getOrCreate();
  const updated = await prisma.zohoOrgSetting.update({ where: { id: row.id }, data });
  const { clientSecret, ...rest } = updated;
  return { ...rest, clientSecretSet: Boolean(clientSecret) };
}
