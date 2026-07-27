import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function SampleReports() {
  const [samples, setSamples] = useState([]);
  const { hash } = useLocation();

  useEffect(() => {
    base44.functions
      .invoke("samples", {})
      .then((res) => setSamples(res.data.samples || []))
      .catch(() => setSamples([]));
  }, []);

  // The cards load asynchronously, so re-anchor once they are on screen.
  useEffect(() => {
    if (samples.length === 0 || hash !== "#sample-reports") return;
    document.getElementById("sample-reports")?.scrollIntoView({ behavior: "smooth" });
  }, [samples, hash]);

  if (samples.length === 0) return null;

  return (
    <section id="sample-reports" className="mt-28 scroll-mt-16 border-t border-neutral-200 pt-12">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Sample reports</p>
      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:grid-cols-5">
        {samples.map((s) => (
          <Link key={s.slug} to={`/sample/${s.slug}`} className="group block text-left">
            {s.photo_url && (
              <img
                src={s.photo_url}
                alt=""
                className="mb-4 h-14 w-14 rounded-full object-cover grayscale"
              />
            )}
            <p className="text-[11px] uppercase leading-[1.5] tracking-[0.18em] text-[#1B2430] group-hover:text-neutral-500">
              {s.name}
            </p>
            <p className="mt-2 text-[15px] font-light text-neutral-400">{s.overall_score}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-[13px] font-light text-neutral-400">
        Free to open, no email required.
      </p>
    </section>
  );
}