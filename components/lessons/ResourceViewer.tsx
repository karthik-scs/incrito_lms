"use client";

import { Modal } from "@/components/ui/Modal";

type Resource = { title: string; fileUrl: string; fileType: string };

export function ResourceViewer({ resource, open, onClose }: { resource: Resource | null; open: boolean; onClose: () => void }) {
  if (!resource) return null;

  return (
    <Modal open={open} onClose={onClose} title={resource.title} maxWidth="max-w-3xl">
      <div className="aspect-video rounded-lg overflow-hidden bg-overlay-dark">
        {resource.fileType === "IMAGE" && (
          <img src={resource.fileUrl} alt={resource.title} className="w-full h-full object-contain bg-surface-secondary" />
        )}
        {resource.fileType === "VIDEO" && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video controls controlsList="nodownload" className="w-full h-full bg-black" src={resource.fileUrl}>
            Your browser doesn't support embedded video.
          </video>
        )}
        {(resource.fileType === "PDF" || resource.fileType === "DOCX" || resource.fileType === "EXCEL") && (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(resource.fileUrl)}&embedded=true`}
            title={resource.title}
            className="w-full h-full border-0"
          />
        )}
      </div>
      <p className="text-xs text-text-muted mt-2">
        Viewed in-app — this player doesn't offer a download link for this resource.
      </p>
    </Modal>
  );
}
