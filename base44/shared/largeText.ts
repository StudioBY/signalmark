/**
 * Entity string fields have a size cap. Anything above INLINE_LIMIT_BYTES is written to
 * file storage instead and referenced by URL.
 */

export const INLINE_LIMIT_BYTES = 20_000;

export function fitsInline(text) {
  return (text || '').length <= INLINE_LIMIT_BYTES;
}

/** Uploads text as a file and returns its URL. */
export async function uploadText(base44, text, filename = 'corpus.json', type = 'application/json') {
  const file = new File([text], filename, { type });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return file_url;
}

/** Reads text back from a stored file URL. */
export async function readTextFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.text();
}