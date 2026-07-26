import React from "react";

const Row = ({ label, value }) => (
  <div className="flex items-baseline justify-between border-t border-neutral-200 py-4">
    <span className="text-[12px] uppercase tracking-[0.16em] text-neutral-500">{label}</span>
    <span className="text-lg font-light text-[#1B2430] tabular-nums">{value}</span>
  </div>
);

export default function LexicalStats({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid gap-x-16 md:grid-cols-2">
      <div>
        <Row label="Type-token ratio" value={(stats.type_token_ratio ?? 0).toFixed(2)} />
        <Row label="Avg. sentence length" value={`${Math.round(stats.avg_sentence_length ?? 0)} w`} />
        <Row label="Evidence / 100 words" value={(stats.evidence_per_100_words ?? 0).toFixed(1)} />
      </div>
      <div className="mt-10 md:mt-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">Repeated phrases</p>
        <p className="mt-3 text-[15px] font-light leading-[1.7] text-neutral-600">
          {(stats.repeated_phrases || []).join(" · ") || "None"}
        </p>
        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-neutral-400">Dominant topics</p>
        <p className="mt-3 text-[15px] font-light leading-[1.7] text-neutral-600">
          {(stats.dominant_topics || []).join(" · ") || "None"}
        </p>
      </div>
    </div>
  );
}