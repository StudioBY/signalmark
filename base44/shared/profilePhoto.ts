/**
 * Profile photos must never be hotlinked from the LinkedIn CDN: those URLs are signed,
 * referrer-restricted and expire, so they break in the browser over time. At scrape time
 * the image is copied once into our own storage and only that URL is stored.
 */
export async function mirrorPhoto(base44, photoUrl) {
  if (!photoUrl) return '';
  if (!/^https?:\/\//i.test(photoUrl)) return '';
  // Already ours, nothing to copy.
  if (!/licdn\.com|linkedin\.com/i.test(photoUrl)) return photoUrl;

  try {
    const res = await fetch(photoUrl);
    if (!res.ok) return '';
    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return '';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const file = new File([bytes], `profile.${ext}`, { type });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return file_url || '';
  } catch (error) {
    console.error('mirrorPhoto failed', error);
    return '';
  }
}