import React from "react";
import { motion } from "framer-motion";

/** Labels for the real request stages reported by the caller. */
const STAGES = {
  retrieving: "Retrieving public profile",
  measuring: "Measuring 5 linguistic signals",
  composing: "Composing your report",
};

export default function AnalysisProgress({ error, onRetry, stage = "retrieving" }) {

  if (error) {
    return (
      <div className="border-t border-neutral-200 pt-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">{error}</p>
        <button
          onClick={onRetry}
          className="mt-8 text-[11px] uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:text-[#1B2430]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center border-t border-neutral-200 pt-16">
      <motion.svg
        viewBox="0 0 100 100"
        className="h-16 w-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
      >
        <circle cx="50" cy="50" r="44" fill="none" stroke="#ECEDEF" strokeWidth="2" />
        <circle
          cx="50" cy="50" r="44" fill="none" stroke="#1B2430" strokeWidth="2"
          strokeLinecap="round" strokeDasharray="70 206"
        />
      </motion.svg>

      <div className="mt-10 h-4">
        <motion.p
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-[11px] uppercase tracking-[0.22em] text-neutral-500"
        >
          {STAGES[stage] || STAGES.retrieving}
        </motion.p>
      </div>
    </div>
  );
}