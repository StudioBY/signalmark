import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EmailGate({ onUnlock }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    await onUnlock(email);
    setBusy(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mx-auto block border border-[#1B2430] px-8 py-3 text-[12px] uppercase tracking-[0.22em] text-[#1B2430] transition-colors duration-500 hover:bg-[#1B2430] hover:text-white"
      >
        Get the full report [email]
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm items-center gap-3">
      <Input
        autoFocus
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-11 rounded-none border-neutral-300 bg-transparent text-sm font-light focus-visible:ring-0 focus-visible:border-[#1B2430]"
      />
      <Button
        type="submit"
        disabled={busy}
        className="h-11 rounded-none bg-[#1B2430] px-6 text-[11px] uppercase tracking-[0.2em] hover:bg-black"
      >
        {busy ? "Unlocking" : "Unlock"}
      </Button>
    </form>
  );
}