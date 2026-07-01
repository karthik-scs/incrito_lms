import { z } from "zod";

export const certificateLayerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "variable", "image", "qr"]),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional(),
  opacity: z.number().min(0).max(1).optional(),
  // Text / Variable
  text: z.string().max(500).optional(),
  variableKey: z
    .enum(["studentName", "courseTitle", "cohortName", "certificateNumber", "issueDate", "instructorName"])
    .optional(),
  fontSize: z.number().int().positive().optional(),
  fontFamily: z.string().max(150).optional(),
  color: z.string().max(30).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  textTransform: z.enum(["none", "uppercase", "capitalize"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  lineHeight: z.number().min(0.5).max(5).optional(),
  letterSpacing: z.number().min(-10).max(50).optional(),
  // Image
  imageUrl: z.string().url().optional(),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
  objectFit: z.enum(["contain", "cover", "fill"]).optional(),
  objectPosX: z.number().min(0).max(100).optional(),
  objectPosY: z.number().min(0).max(100).optional(),
});

const bgConfigSchema = z.object({
  fit: z.enum(["cover", "contain", "fill"]),
  posX: z.number().min(0).max(100),
  posY: z.number().min(0).max(100),
});

export const createCertificateTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  designUrl: z.string().url().optional().nullable(),
  layers: z.array(certificateLayerSchema).optional(),
  canvasLayout: z.enum(["landscape", "portrait"]).optional(),
  bgConfig: bgConfigSchema.optional().nullable(),
});

export const updateCertificateTemplateSchema = createCertificateTemplateSchema.partial();
