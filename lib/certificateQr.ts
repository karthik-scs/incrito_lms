import QRCode from "qrcode";

const cache = new Map<string, string>();

/** Data-URL QR code for a verification URL — cached so the same certificate doesn't regenerate it on every re-render. */
export async function getQrDataUrl(verifyUrl: string): Promise<string> {
  const cached = cache.get(verifyUrl);
  if (cached) return cached;
  const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
  cache.set(verifyUrl, dataUrl);
  return dataUrl;
}
