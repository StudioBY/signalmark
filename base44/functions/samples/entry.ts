import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ENGINE_VERSION } from '../../shared/runAnalysis.ts';

/**
 * Public, free sample reports. Served verbatim from stored analyses:
 * no Apify call, no LLM call, nothing recomputed.
 *
 * Which profiles appear is data, not code: any Analysis row on the current
 * engine version with is_sample = true is listed, ordered by composite score
 * (highest first). Swapping a persona is a data edit.
 */
const slugOf = (url) => (url || '').replace(/\/+$/, '').split('/in/')[1] || '';
const nameOf = (report) => report.sample_name || report.full_name || slugOf(report.profile_url);

async function sampleReports(base44) {
  const rows = await base44.asServiceRole.entities.Analysis.filter(
    { is_sample: true, engine_version: ENGINE_VERSION },
    '-overall_score',
    50
  );
  // One report per profile: keep the highest-scoring row if a profile was analyzed twice.
  const bySlug = new Map();
  for (const row of rows) {
    const slug = slugOf(row.profile_url);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, row);
  }
  return [...bySlug.entries()].slice(0, 5);
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

    const entries = await sampleReports(base44);

    if (slug) {
      const found = entries.find(([s]) => s === slug);
      if (!found) return Response.json({ error: 'Sample not available.' }, { status: 404 });
      return Response.json({ analysis: found[1], name: nameOf(found[1]) });
    }

    return Response.json({
      samples: entries.map(([s, report]) => ({
        slug: s,
        name: nameOf(report),
        // Never expose a LinkedIn CDN link to the browser: those are signed and expire.
        photo_url: /licdn\.com|linkedin\.com/i.test(report.photo_url || '') ? '' : report.photo_url || '',
        overall_score: report.overall_score || 0,
      })),
    });
  } catch (error) {
    console.error('samples failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}