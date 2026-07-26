/**
 * Display-time guard for the no-em-dash typographic rule. Generated text is already
 * sanitized when it is produced; this also covers records analyzed before the rule
 * existed, and anything rendered into the PDF.
 */
export function stripEmDashes(text) {
  if (typeof text !== "string" || !text) return text;
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s*--\s*/g, ", ")
    .replace(/,\s*([,.;:!?)])/g, "$1")
    .replace(/([(:;])\s*,\s*/g, "$1 ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}