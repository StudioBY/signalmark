import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ReportView from "@/components/signal/ReportView";

export default function SampleReport() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, analysis: null, name: "", error: "" });

  useEffect(() => {
    base44.functions
      .invoke("samples", { slug })
      .then((res) => setState({ loading: false, analysis: res.data.analysis, name: res.data.name, error: "" }))
      .catch(() => setState({ loading: false, analysis: null, name: "", error: "Sample not available" }));
  }, [slug]);

  if (state.loading || !state.analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCFB]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          {state.error || "Loading report"}
        </p>
      </div>
    );
  }

  return <ReportView analysis={state.analysis} sampleLabel displayName={state.name} />;
}