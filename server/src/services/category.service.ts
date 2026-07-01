import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(data: { name: string; slug: string }) {
  const existing = await prisma.category.findFirst({ where: { OR: [{ name: data.name }, { slug: data.slug }] } });
  if (existing) {
    throw new AppError("A category with this name or slug already exists", 409);
  }
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, data: { name?: string; slug?: string }) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  await prisma.category.delete({ where: { id } });
}
