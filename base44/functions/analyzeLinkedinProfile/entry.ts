import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { fetchProfileText } from '../../shared/apifyLinkedin.ts';
import { buildPrompt, SIGNAL_SCHEMA } from '../../shared/linguisticEngine.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile_url: profileUrl } = await req.json();
    if (!profileUrl) return Response.json({ error: 'profile_url is required' }, { status: 400 });

    const token = secrets.get('APIFY_API_TOKEN');

    // 1. Scrape the profile text via Apify
    const extracted = await fetchProfileText(profileUrl, token);
    if (!extracted.headline && !extracted.about && !extracted.posts) {
      return Response.json(
        { error: 'No readable text found on this profile (headline, About and posts are all empty).' },
        { status: 422 }
      );
    }

    // 2. Run the linguistic metric engine on the extracted text
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(extracted),
      response_json_schema: SIGNAL_SCHEMA,
    });

    // 3. Persist and return the record that populates the report UI
    const record = await base44.entities.Analysis.create({
      profile_url: extracted.profile_url,
      full_name: extracted.full_name,
      headline: extracted.headline,
      about: extracted.about,
      posts: extracted.posts,
      posts_count: extracted.posts_count,
      ...result,
      unlocked: false,
    });

    return Response.json({ analysis: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}