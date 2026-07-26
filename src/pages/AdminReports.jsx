import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const subjectLabel = (a) => {
  const slug = (a.profile_url || "").replace(/\/+$/, "").split("/in/")[1];
  return a.full_name || (slug ? `linkedin.com/in/${slug}` : "—");
};

export default function AdminReports() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== "admin") {
        navigate("/", { replace: true });
        return;
      }
      setRows(await base44.entities.Analysis.list("-created_date", 200));
    })();
  }, [navigate]);

  if (!rows) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCFB]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">Stored analyses</p>

        <div className="mt-14">
          {rows.map((a) => (
            <Link
              key={a.id}
              to={`/results?id=${a.id}`}
              className="flex items-baseline justify-between gap-6 border-t border-neutral-200 py-5 transition-colors hover:bg-neutral-50"
            >
              <span className="w-28 shrink-0 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                {new Date(a.created_date).toLocaleDateString()}
              </span>
              <span className="flex-1 truncate text-[16px] font-light">{subjectLabel(a)}</span>
              <span className="text-lg font-light tabular-nums">{a.overall_score ?? "—"}</span>
            </Link>
          ))}
          {rows.length === 0 && (
            <p className="border-t border-neutral-200 pt-6 text-[15px] font-light text-neutral-500">
              No analyses stored yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}