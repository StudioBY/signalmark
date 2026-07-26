import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import AnalyzeForm from "@/components/signal/AnalyzeForm";
import { analyzeProfile } from "@/lib/analyzeProfile";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const run = async (input) => {
    setBusy(true);
    const result = await analyzeProfile(input);
    const record = await base44.entities.Analysis.create({ ...input, ...result, unlocked: false });
    navigate(`/results?id=${record.id}`);
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
          <p className="mt-6 max-w-lg text-[15px] font-light leading-relaxed text-neutral-500">
            Five text-derived signals — consistency, evidence density, topical focus, lexical
            distinctiveness and redundancy — computed from your actual headline, About section and
            recent posts. No rubric grading, no opinions.
          </p>
        </motion.div>

        <div className="mt-20">
          <AnalyzeForm onSubmit={run} busy={busy} />
        </div>

        {busy && (
          <p className="mt-10 text-[12px] uppercase tracking-[0.2em] text-neutral-400">
            Parsing text · extracting signals
          </p>
        )}
      </div>
    </div>
  );
}