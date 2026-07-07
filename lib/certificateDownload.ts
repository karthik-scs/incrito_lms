const BLANK_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=";

async function toDataUrl(src: string): Promise<string> {
  const res = await fetch(src, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Fetch ${res.status}`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clones an element off-screen, converts every external <img> src to a data
 * URL so html2canvas sees no cross-origin images (no taint, no CORS block).
 * Images that cannot be fetched are replaced with a blank 1×1 PNG so they
 * don't taint the canvas and don't throw "wrong PNG signature".
 */
export async function buildOffscreenCanvas(source: HTMLElement): Promise<HTMLElement> {
  const w = source.offsetWidth || 800;
  const h = source.offsetHeight || Math.round(w / 1.41);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    `width:${w}px`,
    `height:${h}px`,
    "pointer-events:none",
    "overflow:hidden",
  ].join(";");
  document.body.appendChild(clone);

  const imgs = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
  await Promise.allSettled(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      try {
        img.src = await toDataUrl(src);
      } catch {
        // Replace with blank PNG so html2canvas doesn't see a cross-origin URL
        img.src = BLANK_PNG;
      }
      img.removeAttribute("crossorigin");
      img.removeAttribute("crossOrigin");
    }),
  );

  // Let the browser paint the clone with updated srcs before html2canvas reads it
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  return clone;
}

export async function downloadAsPdf(source: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const offscreen = await buildOffscreenCanvas(source);
  try {
    // All images are now data: URLs — no cross-origin risk, disable allowTaint to catch leaks early
    const canvas = await html2canvas(offscreen, {
      scale: 2,
      useCORS: false,
      allowTaint: false,
      logging: false,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("Certificate rendered as an empty image. Please try again.");
    }

    const imageData = canvas.toDataURL("image/png");
    if (!imageData || imageData === "data:,") {
      throw new Error("Could not capture certificate image. Please try again.");
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imageData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(fileName);
  } finally {
    document.body.removeChild(offscreen);
  }
}
