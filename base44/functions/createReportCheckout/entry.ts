import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.5.0';
import { secrets } from 'base44:runtime';
import { normalizeProfileUrl } from '../../shared/runAnalysis.ts';

const PROFILE_RE = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%À-ÿ.]+\/?$/i;
const DAILY_IP_LIMIT = 10;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const rawUrl = String(body.profile_url || '').trim();
    const origin = String(body.origin || '').replace(/\/+$/, '');

    if (!PROFILE_RE.test(rawUrl)) {
      return Response.json({ error: 'Enter a valid linkedin.com/in/username profile URL.' }, { status: 400 });
    }

    const { url: profileUrl, slug } = normalizeProfileUrl(rawUrl);

    // Sign-in comes before payment: the checkout and the PDF use the verified account email.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_e) {
      user = null;
    }
    if (!user?.email) return Response.json({ error: 'Sign in to run an analysis.' }, { status: 401 });
    const email = user.email.toLowerCase();

    // Admin users bypass payment entirely.
    if (user.role === 'admin') {
      return Response.json({ admin: true, profile_url: profileUrl });
    }

    // Light abuse guard: max 10 paid analyses per IP per day.
    const ip =
      req.headers.get('cf-connecting-ip') ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      'unknown';
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await base44.asServiceRole.entities.Purchase.filter(
      { ip, created_date: { $gte: since } },
      '-created_date',
      100
    );
    if (recent.filter((p) => p.status !== 'refunded').length >= DAILY_IP_LIMIT) {
      return Response.json(
        { error: 'Daily limit reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 100,
            product_data: { name: `Linguistic Signal Report - ${slug}` },
          },
        },
      ],
      success_url: `${origin}/results?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        profile_url: profileUrl,
        email,
      },
    });

    await base44.asServiceRole.entities.Purchase.create({
      profile_url: profileUrl,
      email,
      ip,
      stripe_session_id: session.id,
      status: 'pending',
      amount_cents: 100,
    });

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    console.error('createReportCheckout failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}