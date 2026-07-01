import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

export async function createTag(data: { name: string; slug: string }) {
  const existing = await prisma.tag.findFirst({ where: { OR: [{ name: data.name }, { slug: data.slug }] } });
  if (existing) {
    throw new AppError("A tag with this name or slug already exists", 409);
  }
  return prisma.tag.create({ data });
}

export async function updateTag(id: string, data: { name?: string; slug?: string }) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new AppError("Tag not found", 404);
  }
  return prisma.tag.update({ where: { id }, data });
}

export async function deleteTag(id: string) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new AppError("Tag not found", 404);
  }
  await prisma.tag.delete({ where: { id } });
}
