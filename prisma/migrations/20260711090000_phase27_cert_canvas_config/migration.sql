-- Phase 27: Certificate canvas layout + background config persistence
ALTER TABLE "CertificateTemplate" ADD COLUMN IF NOT EXISTS "canvasLayout" TEXT NOT NULL DEFAULT 'landscape';
ALTER TABLE "CertificateTemplate" ADD COLUMN IF NOT EXISTS "bgConfig" JSONB;
