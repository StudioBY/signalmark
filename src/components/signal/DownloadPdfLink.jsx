import React, { useState } from "react";
import { buildReportPdf, reportFileName } from "@/lib/reportPdf";

/** Rebuilds the same report PDF in the browser and saves it. No network call. */
export default function DownloadPdfLink({ analysis, displayName = "" }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const name = displayName || analysis.full_name;
    const blob = await buildReportPdf(analysis, name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFileName(name);
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  };

  return (
    <button
      onClick={download}
      disabled={busy}
      className="text-[11px] uppercase tracking-[0.24em] text-neutral-400 transition-colors hover:text-[#1B2430] disabled:opacity-40"
    >
      {busy ? "Preparing pdf" : "Download pdf"}
    </button>
  );
}