import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const Field = ({ label, hint, children }) => (
  <div className="border-t border-neutral-200 pt-8">
    <div className="mb-4 flex items-baseline justify-between">
      <label className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">{label}</label>
      <span className="text-[11px] font-light text-neutral-400">{hint}</span>
    </div>
    {children}
  </div>
);

const inputCls =
  "rounded-none border-0 border-b border-neutral-200 bg-transparent px-0 text-[15px] font-light shadow-none focus-visible:ring-0 focus-visible:border-[#1B2430] transition-colors";

export default function AnalyzeForm({ onSubmit, busy }) {
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [posts, setPosts] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!headline.trim()) return;
        onSubmit({ headline, about, posts });
      }}
      className="space-y-12"
    >
      <Field label="Headline" hint="required">
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Paste your LinkedIn headline"
          className={`h-11 ${inputCls}`}
        />
      </Field>

      <Field label="About section" hint="optional">
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={6}
          placeholder="Paste the full About text"
          className={`resize-none ${inputCls}`}
        />
      </Field>

      <Field label="Recent posts" hint="separate with a blank line">
        <Textarea
          value={posts}
          onChange={(e) => setPosts(e.target.value)}
          rows={8}
          placeholder="Paste 3–5 recent posts"
          className={`resize-none ${inputCls}`}
        />
      </Field>

      <button
        type="submit"
        disabled={busy || !headline.trim()}
        className="border border-[#1B2430] px-10 py-3 text-[12px] uppercase tracking-[0.24em] text-[#1B2430] transition-colors duration-500 hover:bg-[#1B2430] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#1B2430]"
      >
        {busy ? "Measuring language" : "Run analysis"}
      </button>
    </form>
  );
}