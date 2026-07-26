/**
 * Typographic rule: no em dashes (or the em-dash-as-separator forms) in any
 * user-facing text. Regular hyphens inside compound words are preserved.
 */
export function stripEmDashes(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    // " word — word " used as a parenthetical / separator -> comma
    .replace(/\s*[—–]\s*/g, ', ')
    // "--" typed as an em dash substitute
    .replace(/\s*--\s*/g, ', ')
    // tidy up artifacts
    .replace(/,\s*([,.;:!?)])/g, '$1')
    .replace(/([(:;])\s*,\s*/g, '$1 ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Recursively applies stripEmDashes to every string in a value. */
export function stripEmDashesDeep(value) {
  if (typeof value === 'string') return stripEmDashes(value);
  if (Array.isArray(value)) return value.map(stripEmDashesDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripEmDashesDeep(v)]));
  }
  return value;
}