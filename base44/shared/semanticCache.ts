/**
 * Hash-keyed cache for the semantic layer only.
 * Identical profile text + identical engine version => byte-identical semantic output,
 * so the two model-scored metrics become fully deterministic across runs.
 */

export async function semanticCacheKey(engineVersion, { headline, about, posts }) {
  const material = [engineVersion, headline || '', about || '', posts || ''].join('\u0000');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns a { get, set } cache bound to the SemanticCache entity, or null if unavailable. */
export function createSemanticCache(base44) {
  const store = base44.asServiceRole.entities.SemanticCache;

  return {
    async get(key) {
      const [row] = await store.filter({ cache_key: key }, '-created_date', 1);
      if (!row) return null;
      await store.update(row.id, { hits: (row.hits || 0) + 1 });
      return JSON.parse(row.payload);
    },
    async set(key, engineVersion, payload) {
      await store.create({
        cache_key: key,
        engine_version: engineVersion,
        payload: JSON.stringify(payload),
        hits: 0,
      });
    },
  };
}