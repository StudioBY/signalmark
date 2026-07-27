import React from "react";
import { Link } from "react-router-dom";

const LINK =
  "text-[11px] uppercase tracking-[0.24em] text-neutral-400 transition-colors hover:text-[#1B2430]";

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-neutral-200 pt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link to="/methodology" className={LINK}>Methodology</Link>
        <span className="text-[11px] text-neutral-300">·</span>
        <Link to="/terms#terms" className={LINK}>Terms</Link>
        <span className="text-[11px] text-neutral-300">·</span>
        <Link to="/terms#privacy" className={LINK}>Privacy</Link>
      </div>
    </footer>
  );
}