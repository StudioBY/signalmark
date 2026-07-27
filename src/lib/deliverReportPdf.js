import { base44 } from "@/api/base44Client";
import { buildReportPdf, reportFileName } from "@/lib/reportPdf";

/**
 * Builds the PDF and hands it to the delivery function. Best effort by design:
 * the report on screen must never depend on this succeeding.
 */
export async function deliverReportPdf(analysis, displayName) {
  try {
    const name = displayName || analysis.full_name;
    const blob = await buildReportPdf(analysis, name);
    const file = new File([blob], reportFileName(name), { type: "application/pdf" });
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