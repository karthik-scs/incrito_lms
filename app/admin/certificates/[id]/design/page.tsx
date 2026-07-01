"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, FlipHorizontal2, FlipVertical2,
  GripVertical, Image as ImageIcon, Italic, Layers as LayersIcon, Monitor, Pencil,
  QrCode, Settings2, Smartphone, Strikethrough, Trash2, Type, Underline, Upload, Variable, X,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { apiJson } from "@/lib/authClient";
import {
  type CertificateLayer,
  type BgConfig,
  type VariableKey,
  VARIABLE_LABELS,
  SAMPLE_VARIABLES,
  buildTextStyle,
  buildImageTransform,
  resolveLayerText,
  newLayerId,
} from "@/lib/certificateLayers";
import { getQrDataUrl } from "@/lib/certificateQr";

// ── Constants ──────────────────────────────────────────────────────────────────

const LANDSCAPE_RATIO = 1.41;
const PORTRAIT_RATIO = 1 / 1.41;
const UPLOADS_LS_KEY = "cert-design-uploads";
const DEFAULT_BG_CONFIG: BgConfig = { fit: "cover", posX: 50, posY: 50 };

const FONT_OPTIONS = [
  { value: "inherit", label: "Default" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Dancing Script', cursive", label: "Dancing Script (Signature)" },
  { value: "'Great Vibes', cursive", label: "Great Vibes (Signature)" },
  { value: "'Pacifico', cursive", label: "Pacifico" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

type Template = {
  id: string;
  title: string;
  designUrl: string | null;
  layers: CertificateLayer[];
  canvasLayout?: "landscape" | "portrait";
  bgConfig?: BgConfig | null;
};

// ── Uploads (localStorage) ─────────────────────────────────────────────────────

function useUploads() {
  const [uploads, setUploads] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(UPLOADS_LS_KEY);
      if (stored) setUploads(JSON.parse(stored));
    } catch {}
  }, []);

  function addUpload(url: string) {
    setUploads((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, 60);
      localStorage.setItem(UPLOADS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function removeUpload(url: string) {
    setUploads((prev) => {
      const next = prev.filter((u) => u !== url);
      localStorage.setItem(UPLOADS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { uploads, addUpload, removeUpload };
}

// ── Small UI helpers ───────────────────────────────────────────────────────────

function IconToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? "bg-accent text-white" : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PanelSection({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 pt-3 border-t border-border">{children}</div>;
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
    />
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</span>
        <span className="text-xs text-text-secondary tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

// ── Editable layer on canvas ───────────────────────────────────────────────────

function EditableLayer({
  layer,
  selected,
  onSelect,
  onDragStart,
}: {
  layer: CertificateLayer;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (layer.type === "qr") getQrDataUrl("https://example.com/certificates/verify/sample").then(setQrPreview);
  }, [layer.type]);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.width != null ? `${layer.width}%` : undefined,
    height: layer.height != null ? `${layer.height}%` : undefined,
    cursor: "move",
    outline: selected ? "2px solid var(--color-accent)" : "1px dashed rgba(0,0,0,0.18)",
    outlineOffset: 2,
  };

  return (
    <div
      style={baseStyle}
      onMouseDown={(e) => {
        onSelect();
        onDragStart(e);
      }}
    >
      {layer.type === "image" &&
        (layer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={layer.imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: layer.objectFit ?? "contain",
              objectPosition: `${layer.objectPosX ?? 50}% ${layer.objectPosY ?? 50}%`,
              transform: buildImageTransform(layer),
              opacity: layer.opacity ?? 1,
            }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-surface-secondary border border-dashed border-border-muted flex items-center justify-center text-text-muted">
            <ImageIcon size={18} />
          </div>
        ))}
      {layer.type === "qr" &&
        (qrPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrPreview} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />
        ) : (
          <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-text-muted">
            <QrCode size={18} />
          </div>
        ))}
      {(layer.type === "text" || layer.type === "variable") && (
        <div style={{ ...buildTextStyle(layer) }} className="pointer-events-none select-none">
          {resolveLayerText(layer, SAMPLE_VARIABLES)}
        </div>
      )}
    </div>
  );
}

// ── Layers panel ───────────────────────────────────────────────────────────────

function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
}: {
  layers: CertificateLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);

  const layerIcon = (l: CertificateLayer) =>
    l.type === "text" ? Type : l.type === "variable" ? Variable : l.type === "qr" ? QrCode : ImageIcon;

  const layerLabel = (l: CertificateLayer) => {
    if (l.type === "text") return `"${(l.text ?? "Text").slice(0, 20)}"`;
    if (l.type === "variable") return l.variableKey ? VARIABLE_LABELS[l.variableKey] : "Variable";
    if (l.type === "qr") return "QR Code";
    return "Image";
  };

  // Reversed: top visual layer shown first
  const displayed = [...layers].reverse();

  return (
    <div className="flex flex-col gap-0.5">
      {displayed.length === 0 && (
        <p className="text-xs text-text-muted py-4 text-center">No layers. Insert elements above.</p>
      )}
      {displayed.map((layer) => {
        const Icon = layerIcon(layer);
        const isSelected = layer.id === selectedId;
        const isDragTarget = dragOver === layer.id;
        return (
          <div
            key={layer.id}
            draggable
            onDragStart={() => {
              dragId.current = layer.id;
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(layer.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              setDragOver(null);
              if (dragId.current && dragId.current !== layer.id) {
                onReorder(dragId.current, layer.id);
              }
              dragId.current = null;
            }}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors ${
              isSelected ? "bg-accent-light text-accent" : "text-text-secondary hover:bg-surface-secondary"
            } ${isDragTarget ? "ring-1 ring-accent" : ""}`}
            onClick={() => onSelect(layer.id)}
          >
            <GripVertical size={11} className="shrink-0 text-text-muted cursor-grab" />
            <Icon size={12} className="shrink-0" />
            <span className="text-xs truncate flex-1">{layerLabel(layer)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(layer.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-opacity"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Properties panel ───────────────────────────────────────────────────────────

function TextProperties({
  layer,
  update,
}: {
  layer: CertificateLayer;
  update: (patch: Partial<CertificateLayer>) => void;
}) {
  return (
    <>
      {layer.type === "text" && (
        <PropRow label="Text content">
          <textarea
            value={layer.text ?? ""}
            onChange={(e) => update({ text: e.target.value })}
            rows={2}
            className="w-full bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </PropRow>
      )}
      {layer.type === "variable" && (
        <PropRow label="Variable">
          <Select
            value={layer.variableKey ?? ""}
            onChange={(v) => update({ variableKey: v as VariableKey })}
            options={Object.entries(VARIABLE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </PropRow>
      )}

      <PanelSection>
        <PropRow label="Font">
          <Select
            value={layer.fontFamily || "inherit"}
            onChange={(v) => update({ fontFamily: v })}
            options={FONT_OPTIONS}
          />
        </PropRow>

        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Size (px)">
            <NumInput value={layer.fontSize ?? 16} onChange={(v) => update({ fontSize: v })} min={6} className="w-full" />
          </PropRow>
          <PropRow label="Color">
            <input
              type="color"
              value={layer.color ?? "#1a1a1a"}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 rounded-md border border-border cursor-pointer bg-surface"
            />
          </PropRow>
        </div>

        {/* Style toggles */}
        <div className="flex items-center gap-1 flex-wrap">
          <IconToggle active={layer.fontWeight === "bold"} onClick={() => update({ fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })} title="Bold">
            <Bold size={13} />
          </IconToggle>
          <IconToggle active={!!layer.italic} onClick={() => update({ italic: !layer.italic })} title="Italic">
            <Italic size={13} />
          </IconToggle>
          <IconToggle active={!!layer.underline} onClick={() => update({ underline: !layer.underline })} title="Underline">
            <Underline size={13} />
          </IconToggle>
          <IconToggle active={!!layer.strikethrough} onClick={() => update({ strikethrough: !layer.strikethrough })} title="Strikethrough">
            <Strikethrough size={13} />
          </IconToggle>
          <div className="w-px h-4 bg-border mx-0.5" />
          <IconToggle
            active={layer.textTransform === "uppercase"}
            onClick={() => update({ textTransform: layer.textTransform === "uppercase" ? "none" : "uppercase" })}
            title="Uppercase"
          >
            <span className="text-[11px] font-bold leading-none">AA</span>
          </IconToggle>
          <IconToggle
            active={layer.textTransform === "capitalize"}
            onClick={() => update({ textTransform: layer.textTransform === "capitalize" ? "none" : "capitalize" })}
            title="Capitalize first letter"
          >
            <span className="text-[11px] font-bold leading-none">Aa</span>
          </IconToggle>
          <div className="w-px h-4 bg-border mx-0.5" />
          <IconToggle active={layer.align === "left" || !layer.align} onClick={() => update({ align: "left" })} title="Align left">
            <AlignLeft size={13} />
          </IconToggle>
          <IconToggle active={layer.align === "center"} onClick={() => update({ align: "center" })} title="Align center">
            <AlignCenter size={13} />
          </IconToggle>
          <IconToggle active={layer.align === "right"} onClick={() => update({ align: "right" })} title="Align right">
            <AlignRight size={13} />
          </IconToggle>
        </div>
      </PanelSection>

      <PanelSection>
        <SliderRow
          label="Line Spacing"
          value={layer.lineHeight ?? 1.4}
          min={0.8}
          max={3}
          step={0.1}
          display={(layer.lineHeight ?? 1.4).toFixed(1)}
          onChange={(v) => update({ lineHeight: v })}
        />
        <SliderRow
          label="Letter Spacing"
          value={layer.letterSpacing ?? 0}
          min={-5}
          max={20}
          step={0.5}
          display={`${(layer.letterSpacing ?? 0).toFixed(1)}px`}
          onChange={(v) => update({ letterSpacing: v })}
        />
        <SliderRow
          label="Opacity"
          value={Math.round((layer.opacity ?? 1) * 100)}
          min={10}
          max={100}
          step={5}
          display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
          onChange={(v) => update({ opacity: v / 100 })}
        />
      </PanelSection>
    </>
  );
}

function ImageProperties({
  layer,
  update,
  onImageUploaded,
}: {
  layer: CertificateLayer;
  update: (patch: Partial<CertificateLayer>) => void;
  onImageUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiJson<{ url: string }>("/api/uploads/certificate-design", { method: "POST", body: formData });
    setUploading(false);
    if (result.ok) {
      update({ imageUrl: result.data.url });
      onImageUploaded(result.data.url);
    }
    if (e.target) e.target.value = "";
  }

  return (
    <>
      <PropRow label="Image">
        <div className="flex items-center gap-2">
          {layer.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={layer.imageUrl} alt="" className="w-12 h-12 rounded-md object-cover border border-border shrink-0" />
          )}
          <div className="flex flex-col gap-1">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} className="hidden" />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-2.5 py-1 bg-surface-secondary border border-border rounded-md text-text-primary hover:bg-surface transition-colors"
            >
              {uploading ? "Uploading…" : layer.imageUrl ? "Replace" : "Upload"}
            </button>
          </div>
        </div>
      </PropRow>

      <PanelSection>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Width %">
            <NumInput value={layer.width ?? 20} onChange={(v) => update({ width: v })} min={1} max={100} className="w-full" />
          </PropRow>
          <PropRow label="Height %">
            <NumInput value={layer.height ?? 20} onChange={(v) => update({ height: v })} min={1} max={100} className="w-full" />
          </PropRow>
        </div>

        <PropRow label="Fit">
          <div className="flex gap-1">
            {(["contain", "cover", "fill"] as const).map((fit) => (
              <button
                key={fit}
                onClick={() => update({ objectFit: fit })}
                className={`flex-1 py-1 text-[10px] rounded-md border transition-colors capitalize ${
                  (layer.objectFit ?? "contain") === fit
                    ? "bg-accent text-white border-accent"
                    : "border-border text-text-secondary hover:bg-surface-secondary"
                }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </PropRow>

        {(layer.objectFit === "cover") && (
          <>
            <SliderRow
              label="Crop X"
              value={layer.objectPosX ?? 50}
              min={0}
              max={100}
              step={1}
              display={`${layer.objectPosX ?? 50}%`}
              onChange={(v) => update({ objectPosX: v })}
            />
            <SliderRow
              label="Crop Y"
              value={layer.objectPosY ?? 50}
              min={0}
              max={100}
              step={1}
              display={`${layer.objectPosY ?? 50}%`}
              onChange={(v) => update({ objectPosY: v })}
            />
          </>
        )}

        <PropRow label="Flip">
          <div className="flex gap-2">
            <IconToggle active={!!layer.flipH} onClick={() => update({ flipH: !layer.flipH })} title="Flip horizontal">
              <FlipHorizontal2 size={14} />
            </IconToggle>
            <IconToggle active={!!layer.flipV} onClick={() => update({ flipV: !layer.flipV })} title="Flip vertical">
              <FlipVertical2 size={14} />
            </IconToggle>
          </div>
        </PropRow>

        <SliderRow
          label="Opacity"
          value={Math.round((layer.opacity ?? 1) * 100)}
          min={10}
          max={100}
          step={5}
          display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
          onChange={(v) => update({ opacity: v / 100 })}
        />
      </PanelSection>
    </>
  );
}

function PropertiesPanel({
  layer,
  update,
  onDelete,
  bgConfig,
  onBgConfigChange,
  onImageUploaded,
}: {
  layer: CertificateLayer | null;
  update: (patch: Partial<CertificateLayer>) => void;
  onDelete: () => void;
  bgConfig: BgConfig;
  onBgConfigChange: (c: BgConfig) => void;
  onImageUploaded: (url: string) => void;
}) {
  if (!layer) {
    // Show background settings when nothing selected
    return (
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Background Settings</p>
        <PropRow label="Fit">
          <div className="flex gap-1">
            {(["cover", "contain", "fill"] as const).map((fit) => (
              <button
                key={fit}
                onClick={() => onBgConfigChange({ ...bgConfig, fit })}
                className={`flex-1 py-1 text-[10px] rounded-md border transition-colors capitalize ${
                  bgConfig.fit === fit ? "bg-accent text-white border-accent" : "border-border text-text-secondary hover:bg-surface-secondary"
                }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </PropRow>
        <SliderRow
          label="Position X"
          value={bgConfig.posX}
          min={0}
          max={100}
          step={1}
          display={`${bgConfig.posX}%`}
          onChange={(v) => onBgConfigChange({ ...bgConfig, posX: v })}
        />
        <SliderRow
          label="Position Y"
          value={bgConfig.posY}
          min={0}
          max={100}
          step={1}
          display={`${bgConfig.posY}%`}
          onChange={(v) => onBgConfigChange({ ...bgConfig, posY: v })}
        />
        <p className="text-xs text-text-muted mt-2">Click a layer on the canvas or in the Layers tab to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary capitalize">{layer.type} Layer</span>
        <button onClick={onDelete} className="text-text-muted hover:text-error transition-colors" title="Delete layer">
          <Trash2 size={14} />
        </button>
      </div>

      {(layer.type === "text" || layer.type === "variable") && (
        <TextProperties layer={layer} update={update} />
      )}

      {layer.type === "image" && (
        <ImageProperties layer={layer} update={update} onImageUploaded={onImageUploaded} />
      )}

      {layer.type === "qr" && (
        <PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <PropRow label="Width %">
              <NumInput value={layer.width ?? 14} onChange={(v) => update({ width: v })} min={4} max={40} className="w-full" />
            </PropRow>
            <PropRow label="Height %">
              <NumInput value={layer.height ?? 14} onChange={(v) => update({ height: v })} min={4} max={40} className="w-full" />
            </PropRow>
          </div>
        </PanelSection>
      )}

      {/* Position — all layer types */}
      <PanelSection>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="X %">
            <NumInput value={Math.round(layer.x * 10) / 10} onChange={(v) => update({ x: v })} min={0} max={99} step={0.5} className="w-full" />
          </PropRow>
          <PropRow label="Y %">
            <NumInput value={Math.round(layer.y * 10) / 10} onChange={(v) => update({ y: v })} min={0} max={99} step={0.5} className="w-full" />
          </PropRow>
        </div>
      </PanelSection>
    </div>
  );
}

// ── Uploads panel ──────────────────────────────────────────────────────────────

function UploadsPanel({
  uploads,
  onRemove,
  onUse,
}: {
  uploads: string[];
  onRemove: (url: string) => void;
  onUse: (url: string) => void;
}) {
  if (uploads.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs text-text-muted text-center py-6">
          No uploaded images yet. Upload an image layer or background to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="text-[10px] text-text-muted mb-2">Click an image to add it as a layer. Images are reusable across designs.</p>
      <div className="grid grid-cols-2 gap-2">
        {uploads.map((url) => (
          <div key={url} className="group relative rounded-lg overflow-hidden border border-border bg-surface-secondary aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onUse(url)}
              onError={(e) => (e.currentTarget.parentElement!.style.display = "none")}
            />
            <button
              onClick={() => onRemove(url)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove from gallery"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CertificateDesignerPage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [layers, setLayers] = useState<CertificateLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasLayout, setCanvasLayout] = useState<"landscape" | "portrait">("landscape");
  const [bgConfig, setBgConfig] = useState<BgConfig>(DEFAULT_BG_CONFIG);
  const [bgSettingsOpen, setBgSettingsOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"layers" | "properties" | "uploads">("layers");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ id: string; offsetXPct: number; offsetYPct: number } | null>(null);
  const { uploads, addUpload, removeUpload } = useUploads();

  // Load Google Fonts for designer preview
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;600;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  async function load() {
    setLoading(true);
    const result = await apiJson<Template>(`/api/certificate-templates/${params.id}`);
    if (result.ok) {
      setTemplate(result.data);
      setLayers(result.data.layers ?? []);
      if (result.data.canvasLayout) setCanvasLayout(result.data.canvasLayout);
      if (result.data.bgConfig) setBgConfig(result.data.bgConfig);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  function updateLayer(id: string, patch: Partial<CertificateLayer>) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLayer(layer: CertificateLayer) {
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
    setRightTab("properties");
  }

  function addText() {
    addLayer({ id: newLayerId(), type: "text", x: 30, y: 30, text: "New text", fontSize: 18, color: "#1a1a1a" });
  }

  function addVariable(key: VariableKey) {
    addLayer({ id: newLayerId(), type: "variable", x: 30, y: 40, variableKey: key, fontSize: 20, color: "#1a1a1a" });
  }

  function addQr() {
    if (layers.some((l) => l.type === "qr")) return;
    addLayer({ id: newLayerId(), type: "qr", x: 80, y: 75, width: 14, height: 14 });
  }

  function addImageLayer(url?: string) {
    addLayer({ id: newLayerId(), type: "image", x: 35, y: 35, width: 20, height: 20, imageUrl: url });
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function reorderLayers(draggedId: string, targetId: string) {
    setLayers((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((l) => l.id === draggedId);
      const toIdx = arr.findIndex((l) => l.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }

  function handleCanvasDragStart(layer: CertificateLayer, e: React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    dragState.current = { id: layer.id, offsetXPct: px - layer.x, offsetYPct: py - layer.y };

    function onMove(ev: MouseEvent) {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r || !dragState.current) return;
      const x = ((ev.clientX - r.left) / r.width) * 100 - dragState.current.offsetXPct;
      const y = ((ev.clientY - r.top) / r.height) * 100 - dragState.current.offsetYPct;
      updateLayer(dragState.current.id, {
        x: Math.min(98, Math.max(0, x)),
        y: Math.min(98, Math.max(0, y)),
      });
    }
    function onUp() {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function handleBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await apiJson<{ url: string }>("/api/uploads/certificate-design", { method: "POST", body: fd });
    setBgUploading(false);
    if (result.ok) {
      setTemplate((prev) => (prev ? { ...prev, designUrl: result.data.url } : prev));
      addUpload(result.data.url);
    }
    if (e.target) e.target.value = "";
  }

  async function handleSave() {
    if (!template) return;
    setSaving(true);
    setError(null);
    const result = await apiJson(`/api/certificate-templates/${template.id}`, {
      method: "PATCH",
      body: JSON.stringify({ layers, designUrl: template.designUrl, canvasLayout, bgConfig }),
    });
    setSaving(false);
    if (!result.ok) setError(result.message);
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-text-secondary">Loading…</p>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <p className="text-sm text-error">{error ?? "Template not found"}</p>
      </AdminLayout>
    );
  }

  const aspectRatio = canvasLayout === "portrait" ? PORTRAIT_RATIO : LANDSCAPE_RATIO;

  return (
    <AdminLayout>
      {/* ── Back + title ───────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/certificates" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary shrink-0">
          <ArrowLeft size={14} />
          Back
        </Link>
        <h1 className="text-lg font-semibold text-text-primary truncate">{template.title}</h1>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap mb-4 shadow-sm">
        {/* Insert */}
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide px-1">Insert</span>
        <div className="h-5 w-px bg-border" />
        <button onClick={addText} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-secondary transition-colors">
          <Type size={13} /> Text
        </button>
        <button onClick={() => addImageLayer()} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-secondary transition-colors">
          <ImageIcon size={13} /> Image
        </button>
        <button
          onClick={addQr}
          disabled={layers.some((l) => l.type === "qr")}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-secondary disabled:opacity-40 transition-colors"
        >
          <QrCode size={13} /> QR
        </button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          <Variable size={13} className="text-text-muted shrink-0" />
          <select
            value=""
            onChange={(e) => e.target.value && addVariable(e.target.value as VariableKey)}
            className="bg-transparent text-xs text-text-secondary focus:outline-none cursor-pointer"
          >
            <option value="">Variable…</option>
            {Object.entries(VARIABLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Layout toggle */}
        <div className="flex items-center gap-0.5 bg-surface-secondary border border-border rounded-lg p-0.5">
          <button
            onClick={() => setCanvasLayout("landscape")}
            title="Landscape"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${canvasLayout === "landscape" ? "bg-surface shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <Monitor size={13} /> Landscape
          </button>
          <button
            onClick={() => setCanvasLayout("portrait")}
            title="Portrait"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${canvasLayout === "portrait" ? "bg-surface shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <Smartphone size={13} /> Portrait
          </button>
        </div>

        {/* Background control */}
        <div className="relative flex items-center gap-1.5 bg-surface-secondary border border-border rounded-lg px-2 py-1.5">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">BG</span>
          {template.designUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.designUrl} alt="" className="w-6 h-4 object-cover rounded" />
              <label className="cursor-pointer text-text-muted hover:text-accent transition-colors" title="Change background">
                <Pencil size={12} />
                <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBgFile} className="hidden" />
              </label>
              <button
                onClick={() => setBgSettingsOpen((o) => !o)}
                className={`text-text-muted hover:text-accent transition-colors ${bgSettingsOpen ? "text-accent" : ""}`}
                title="Background settings"
              >
                <Settings2 size={12} />
              </button>
              <button
                onClick={() => setTemplate((prev) => (prev ? { ...prev, designUrl: null } : prev))}
                className="text-text-muted hover:text-error transition-colors"
                title="Remove background"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <label className="cursor-pointer flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors">
              {bgUploading ? "Uploading…" : <><Upload size={12} /> Add Background</>}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBgFile} disabled={bgUploading} className="hidden" />
            </label>
          )}

          {/* BG settings popover */}
          {bgSettingsOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Background Fit & Position</span>
                <button onClick={() => setBgSettingsOpen(false)} className="text-text-muted hover:text-text-primary"><X size={12} /></button>
              </div>
              <PropRow label="Fit">
                <div className="flex gap-1">
                  {(["cover", "contain", "fill"] as const).map((fit) => (
                    <button
                      key={fit}
                      onClick={() => setBgConfig((c) => ({ ...c, fit }))}
                      className={`flex-1 py-1 text-[10px] rounded-md border capitalize transition-colors ${bgConfig.fit === fit ? "bg-accent text-white border-accent" : "border-border text-text-secondary hover:bg-surface-secondary"}`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </PropRow>
              <SliderRow
                label="Position X"
                value={bgConfig.posX}
                min={0}
                max={100}
                step={1}
                display={`${bgConfig.posX}%`}
                onChange={(v) => setBgConfig((c) => ({ ...c, posX: v }))}
              />
              <SliderRow
                label="Position Y"
                value={bgConfig.posY}
                min={0}
                max={100}
                step={1}
                display={`${bgConfig.posY}%`}
                onChange={(v) => setBgConfig((c) => ({ ...c, posY: v }))}
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs">
          {saving ? "Saving…" : "Save Design"}
        </Button>
      </div>

      {error && <p className="mb-3 text-xs text-error">{error}</p>}

      {/* ── Main area ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Canvas */}
        <div
          className="bg-surface-secondary border border-border rounded-2xl flex items-center justify-center p-6 min-h-64"
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            className="relative bg-white border border-border rounded-xl overflow-hidden shadow-md w-full max-w-3xl"
            style={{ aspectRatio }}
            onMouseDown={(e) => {
              // Only clear selection if clicking canvas background, not a layer
              if (e.target === canvasRef.current) setSelectedId(null);
            }}
          >
            {template.designUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.designUrl}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: bgConfig.fit, objectPosition: `${bgConfig.posX}% ${bgConfig.posY}%` }}
                draggable={false}
              />
            )}
            {layers.map((layer) => (
              <EditableLayer
                key={layer.id}
                layer={layer}
                selected={layer.id === selectedId}
                onSelect={() => {
                  setSelectedId(layer.id);
                  setRightTab("properties");
                }}
                onDragStart={(e) => handleCanvasDragStart(layer, e)}
              />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {([
              { key: "layers", label: "Layers", Icon: LayersIcon },
              { key: "properties", label: "Properties", Icon: Settings2 },
              { key: "uploads", label: "Uploads", Icon: Upload },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setRightTab(key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  rightTab === key ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="overflow-y-auto flex-1 max-h-[calc(100vh-320px)]">
            {rightTab === "layers" && (
              <div className="p-2">
                <LayersPanel
                  layers={layers}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setRightTab("properties");
                  }}
                  onReorder={reorderLayers}
                  onDelete={removeLayer}
                />
              </div>
            )}

            {rightTab === "properties" && (
              <PropertiesPanel
                layer={selected}
                update={(patch) => selected && updateLayer(selected.id, patch)}
                onDelete={() => selected && removeLayer(selected.id)}
                bgConfig={bgConfig}
                onBgConfigChange={setBgConfig}
                onImageUploaded={addUpload}
              />
            )}

            {rightTab === "uploads" && (
              <UploadsPanel
                uploads={uploads}
                onRemove={removeUpload}
                onUse={(url) => {
                  addImageLayer(url);
                  addUpload(url);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
