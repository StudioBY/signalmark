import React from "react";
import { motion } from "framer-motion";

export default function ScoreDial({ score = 0 }) {
  const r = 84;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative w-[220px] h-[220px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#ECEDEF" strokeWidth="6" />
        <motion.circle
          cx="100" cy="100" r={r} fill="none" stroke="#1B2430" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - c * pct }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-[64px] font-extralight tracking-tight text-[#1B2430] leading-none"
        >
          {Math.round(score)}
        </motion.span>
        <span className="mt-3 text-[10px] uppercase tracking-[0.28em] text-neutral-400">Signal Score</span>
      </div>
    </div>
  );
}