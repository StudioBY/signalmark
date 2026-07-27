import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageShell from "@/components/signal/PageShell";

/** A signed-in visitor's own past analyses, resolved from their account email. */
export default function MyReports() {
  const { isAuthenticated, user } = useAuth();
  const [reports, setReports] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    base44.functions
      .invoke("myReports", {})
      .then((res) => setReports(res.data.reports || []))
      .catch(() => setReports([]));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <PageShell title="My reports">
        <p className="text-[15px] font-light leading-[1.7] text-neutral-500">
          Sign in to see the reports saved to your account.
        </p>
        <button
          onClick={() => base44.auth.loginWithProvider("google", window.location.href)}
          className="mt-8 border border-[#1B2430] px-8 py-3 text-[11px] uppercase tracking-[0.24em] text-[#1B2430] transition-colors hover:bg-[#1B2430] hover:text-[#FCFCFB]"
        >
          Continue with Google
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell title="My reports">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">{user?.email}</p>

      {reports === null && (
        <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">Loading</p>
      )}

      {reports?.length === 0 && (
        <p className="mt-10 text-[15px] font-light text-neutral-500">
          No reports yet. Run your first analysis from the homepage.
        </p>
      )}

      {reports?.length > 0 && (
        <div className="mt-10 border-t border-neutral-200">
          {reports.map((r) => (
            <Link
              key={r.id}
              to={`/results?id=${r.id}`}
              className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-5 hover:bg-neutral-50"
            >
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#1B2430]">{r.name}</span>
              <span className="text-[15px] font-light text-neutral-400">{r.overall_score}</span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}