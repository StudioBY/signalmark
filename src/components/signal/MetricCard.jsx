import React from "react";
import { motion } from "framer-motion";

export default function MetricCard({ metric, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-t border-neutral-200 pt-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{metric.label}</p>
        <p className="text-2xl font-light text-[#1B2430] tabular-nums">{Math.round(metric.score)}</p>
      </div>
      <div className="mt-4 h-[3px] w-full bg-neutral-100">
        <motion.div
          className="h-full bg-[#1B2430]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, metric.score))}%` }}
          transition={{ delay: 0.2 + 0.1 * index, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {metric.observation && (
        <p className="mt-4 text-[15px] leading-[1.7] text-neutral-500 font-light">{metric.observation}</p>
      )}
    </motion.div>
  );
}