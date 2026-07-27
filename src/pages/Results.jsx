import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ReportView from "@/components/signal/ReportView";
import AnalysisProgress from "@/components/signal/AnalysisProgress";

export default function Results() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const sessionId = params.get("session_id");

  const [analysis, setAnalysis] = useState(null);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (id) {
      base44.entities.Analysis.get(id).then(setAnalysis);
      return;
    }
    if (sessionId) {
      base44.functions
        .invoke("fulfillReport", { session_id: sessionId })
        .then((res) => setAnalysis(res.data.analysis))
        .catch(() => setFailure("Analysis failed, your payment will be refunded"));
    }
  }, [id, sessionId]);

  if (failure) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#FCFCFB] px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.24em] text-neutral-500">
          {failure}
        </p>
        <Link to="/" className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-[#1B2430]">
          Back
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCFB] px-6">
        {sessionId ? (
          <AnalysisProgress error="" onRetry={() => {}} />
        ) : (
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Loading report</p>
        )}
      </div>
    );
  }

  return <ReportView analysis={analysis} />;
}