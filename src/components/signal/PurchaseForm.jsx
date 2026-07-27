import React, { useState } from "react";
import PreviewBanner from "@/components/signal/PreviewBanner";

const PROFILE_RE = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%À-ÿ.]+\/?$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PurchaseForm({ onSubmit, busy, mode = "paid" }) {
  const free = mode === "free_preview";
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    const cleanEmail = email.trim();
    if (!PROFILE_RE.test(cleanUrl)) {
      setError("Enter a full profile URL in the form linkedin.com/in/username");
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    onSubmit(cleanUrl, cleanEmail);
  };

  return (
    <form onSubmit={submit} className="border-t border-neutral-200 pt-10">
      {free && <PreviewBanner />}
      <label className="block text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        LinkedIn profile URL
      </label>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.linkedin.com/in/username"
        className="mt-4 w-full border-0 border-b border-neutral-300 bg-transparent pb-3 text-[17px] font-light outline-none placeholder:text-neutral-300 focus:border-[#1B2430]"
      />

      <label className="mt-10 block text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        Email for the PDF
      </label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mt-4 w-full border-0 border-b border-neutral-300 bg-transparent pb-3 text-[17px] font-light outline-none placeholder:text-neutral-300 focus:border-[#1B2430]"
      />

      <p className="mt-4 text-[13px] font-light text-neutral-400">
        A PDF copy of the full report will be sent to this address.
      </p>

      {error && (
        <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-neutral-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-10 border border-[#1B2430] px-8 py-3 text-[11px] uppercase tracking-[0.24em] text-[#1B2430] transition-colors hover:bg-[#1B2430] hover:text-[#FCFCFB] disabled:opacity-40"
      >
        {busy ? "Preparing" : free ? "Analyze for free" : "Analyze for $1"}
      </button>
    </form>
  );
}