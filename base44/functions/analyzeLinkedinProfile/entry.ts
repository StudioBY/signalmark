import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { runAnalysis, AnalysisError } from '../../shared/runAnalysis.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile_url: profileUrl, force } = await req.json();
    if (!profileUrl) return Response.json({ error: 'profile_url is required' }, { status: 400 });

    const { analysis, cached } = await runAnalysis(base44, profileUrl, {
      apifyToken: secrets.get('APIFY_API_TOKEN'),
      forceRefresh: force === true && user.role === 'admin',
    });

    return Response.json({ analysis, cached });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}