import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.5.0';
import { secrets } from 'base44:runtime';
import { runAnalysis } from '../../shared/runAnalysis.ts';

/**
 * Called by the report page after a successful Stripe checkout. Verifies the session was
 * actually paid, then runs the analysis (stored report served instantly when it exists).
 * If the analysis cannot be delivered, the charge is refunded automatically.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { session_id: sessionId } = await req.json();
    if (!sessionId) return Response.json({ error: 'session_id is required' }, { status: 400 });

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed.' }, { status: 402 });
    }

    const [purchase] = await base44.asServiceRole.entities.Purchase.filter(
      { stripe_session_id: sessionId },
      '-created_date',
      1
    );
    const profileUrl = purchase?.profile_url || session.metadata?.profile_url;
    if (!profileUrl) return Response.json({ error: 'Unknown purchase.' }, { status: 404 });

    // Already delivered: return the same report, never recompute.
    if (purchase?.analysis_id) {
      const analysis = await base44.asServiceRole.entities.Analysis.get(purchase.analysis_id);
      if (analysis) return Response.json({ analysis });
    }
    if (purchase && purchase.status === 'pending') {
      await base44.asServiceRole.entities.Purchase.update(purchase.id, { status: 'paid' });
    }

    try {
      const { analysis } = await runAnalysis(base44, profileUrl, {
        apifyToken: secrets.get('APIFY_API_TOKEN'),
      });
      if (purchase) {
        await base44.asServiceRole.entities.Purchase.update(purchase.id, {
          status: 'delivered',
          analysis_id: analysis.id,
        });
      }
      return Response.json({ analysis });
    } catch (analysisError) {
      console.error('analysis failed after payment, refunding', analysisError);
      let refunded = false;
      try {
        if (session.payment_intent) {
          await stripe.refunds.create({ payment_intent: session.payment_intent });
          refunded = true;
        }
      } catch (refundError) {
        console.error('refund failed', refundError);
      }
      if (purchase) {
        await base44.asServiceRole.entities.Purchase.update(purchase.id, { status: 'refunded' });
      }
      return Response.json(
        { error: analysisError.message, refunded, failed: true },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('fulfillReport failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}