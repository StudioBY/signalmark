import React from "react";
import LexicalStats from "./LexicalStats";
import { stripEmDashes } from "@/lib/noEmDash";

export default function ReportBody({ analysis }) {
  return (
    <div className="space-y-20">
      <section>
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Lexical measurements</p>
        <div className="mt-8">
          <LexicalStats stats={analysis.lexical_stats} />
        </div>
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Signal findings</p>
        <div className="mt-8 space-y-10">
          {(analysis.signal_findings || []).map((f, i) => (
            <div key={i} className="border-t border-neutral-200 pt-6">
              <h4 className="text-[17px] font-medium text-[#1B2430]">{stripEmDashes(f.title)}</h4>
              <p className="mt-3 max-w-2xl text-[16px] font-light leading-[1.7] text-neutral-600">
                {stripEmDashes(f.body)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Line-level revisions</p>
        <div className="mt-8 space-y-10">
          {(analysis.rewrites || []).map((r, i) => (
            <div key={i} className="border-t border-neutral-200 pt-6">
              <p className="text-[15px] font-light italic leading-[1.7] text-neutral-400">{r.original}</p>
              <p className="mt-3 text-[17px] font-light leading-[1.7] text-[#1B2430]">{stripEmDashes(r.revised)}</p>
              <p className="mt-3 text-[14px] font-light leading-relaxed text-neutral-500">
                {stripEmDashes(r.rationale)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}