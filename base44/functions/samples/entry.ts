import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ENGINE_VERSION } from '../../shared/runAnalysis.ts';

/**
 * Public, free sample reports. Served verbatim from stored analyses:
 * no Apify call, no LLM call, nothing recomputed.
 */
const SAMPLES = [
  { slug: 'justin-welsh', name: 'Justin Welsh', profile_url: 'https://www.linkedin.com/in/justinwelsh/' },
  { slug: 'satya-nadella', name: 'Satya Nadella', profile_url: 'https://www.linkedin.com/in/satyanadella/' },
  { slug: 'reid-hoffman', name: 'Reid Hoffman', profile_url: 'https://www.linkedin.com/in/reidhoffman/' },
  { slug: 'adam-grant', name: 'Adam Grant', profile_url: 'https://www.linkedin.com/in/adammgrant/' },
  { slug: 'maor-shlomo', name: 'Maor Shlomo', profile_url: 'https://www.linkedin.com/in/maor-shlomo-1088b4144/' },
];

async function storedReport(base44, profileUrl) {
  const [report] = await base44.asServiceRole.entities.Analysis.filter(
    { profile_url: profileUrl, engine_version: ENGINE_VERSION },
    '-created_date',
    1
  );
  return report || null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let slug = null;
    try {
      const body = await req.json();
      slug = body?.slug || null;
    } catch (_e) {
      slug = null;
    }

    if (slug) {
      const entry = SAMPLES.find((s) => s.slug === slug);
      if (!entry) return Response.json({ error: 'Unknown sample.' }, { status: 404 });
      const report = await storedReport(base44, entry.profile_url);
      if (!report) return Response.json({ error: 'Sample not available.' }, { status: 404 });
      return Response.json({ analysis: report, name: entry.name });
    }

    const cards = [];
    for (const entry of SAMPLES) {
      const report = await storedReport(base44, entry.profile_url);
      if (report) {
        cards.push({
          slug: entry.slug,
          name: entry.name,
          photo_url: report.photo_url || '',
          overall_score: report.overall_score || 0,
        });
      }
    }
    return Response.json({ samples: cards });
  } catch (error) {
    console.error('samples failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}