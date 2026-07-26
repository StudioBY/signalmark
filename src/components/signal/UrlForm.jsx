import React, { useState } from "react";
import { Input } from "@/components/ui/input";

export default function UrlForm({ onSubmit, busy }) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!url.trim()) return;
        onSubmit(url.trim());
      }}
      className="border-t border-neutral-200 pt-8"
    >
      <label className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        LinkedIn profile URL
      </label>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="linkedin.com/in/username"
          className="h-12 flex-1 rounded-none border-0 border-b border-neutral-200 bg-transparent px-0 text-[17px] font-light shadow-none transition-colors focus-visible:border-[#1B2430] focus-visible:ring-0 md:text-[17px]"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="border border-[#1B2430] px-10 py-3 text-[12px] uppercase tracking-[0.24em] text-[#1B2430] transition-colors duration-500 hover:bg-[#1B2430] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#1B2430]"
        >
          {busy ? "Analyzing" : "Run analysis"}
        </button>
      </div>

    </form>
  );
}