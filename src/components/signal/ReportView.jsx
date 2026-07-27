import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ScoreDial from "@/components/signal/ScoreDial";
import MetricCard from "@/components/signal/MetricCard";
import MetricRadar from "@/components/signal/MetricRadar";
import ReportBody from "@/components/signal/ReportBody";
import ReportSubject from "@/components/signal/ReportSubject";
import BackLink from "@/components/signal/BackLink";
import Footer from "@/components/signal/Footer";
import { stripEmDashes } from "@/lib/noEmDash";

export default function ReportView({ analysis, sampleLabel = false, displayName = "", sentTo = "" }) {
  const metrics = analysis.metrics || [];
  const slug = (analysis.profile_url || "").replace(/\/+$/, "").split("/in/")[1];
  const subjectLabel = displayName || analysis.full_name || (slug ? `linkedin.com/in/${slug}` : "");

  const postsCount = analysis.posts_count || 0;
  const limitedCorpus = postsCount < 10 || (analysis.lexical_stats?.word_count || 0) < 500;

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="flex items-start justify-between">
          <div>
            <BackLink
              to={sampleLabel ? "/#sample-reports" : "/"}
              label={sampleLabel ? "All reports" : "Back"}
            />
            <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-neutral-400">Report</p>
            {sampleLabel && (
              <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-neutral-400">Sample report</p>
            )}
            <ReportSubject name={subjectLabel} photoUrl={analysis.photo_url} />
          </div>
          <Link to="/" className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-[#1B2430]">
            New analysis
          </Link>
        </div>

        {sentTo && (
          <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Report sent to {sentTo}
          </p>
        )}

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
          <ReportBody analysis={analysis} />
        </div>

        <Footer />
      </div>
    </div>
  );
}