"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import {
  type CertificateLayer,
  type CertificateVariables,
  type BgConfig,
  buildTextStyle,
  buildImageTransform,
  resolveLayerText,
} from "@/lib/certificateLayers";
import { getQrDataUrl } from "@/lib/certificateQr";

/** A4-landscape ratio — kept as the default so existing viewer/PDF code needs no changes. */
export const CANVAS_ASPECT_RATIO = 1.41;

function QrLayer({ verifyUrl }: { verifyUrl: string | null }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!verifyUrl) return;
    getQrDataUrl(verifyUrl).then(setDataUrl);
  }, [verifyUrl]);

  if (!verifyUrl) {
    return (
      <div className="w-full h-full bg-surface-secondary border border-dashed border-border rounded flex items-center justify-center text-text-muted">
        <QrCode size={20} />
      </div>
    );
  }
  if (!dataUrl) return <div className="w-full h-full bg-surface-secondary" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="Verification QR code" className="w-full h-full object-contain" />;
}

function LayerView({
  layer,
  variables,
  verifyUrl,
}: {
  layer: CertificateLayer;
  variables: CertificateVariables;
  verifyUrl: string | null;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.width != null ? `${layer.width}%` : undefined,
    height: layer.height != null ? `${layer.height}%` : undefined,
  };

  if (layer.type === "image" && layer.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={layer.imageUrl}
        alt=""
        style={{
          ...style,
          objectFit: layer.objectFit ?? "contain",
          objectPosition: `${layer.objectPosX ?? 50}% ${layer.objectPosY ?? 50}%`,
          transform: buildImageTransform(layer),
          opacity: layer.opacity ?? 1,
        }}
      />
    );
  }

  if (layer.type === "qr") {
    return (
      <div style={{ ...style, width: style.width ?? "15%", height: style.height ?? "15%" }}>
        <QrLayer verifyUrl={verifyUrl} />
      </div>
    );
  }

  if (layer.type === "text" || layer.type === "variable") {
    return (
      <div style={{ ...style, ...buildTextStyle(layer) }}>
        {resolveLayerText(layer, variables)}
      </div>
    );
  }

  return null;
}

export function CertificateCanvas({
  designUrl,
  layers,
  variables,
  verifyUrl,
  bgConfig,
  aspectRatio,
  className = "",
  canvasRef,
}: {
  designUrl: string | null;
  layers: CertificateLayer[];
  variables: CertificateVariables;
  verifyUrl?: string | null;
  bgConfig?: BgConfig | null;
  aspectRatio?: number;
  className?: string;
  canvasRef?: React.Ref<HTMLDivElement>;
}) {
  const ratio = aspectRatio ?? CANVAS_ASPECT_RATIO;
  const fit = bgConfig?.fit ?? "cover";
  const posX = bgConfig?.posX ?? 50;
  const posY = bgConfig?.posY ?? 50;

  return (
    <div
      ref={canvasRef}
      className={`relative w-full bg-white overflow-hidden ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {designUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={designUrl}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: fit, objectPosition: `${posX}% ${posY}%` }}
          draggable={false}
        />
      )}
      {layers.map((layer) => (
        <LayerView key={layer.id} layer={layer} variables={variables} verifyUrl={verifyUrl ?? null} />
      ))}
    </div>
  );
}
