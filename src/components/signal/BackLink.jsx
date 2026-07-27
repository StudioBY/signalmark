import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Small editorial back control, matching the "New analysis" link register. */
export default function BackLink({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-[#1B2430]"
    >
      <ArrowLeft className="h-3 w-3" strokeWidth={1.25} />
      {label}
    </Link>
  );
}