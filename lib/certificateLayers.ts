export type LayerType = "text" | "variable" | "image" | "qr";

export type VariableKey =
  | "studentName"
  | "courseTitle"
  | "cohortName"
  | "certificateNumber"
  | "issueDate"
  | "instructorName";

export type BgConfig = {
  fit: "cover" | "contain" | "fill";
  posX: number;
  posY: number;
};

export type CertificateLayer = {
  id: string;
  type: LayerType;
  /** Percentage of canvas width/height (0-100) — resolution-independent. */
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity?: number;
  // Text / Variable
  text?: string;
  variableKey?: VariableKey;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: "normal" | "bold";
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textTransform?: "none" | "uppercase" | "capitalize";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  // Image
  imageUrl?: string;
  flipH?: boolean;
  flipV?: boolean;
  objectFit?: "contain" | "cover" | "fill";
  objectPosX?: number;
  objectPosY?: number;
};

export const VARIABLE_LABELS: Record<VariableKey, string> = {
  studentName: "Student Name",
  courseTitle: "Course Title",
  cohortName: "Cohort Name",
  certificateNumber: "Certificate Number",
  issueDate: "Issue Date",
  instructorName: "Instructor Name",
};

export type CertificateVariables = Partial<Record<VariableKey, string>>;

export const SAMPLE_VARIABLES: CertificateVariables = {
  studentName: "Jordan Avery",
  courseTitle: "UI/UX Design Fundamentals",
  cohortName: "UX Batch A",
  certificateNumber: "CERT-2026-A1B2C3D4",
  issueDate: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  instructorName: "Priya Sharma",
};

export function resolveLayerText(layer: CertificateLayer, variables: CertificateVariables): string {
  if (layer.type === "text") return layer.text ?? "";
  if (layer.type === "variable" && layer.variableKey) return variables[layer.variableKey] ?? `{${layer.variableKey}}`;
  return "";
}

export function buildTextStyle(layer: CertificateLayer): React.CSSProperties {
  const parts: string[] = [];
  if (layer.underline) parts.push("underline");
  if (layer.strikethrough) parts.push("line-through");
  return {
    fontSize: layer.fontSize ?? 16,
    fontFamily: layer.fontFamily || "inherit",
    color: layer.color || "#1a1a1a",
    fontWeight: layer.fontWeight ?? "normal",
    fontStyle: layer.italic ? "italic" : "normal",
    textDecoration: parts.length ? parts.join(" ") : "none",
    textTransform: (layer.textTransform ?? "none") as React.CSSProperties["textTransform"],
    textAlign: (layer.align ?? "left") as React.CSSProperties["textAlign"],
    lineHeight: layer.lineHeight ?? 1.4,
    letterSpacing: layer.letterSpacing != null ? `${layer.letterSpacing}px` : undefined,
    whiteSpace: "nowrap",
    opacity: layer.opacity ?? 1,
  };
}

export function buildImageTransform(layer: CertificateLayer): string | undefined {
  const parts: string[] = [];
  if (layer.flipH) parts.push("scaleX(-1)");
  if (layer.flipV) parts.push("scaleY(-1)");
  return parts.length ? parts.join(" ") : undefined;
}

export function newLayerId() {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
