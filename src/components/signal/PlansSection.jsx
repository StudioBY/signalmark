import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function PlansSection({ mode = "paid" }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const join = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    await base44.functions.invoke("joinWaitlist", { email: email.trim() });
    setJoined(true);
  };

  return (
    <section className="mt-28 border-t border-neutral-200 pt-12">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Plans</p>

      <div className="mt-10">
        <div className="flex flex-wrap items-baseline gap-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#1B2430]">Single report, $1</p>
          {mode === "free_preview" && (
            <span className="text-[10px] uppercase tracking-[0.24em] text-neutral-400">
              Preview: free
            </span>
          )}
        </div>
        <p className="mt-3 max-w-md text-[15px] font-light leading-[1.7] text-neutral-500">
          One full linguistic signal report, delivered on screen and by PDF to your email.
        </p>
      </div>

      <div className="mt-12 border-t border-neutral-200 pt-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#1B2430]">Monthly, coming soon</p>
        <p className="mt-3 max-w-md text-[15px] font-light leading-[1.7] text-neutral-500">
          Multiple reports and side-by-side profile comparison. Leave your email to get early access.
        </p>

        {joined ? (
          <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            You are on the list.
          </p>
        ) : (
          <form onSubmit={join} className="mt-8 flex max-w-sm items-end gap-6">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border-0 border-b border-neutral-300 bg-transparent pb-2 text-[15px] font-light outline-none placeholder:text-neutral-300 focus:border-[#1B2430]"
            />
            <button
              type="submit"
              className="whitespace-nowrap text-[11px] uppercase tracking-[0.24em] text-neutral-400 hover:text-[#1B2430]"
            >
              Notify me
            </button>
          </form>
        )}
      </div>
    </section>
  );
}