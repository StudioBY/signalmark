import React from "react";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

/** Neutral fallback avatar: initials on an ink circle, matching the report design language. */
export default function Monogram({ name, className = "h-14 w-14" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#1B2430] ${className}`}
      aria-hidden="true"
    >
      <span className="text-[11px] uppercase tracking-[0.14em] text-[#FCFCFB]">
        {initials(name)}
      </span>
    </div>
  );
}