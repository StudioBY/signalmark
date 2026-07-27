import { base44 } from "@/api/base44Client";
import { buildReportPdf } from "@/lib/reportPdf";

/**
 * Builds the PDF and hands it to the delivery function. Best effort by design:
 * the report on screen must never depend on this succeeding.
 */
export async function deliverReportPdf(analysis, displayName) {
  try {
    const blob = buildReportPdf(analysis, displayName);
    const file = new File([blob], "linguistic-signal-report.pdf", { type: "application/pdf" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.functions.invoke("deliverReport", {
      analysis_id: analysis.id,
      pdf_url: file_url,
    });
    return res.data?.sent ? res.data.email : null;
  } catch (_e) {
    return null;
  }
}