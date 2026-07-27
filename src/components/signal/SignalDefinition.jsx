import React from "react";

/** One signal block on the methodology page: name, weight, what and how. */
export default function SignalDefinition({ name, weight, measures, method }) {
  return (
    <div className="border-t border-neutral-200 pt-6">
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#1B2430]">{name}</p>
        <p className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
          Weight {weight}
        </p>
      </div>
      <p className="mt-4 text-[16px] font-light leading-[1.75] text-neutral-600">{measures}</p>
      <p className="mt-3 text-[15px] font-light leading-[1.7] text-neutral-400">{method}</p>
    </div>
  );
}