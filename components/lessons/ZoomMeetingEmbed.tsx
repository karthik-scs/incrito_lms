"use client";

import { ExternalLink, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ZoomMeetingEmbed({ joinUrl, title }: { lessonId: string; joinUrl: string | null; title: string }) {
  return (
    <div className="rounded-2xl border border-border bg-overlay-dark overflow-hidden">
      <div className="aspect-video flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 text-error">
          <Radio size={28} className="animate-pulse" />
        </span>
        <p className="text-white font-medium">{title}</p>
        <Button onClick={() => joinUrl && window.open(joinUrl, "_blank")} disabled={!joinUrl}>
          <ExternalLink size={16} />
          Join Live Class
        </Button>
        <p className="text-xs text-white/50 max-w-sm">Opens in a new tab.</p>
      </div>
    </div>
  );
}
