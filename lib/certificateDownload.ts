/**
 * Fetches a URL and returns it as a base64 data URL.
 * Used to pre-convert cross-origin S3 image URLs before html2canvas rendering
 * so the canvas is never tainted and toDataURL() succeeds.
 */
async function toDataUrl(src: string): Promise<string> {
  const res = await fetch(src, { mode: "cors", cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clones an element off-screen, replaces every <img> src that points to an
 * external origin with a data URL fetched via CORS, then returns the clone
 * (already appended to document.body). Caller must remove it after use.
 */
export async function buildOffscreenCanvas(source: HTMLElement): Promise<HTMLElement> {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${source.offsetWidth}px;pointer-events:none;`;
  document.body.appendChild(clone);

  const imgs = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
  await Promise.allSettled(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith("data:") || img.src.startsWith("blob:")) return;
      try {
        img.src = await toDataUrl(img.src);
      } catch {
        // If fetch fails leave src as-is; html2canvas may still handle it
      }
    }),
  );

  return clone;
}

/**
 * Renders a DOM element to a PDF and triggers browser download.
 * Automatically patches cross-origin images to avoid the tainted-canvas error.
 */
export async function downloadAsPdf(source: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const offscreen = await buildOffscreenCanvas(source);
  try {
    const canvas = await html2canvas(offscreen, { scale: 2, useCORS: false, allowTaint: false });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  } finally {
    document.body.removeChild(offscreen);
  }
}
