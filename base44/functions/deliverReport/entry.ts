import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { stripEmDashesDeep } from '../../shared/noEmDash.ts';

/**
 * Emails the report PDF to the address captured before checkout. Delivery is a side
 * channel: it never touches the analysis, the caches or the payment state beyond the
 * pdf_sent flag, and any failure here leaves the on-screen report untouched.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { analysis_id: analysisId, pdf_url: pdfUrl } = await req.json();
    if (!analysisId || !pdfUrl) {
      return Response.json({ error: 'analysis_id and pdf_url are required' }, { status: 400 });
    }

    const [purchase] = await base44.asServiceRole.entities.Purchase.filter(
      { analysis_id: analysisId },
      '-created_date',
      1
    );
    // No purchase means an admin run or a sample: nothing is emailed.
    if (!purchase?.email) return Response.json({ sent: false });
    if (purchase.pdf_sent) return Response.json({ sent: true, email: purchase.email });

    const analysis = await base44.asServiceRole.entities.Analysis.get(analysisId);
    const name = analysis?.sample_name || analysis?.full_name || 'your profile';

    // Minimal HTML paragraphs, so the separated lines survive delivery even when
    // plain-text newlines are collapsed by the mail client.
    const body = stripEmDashesDeep(
      [
        `<p>Your Linguistic Signal Report for ${name} is ready.</p>`,
        `<p>Composite score: ${analysis?.overall_score ?? ''} out of 100.<br>${analysis?.verdict_title || ''}</p>`,
        `<p>Download the full report (PDF): <a href="${pdfUrl}">${pdfUrl}</a></p>`,
        `<p>Every number is computed arithmetically from the profile's public text. The same text always produces the same score.</p>`,
        `<p>SignalMark · A measurement of how your profile writes.</p>`,
      ].join('\n')
    );

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: purchase.email,
        subject: `Your SignalMark Report - ${name}`,
        body,
        from_name: 'SignalMark',
      });
    } catch (emailError) {
      console.error('SendEmail failed', emailError);
      return Response.json({ sent: false });
    }

    await base44.asServiceRole.entities.Purchase.update(purchase.id, { pdf_sent: true });
    return Response.json({ sent: true, email: purchase.email });
  } catch (error) {
    console.error('deliverReport failed', error);
    return Response.json({ sent: false }, { status: 200 });
  }
}