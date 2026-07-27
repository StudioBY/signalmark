import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Returns the signed-in account's own past analyses, resolved through the Purchase rows
 * recorded for their verified account email. Read only: no engine, cache or payment writes.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email.toLowerCase();
    const purchases = await base44.asServiceRole.entities.Purchase.filter(
      { email },
      '-created_date',
      100
    );

    const seen = new Set();
    const reports = [];
    for (const p of purchases) {
      if (!p.analysis_id || seen.has(p.analysis_id)) continue;
      seen.add(p.analysis_id);
      const analysis = await base44.asServiceRole.entities.Analysis.get(p.analysis_id).catch(() => null);
      if (!analysis) continue;
      reports.push({
        id: analysis.id,
        name: analysis.full_name || analysis.profile_url,
        overall_score: analysis.overall_score,
      });
    }

    return Response.json({ reports });
  } catch (error) {
    console.error('myReports failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}