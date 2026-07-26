/**
 * Per-profile scrape cache. A profile scraped within the TTL is never re-scraped,
 * so re-scoring (e.g. after an engine update) costs no Apify credits.
 */

export const SCRAPE_TTL_DAYS = 7;

export function createScrapeCache(base44) {
  const store = base44.asServiceRole.entities.ScrapeCache;

  return {
    /** Returns the cached extraction if it is younger than the TTL, else null. */
    async get(profileUrl) {
      const [row] = await store.filter({ profile_url: profileUrl }, '-scraped_at', 1);
      if (!row) return null;
      const ageMs = Date.now() - new Date(row.scraped_at || row.created_date).getTime();
      if (ageMs > SCRAPE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
      await store.update(row.id, { hits: (row.hits || 0) + 1 });
      return JSON.parse(row.payload);
    },

    async set(profileUrl, extracted) {
      const [row] = await store.filter({ profile_url: profileUrl }, '-scraped_at', 1);
      const data = {
        profile_url: profileUrl,
        scraped_at: new Date().toISOString(),
        payload: JSON.stringify(extracted),
      };
      if (row) await store.update(row.id, data);
      else await store.create({ ...data, hits: 0 });
    },
  };
}