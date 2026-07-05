import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { getPresignedGetUrl } from "../lib/s3";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const RESOURCE_STAFF_ROLES = ["Admin", "Mentor", "Cohort Manager"];

/**
 * Fetches a PDF resource from S3, stamps a diagonal "incrito · name · mobile"
 * watermark on every page, and returns the watermarked PDF bytes.
 *
 * Access control mirrors getResourceSignedUrl: staff bypass enrollment checks;
 * students must be enrolled in the cohort and have the right plan.
 */
export async function getWatermarkedPdf(resourceId: string, userId: string): Promise<Buffer> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!resource) throw new AppError("Resource not found", 404);
  if (resource.fileType !== "PDF") throw new AppError("This resource is not a PDF", 422);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const isStaff = RESOURCE_STAFF_ROLES.includes(user.role.name);

  if (!isStaff) {
    const { lesson } = resource;
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohort: { courseId: lesson.module.courseId } },
    });
    if (!enrollment) throw new AppError("You don't have access to this resource", 403);

    const isLockedFor = (planAccess: string) => planAccess !== "BOTH" && planAccess !== enrollment.plan;
    if (isLockedFor(lesson.module.planAccess) || isLockedFor(lesson.planAccess)) {
      throw new AppError("This resource is part of the Intensive Pro plan", 403);
    }
  }

  // Extract S3 key from stored URL and get a short-lived signed URL
  const key = resource.fileUrl.split("/api/files/")[1];
  if (!key) throw new AppError("Resource file is not stored on S3", 422);

  const signedUrl = await getPresignedGetUrl(key, 60);
  const pdfRes = await fetch(signedUrl);
  if (!pdfRes.ok) throw new AppError("Could not retrieve resource file", 502);
  const pdfBytes = await pdfRes.arrayBuffer();

  // Stamp watermark on every page
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const contact = user.mobileNumber ?? user.email;
  const watermarkText = `incrito  ·  ${user.firstName} ${user.lastName}  ·  ${contact}`;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.028;
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

    // Draw watermark diagonally across the centre of the page
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.25,
      rotate: degrees(35),
    });
  }

  const watermarkedBytes = await pdfDoc.save();
  return Buffer.from(watermarkedBytes);
}
