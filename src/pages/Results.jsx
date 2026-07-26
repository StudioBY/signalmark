import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import ScoreDial from "@/components/signal/ScoreDial";
import MetricCard from "@/components/signal/MetricCard";
import MetricRadar from "@/components/signal/MetricRadar";
import ReportBody from "@/components/signal/ReportBody";
import EmailGate from "@/components/signal/EmailGate";
import ReportSubject from "@/components/signal/ReportSubject";
import { stripEmDashes } from "@/lib/noEmDash";

export default function Results() {
  const id = new URLSearchParams(window.location.search).get("id");
  const [analysis, setAnalysis] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id) base44.entities.Analysis.get(id).then(setAnalysis);
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
  }, [id]);

  if (!analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCFB]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Loading report</p>
      </div>
    );
  }

  const unlock = async (email) => {
    await base44.entities.Analysis.update(analysis.id, { email, unlocked: true });
    setAnalysis({ ...analysis, email, unlocked: true });
  };

  const metrics = analysis.metrics || [];

  const slug = (analysis.profile_url || "").replace(/\/+$/, "").split("/in/")[1];
  const subjectLabel = analysis.full_name || (slug ? `linkedin.com/in/${slug}` : "");

  const postsCount = analysis.posts_count || 0;
  const limitedCorpus = postsCount < 10 || (analysis.lexical_stats?.word_count || 0) < 500;

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">Report</p>
            <ReportSubject name={subjectLabel} photoUrl={analysis.photo_url} />
          </div>
          <Link to="/" className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-[#1B2430]">
            New analysis
          </Link>
        </div>

        {limitedCorpus && (
          <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Limited corpus: {postsCount} posts analyzed. Signals may be less stable.
          </p>
        )}

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          className="mt-16 grid items-center gap-16 md:grid-cols-2"
        >
          <div className="flex justify-center md:justify-start">
            <ScoreDial score={analysis.overall_score || 0} />
          </div>
          <div>
            <h1 className="text-[26px] font-light leading-snug tracking-tight">{stripEmDashes(analysis.verdict_title)}</h1>
            <p className="mt-5 text-[16px] font-light leading-[1.7] text-neutral-500">
              {stripEmDashes(analysis.verdict_summary)}
            </p>
          </div>
        </motion.div>

        <div className="mt-24 grid gap-x-16 gap-y-10 md:grid-cols-2">
          {metrics.map((m, i) => (
            <MetricCard key={m.key || i} metric={m} index={i} />
          ))}
        </div>

        <div className="mt-24 border-t border-neutral-200 pt-12">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Signal distribution</p>
          <MetricRadar metrics={metrics} />
        </div>

        <div className="mt-28">
          {analysis.unlocked || isAdmin ? (
            <ReportBody analysis={analysis} />
          ) : (
            <div className="relative">
              <div className="pointer-events-none select-none blur-[6px] opacity-60">
                <ReportBody analysis={analysis} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#FCFCFB]/10 via-[#FCFCFB]/85 to-[#FCFCFB]" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 pb-4">
                <p className="max-w-sm text-center text-[15px] font-light leading-[1.7] text-neutral-500">
                  Lexical measurements, signal findings and line-level revisions are included in the
                  full report.
                </p>
                <EmailGate onUnlock={unlock} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}