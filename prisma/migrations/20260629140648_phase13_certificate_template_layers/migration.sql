-- AlterTable
ALTER TABLE "CertificateTemplate" ADD COLUMN     "layers" JSONB NOT NULL DEFAULT '[]';
