import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import type { Prisma } from "../../../app/generated/prisma/client";

export function listCertificateTemplates() {
  return prisma.certificateTemplate.findMany({ orderBy: { title: "asc" } });
}

export async function getCertificateTemplate(id: string) {
  const template = await prisma.certificateTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new AppError("Certificate template not found", 404);
  }
  return template;
}

type CertificateTemplateInput = {
  title: string;
  description?: string;
  designUrl?: string | null;
  layers?: Prisma.InputJsonValue;
  canvasLayout?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bgConfig?: any;
};

export async function createCertificateTemplate(data: CertificateTemplateInput) {
  return prisma.certificateTemplate.create({ data });
}

export async function updateCertificateTemplate(id: string, data: Partial<CertificateTemplateInput>) {
  await getCertificateTemplate(id);
  return prisma.certificateTemplate.update({ where: { id }, data });
}

export async function deleteCertificateTemplate(id: string) {
  await getCertificateTemplate(id);
  await prisma.certificateTemplate.delete({ where: { id } });
}
