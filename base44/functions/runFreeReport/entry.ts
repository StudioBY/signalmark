import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { runAnalysis, normalizeProfileUrl } from '../../shared/runAnalysis.ts';
import {
  getLaunchMode,
  clientIp,
  FREE_PREVIEW_EMAIL_LIMIT,
  FREE_PREVIEW_IP_DAILY_LIMIT,
  FREE_EMAIL_USED_MESSAGE,
} from '../../shared/launchMode.ts';

const PROFILE_RE = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%À-ÿ.]+\/?$/i;

/**
 * Launch preview path: the same analysis as the paid flow, with no charge. Only available
 * while LAUNCH_MODE is free_preview. One free report per email, three per IP per day.
 * The engine, caches and stored reports are identical to the paid path.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    if ((await getLaunchMode(base44)) !== 'free_preview') {
      return Response.json({ error: 'Free preview is closed.' }, { status: 403 });
    }

    const body = await req.json();
    const rawUrl = String(body.profile_url || '').trim();
    if (!PROFILE_RE.test(rawUrl)) {
      return Response.json({ error: 'Enter a valid linkedin.com/in/username profile URL.' }, { status: 400 });
    }

    // The report is tied to the signed-in account and its verified email.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_e) {
      user = null;
    }
    if (!user?.email) return Response.json({ error: 'Sign in to run an analysis.' }, { status: 401 });

    const email = user.email.toLowerCase();
    const { url: profileUrl } = normalizeProfileUrl(rawUrl);
    const ip = clientIp(req);
    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
      const byEmail = await base44.asServiceRole.entities.Purchase.filter({ email }, '-created_date', 10);
      if (byEmail.filter((p) => p.status !== 'refunded').length >= FREE_PREVIEW_EMAIL_LIMIT) {
        return Response.json({ error: FREE_EMAIL_USED_MESSAGE }, { status: 429 });
      }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const byIp = await base44.asServiceRole.entities.Purchase.filter(
        { ip, created_date: { $gte: since } },
        '-created_date',
        100
      );
      if (byIp.filter((p) => p.status !== 'refunded').length >= FREE_PREVIEW_IP_DAILY_LIMIT) {
        return Response.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
      }
    }

    const purchase = await base44.asServiceRole.entities.Purchase.create({
      profile_url: profileUrl,
      email,
      ip,
      status: 'paid',
      amount_cents: 0,
    });

    const { analysis } = await runAnalysis(base44, profileUrl, {
      apifyToken: secrets.get('APIFY_API_TOKEN'),
    });
    await base44.asServiceRole.entities.Purchase.update(purchase.id, {
      status: 'delivered',
      analysis_id: analysis.id,
    });

    return Response.json({ analysis });
  } catch (error) {
    console.error('runFreeReport failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}