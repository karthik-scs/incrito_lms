-- Phase 22: StorageSetting (S3) + ZohoOrgSetting singleton tables (idempotent).

CREATE TABLE IF NOT EXISTS "StorageSetting" (
  "id"             TEXT         NOT NULL,
  "awsRegion"      TEXT,
  "awsBucket"      TEXT,
  "awsAccessKeyId" TEXT,
  "awsSecretKey"   TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ZohoOrgSetting" (
  "id"             TEXT         NOT NULL,
  "clientId"       TEXT,
  "clientSecret"   TEXT,
  "accountsDomain" TEXT         NOT NULL DEFAULT 'https://accounts.zoho.in',
  "apiDomain"      TEXT         NOT NULL DEFAULT 'https://meeting.zoho.in',
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZohoOrgSetting_pkey" PRIMARY KEY ("id")
);
