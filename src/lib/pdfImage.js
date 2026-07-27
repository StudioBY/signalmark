/**
 * Loads a remote profile photo and returns a grayscale PNG data URL for the PDF.
 * Best effort: any failure returns null and the PDF simply renders without a photo.
 */
export async function loadGrayscaleDataUrl(url, size = 96) {
  try {
    if (!url) return null;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Cover-crop to a square, matching the on-screen object-cover avatar.
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    );

    const data = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < data.data.length; i += 4) {
      const g =
        0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
      data.data[i] = data.data[i + 1] = data.data[i + 2] = g;
    }
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL("image/png");
  } catch (_e) {
    return null;
  }
}