import { fetchProfileText, normalizeProfileUrl } from './apifyLinkedin.ts';
import { createScrapeCache } from './scrapeCache.ts';
import { fitsInline, uploadText } from './largeText.ts';
import { runEngine, ENGINE_VERSION } from './linguisticEngine.ts';
import { createSemanticCache } from './semanticCache.ts';
import { mirrorPhoto } from './profilePhoto.ts';

export { ENGINE_VERSION, normalizeProfileUrl };

export class AnalysisError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * The full analysis pipeline, unchanged: scrape cache -> stored report -> engine.
 * Shared by the admin route and the paid route so neither can drift from the other.
 */
export async function runAnalysis(base44, profileUrl, { apifyToken, forceRefresh = false } = {}) {
  const { url: normalizedUrl } = normalizeProfileUrl(profileUrl);
  const scrapeCache = createScrapeCache(base44);
  const cachedScrape = await scrapeCache.get(normalizedUrl);

  // A stored report is the canonical result for (profile + engine version). While the
  // scrape behind it is still valid, it is served verbatim and nothing is recomputed.
  if (cachedScrape && !forceRefresh) {
    const [stored] = await base44.asServiceRole.entities.Analysis.filter(
      { profile_url: normalizedUrl, engine_version: ENGINE_VERSION },
      '-created_date',
      1
    );
    if (stored && new Date(stored.created_date) >= new Date(cachedScrape.scraped_at)) {
      return { analysis: stored, cached: true };
    }
  }

  let extracted = cachedScrape?.extracted;
  if (!extracted) {
    extracted = await fetchProfileText(profileUrl, apifyToken);
    await scrapeCache.set(normalizedUrl, extracted);
  }

  if (!extracted.headline && !extracted.about && !extracted.posts) {
    throw new AnalysisError(
      'No readable text found on this profile (headline, About and posts are all empty).',
      422
    );
  }

  const result = await runEngine(
    extracted,
    (args) => base44.asServiceRole.integrations.Core.InvokeLLM(args),
    createSemanticCache(base44)
  );

  const inlinePosts = fitsInline(extracted.posts);
  const record = await base44.asServiceRole.entities.Analysis.create({
    profile_url: extracted.profile_url,
    full_name: extracted.full_name,
    photo_url: await mirrorPhoto(base44, extracted.photo_url),
    headline: extracted.headline,
    about: extracted.about,
    posts: inlinePosts ? extracted.posts : '',
    corpus_url: inlinePosts ? '' : await uploadText(base44, extracted.posts, 'corpus.txt', 'text/plain'),
    posts_count: extracted.posts_count,
    engine_version: result.engine_version,
    ...result,
    unlocked: true,
  });

  return { analysis: record, cached: false };
}