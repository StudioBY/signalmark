/**
 * Per-profile scrape cache. A profile scraped within the TTL is never re-scraped,
 * so re-scoring (e.g. after an engine update) costs no Apify credits.
 *
 * Storage has two forms, transparent to callers:
 *   inline  — the trimmed corpus JSON lives in `payload`
 *   file    — oversized corpora are uploaded and referenced by `payload_url`
 */

import { fitsInline, uploadText, readTextFromUrl } from './largeText.ts';

export const SCRAPE_TTL_DAYS = 7;

export function createScrapeCache(base44) {
  const store = base44.asServiceRole.entities.ScrapeCache;

  const findRow = (profileUrl) =>
    store.filter({ profile_url: profileUrl }, '-scraped_at', 1).then((rows) => rows[0] || null);

  async function readPayload(row) {
    if (row.payload) return JSON.parse(row.payload);
    if (row.payload_url) {
      const text = await readTextFromUrl(row.payload_url);
      return text ? JSON.parse(text) : null;
    }
    return null;
  }

  return {
    /**
     * Returns { extracted, scraped_at } if the cached scrape is younger than the TTL,
     * else null. `scraped_at` lets callers decide whether a stored report is still canonical.
     */
    async get(profileUrl) {
      const row = await findRow(profileUrl);
      if (!row) return null;
      const scrapedAt = row.scraped_at || row.created_date;
      const ageMs = Date.now() - new Date(scrapedAt).getTime();
      if (ageMs > SCRAPE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
      const extracted = await readPayload(row);
      if (!extracted) return null;
      await store.update(row.id, { hits: (row.hits || 0) + 1 });
      return { extracted, scraped_at: scrapedAt };
    },

    async set(profileUrl, extracted) {
      const json = JSON.stringify(extracted);
      const row = await findRow(profileUrl);

      const write = async (stored) => {
        const data = { profile_url: profileUrl, scraped_at: new Date().toISOString(), ...stored };
        if (row) await store.update(row.id, data);
        else await store.create({ ...data, hits: 0 });
      };

      const toFile = async () => write({
        payload: '',
        payload_url: await uploadText(base44, json, 'scrape.json'),
      });

      if (!fitsInline(json)) return toFile();
      // Inline first; fall back to file storage if the field still rejects the size.
      try {
        await write({ payload: json, payload_url: '' });
      } catch {
        await toFile();
      }
    },
  };
}