import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { fetchProfileText, normalizeProfileUrl } from '../../shared/apifyLinkedin.ts';
import { createScrapeCache } from '../../shared/scrapeCache.ts';
import { fitsInline, uploadText } from '../../shared/largeText.ts';
import { runEngine, ENGINE_VERSION } from '../../shared/linguisticEngine.ts';
import { createSemanticCache } from '../../shared/semanticCache.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile_url: profileUrl, force } = await req.json();
    if (!profileUrl) return Response.json({ error: 'profile_url is required' }, { status: 400 });

    // 1. Profile text: served from the per-profile scrape cache when fresh (no Apify call),
    //    otherwise scraped once and cached.
    const { url: normalizedUrl } = normalizeProfileUrl(profileUrl);
    const scrapeCache = createScrapeCache(base44);
    const cachedScrape = await scrapeCache.get(normalizedUrl);
    const forceRefresh = force === true && user.role === 'admin';

    // 2. A stored report is the canonical result for (profile + engine version). While the
    //    scrape behind it is still valid, it is served verbatim and nothing is recomputed.
    //    Recompute only on scrape expiry, engine version change, or an admin forced refresh.
    if (cachedScrape && !forceRefresh) {
      const [stored] = await base44.asServiceRole.entities.Analysis.filter(
        { profile_url: normalizedUrl, engine_version: ENGINE_VERSION },
        '-created_date',
        1
      );
      if (stored && new Date(stored.created_date) >= new Date(cachedScrape.scraped_at)) {
        return Response.json({ analysis: stored, cached: true });
      }
    }

    let extracted = cachedScrape?.extracted;
    if (!extracted) {
      extracted = await fetchProfileText(profileUrl, secrets.get('APIFY_API_TOKEN'));
      await scrapeCache.set(normalizedUrl, extracted);
    }

    if (!extracted.headline && !extracted.about && !extracted.posts) {
      return Response.json(
        { error: 'No readable text found on this profile (headline, About and posts are all empty).' },
        { status: 422 }
      );
    }

    // 3. All five metrics computed deterministically in JS; the model writes prose only.
    const result = await runEngine(
      extracted,
      (args) => base44.integrations.Core.InvokeLLM(args),
      createSemanticCache(base44)
    );

    // 4. Persist and return the record that populates the report UI.
    //    Oversized corpora go to file storage rather than the inline field.
    const inlinePosts = fitsInline(extracted.posts);
    const record = await base44.entities.Analysis.create({
      profile_url: extracted.profile_url,
      full_name: extracted.full_name,
      photo_url: extracted.photo_url || '',
      headline: extracted.headline,
      about: extracted.about,
      posts: inlinePosts ? extracted.posts : '',
      corpus_url: inlinePosts ? '' : await uploadText(base44, extracted.posts, 'corpus.txt', 'text/plain'),
      posts_count: extracted.posts_count,
      engine_version: result.engine_version,
      ...result,
      unlocked: false,
    });

    return Response.json({ analysis: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}