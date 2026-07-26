import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import UrlForm from "@/components/signal/UrlForm";
import AnalysisProgress from "@/components/signal/AnalysisProgress";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const run = async (profileUrl) => {
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("analyzeLinkedinProfile", { profile_url: profileUrl });
      navigate(`/results?id=${res.data.analysis.id}`);
    } catch (e) {
      setError("Analysis failed — try again");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">
            Linguistic Signal Score
          </p>
          <h1 className="mt-8 max-w-xl text-[38px] font-extralight leading-[1.15] tracking-tight md:text-[46px]">
            A measurement of how your profile writes.
          </h1>
          <p className="mt-6 max-w-lg text-[17px] font-light leading-[1.7] text-neutral-500">
            Five text-derived signals — consistency, evidence density, topical focus, lexical
            distinctiveness and redundancy — computed from the headline, About section and recent
            posts of any public profile. No rubric grading, no opinions.
          </p>
        </motion.div>

        <div className="mt-20">
          {busy || error ? (
            <AnalysisProgress error={error} onRetry={() => setError("")} />
          ) : (
            <UrlForm onSubmit={run} busy={busy} />
          )}
        </div>
      </div>
    </div>
  );
}