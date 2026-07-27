import React from "react";
import BackLink from "@/components/signal/BackLink";
import Footer from "@/components/signal/Footer";

/** Shared frame for the static content pages: title, subtitle, back control, footer. */
export default function PageShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <BackLink to="/" label="Back" />
        <h1 className="mt-10 text-[34px] font-extralight leading-[1.15] tracking-tight md:text-[40px]">
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-[17px] font-light leading-[1.7] text-neutral-500">
          {subtitle}
        </p>
        <div className="mt-20 space-y-20">{children}</div>
        <Footer />
      </div>
    </div>
  );
}

export function Section({ label, id, children }) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-neutral-200 pt-10">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">{label}</p>
      <div className="mt-8 max-w-2xl space-y-5 text-[16px] font-light leading-[1.75] text-neutral-600">
        {children}
      </div>
    </section>
  );
}