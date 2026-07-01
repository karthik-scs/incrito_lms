"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CertificateCanvas } from "./CertificateCanvas";
import type { CertificateLayer, CertificateVariables } from "@/lib/certificateLayers";

export function CertificateViewModal({
  open,
  onClose,
  title,
  designUrl,
  layers,
  variables,
  verifyUrl,
  fileName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  designUrl: string | null;
  layers: CertificateLayer[];
  variables: CertificateVariables;
  verifyUrl: string;
  fileName: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!canvasRef.current) return;
    setDownloading(true);
    setError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true });
      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-3xl">
      <CertificateCanvas
        canvasRef={canvasRef}
        designUrl={designUrl}
        layers={layers}
        variables={variables}
        verifyUrl={verifyUrl}
        className="border border-border rounded-lg"
      />
      {error && <p className="text-sm text-error mt-3">{error}</p>}
      <div className="flex justify-end mt-4">
        <Button onClick={handleDownload} disabled={downloading}>
          <Download size={16} />
          {downloading ? "Preparing PDF…" : "Download Certificate"}
        </Button>
      </div>
    </Modal>
  );
}
