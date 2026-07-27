import { LOGO_URL } from "@/lib/brand";

/**
 * Loads the SignalMark logo and returns a monochrome (dark ink on transparent) PNG data
 * URL rendered at 2x, since jsPDF cannot embed SVG. Best effort: any failure returns null
 * and the PDF simply renders without the logo.
 */
export async function loadLogoDataUrl(heightPt = 16, ink = [27, 36, 48]) {
  try {
    const res = await fetch(LOGO_URL, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());

    const ratio = bitmap.width / bitmap.height;
    const h = Math.round(heightPt * 2);
    const w = Math.round(h * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);

    // Keep the dark strokes as ink, drop the light background to transparent.
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = ink[0];
      px[i + 1] = ink[1];
      px[i + 2] = ink[2];
      px[i + 3] = Math.max(0, Math.min(255, Math.round(255 - lum)));
    }
    ctx.putImageData(data, 0, 0);

    return { dataUrl: canvas.toDataURL("image/png"), width: heightPt * ratio, height: heightPt };
  } catch (_e) {
    return null;
  }
}