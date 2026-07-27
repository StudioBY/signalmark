import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import PurchaseForm from "@/components/signal/PurchaseForm";
import SampleReports from "@/components/signal/SampleReports";
import PlansSection from "@/components/signal/PlansSection";
import AnalysisProgress from "@/components/signal/AnalysisProgress";
import Footer from "@/components/signal/Footer";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const resumed = useRef(false);

  useEffect(() => {
    base44.functions
      .invoke("appMode", {})
      .then((res) => setMode(res.data.launch_mode))
      .catch(() => setMode("paid"));
  }, []);

  const run = async (profileUrl) => {
    setBusy(true);
    setError("");
    try {
      if (mode === "free_preview") {
        const res = await base44.functions.invoke("runFreeReport", {
          profile_url: profileUrl,
        });
        navigate(`/results?id=${res.data.analysis.id}&deliver=1`);
        return;
      }

      const res = await base44.functions.invoke("createReportCheckout", {
        profile_url: profileUrl,
        origin: window.location.origin,
      });

      // Admin users bypass payment entirely.
      if (res.data.admin) {
        const analysis = await base44.functions.invoke("analyzeLinkedinProfile", {
          profile_url: profileUrl,
        });
        navigate(`/results?id=${analysis.data.analysis.id}`);
        return;
      }

      if (window.self !== window.top) {
        setError("Checkout works only from the published app, open it in a new tab");
        setBusy(false);
        return;
      }
      window.location.href = res.data.checkout_url;
    } catch (e) {
      setError(e?.response?.data?.error || "Could not run the analysis, try again");
      setBusy(false);
    }
  };

  // Sign-in is required at submission: the profile URL rides along and the run resumes on return.
  const start = (profileUrl) => {
    if (!isAuthenticated) {
      base44.auth.loginWithProvider(
        "google",
        `${window.location.origin}/?profile=${encodeURIComponent(profileUrl)}`
      );
      return;
    }
    run(profileUrl);
  };

  useEffect(() => {
    if (resumed.current || !mode || !isAuthenticated) return;
    const pending = new URLSearchParams(window.location.search).get("profile");
    if (!pending) return;
    resumed.current = true;
    window.history.replaceState({}, "", "/");
    run(pending);
  }, [mode, isAuthenticated]);

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#1B2430]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">
            Linguistic Signal Score
          </p>
          <h1 className="mt-8 max-w-xl text-[38px] font-extralight leading-[1.15] tracking-tight md:text-[46px]">
            A measurement of how your profile writes.
          </h1>
          <p className="mt-6 max-w-lg text-[17px] font-light leading-[1.7] text-neutral-500">
            Five text-derived signals (message consistency, evidence density, topical focus,
            lexical distinctiveness and redundancy control), computed from the headline, About
            section and recent posts of any public LinkedIn profile. Deterministic and
            reproducible: the same text always produces the same score. No rubric grading, no
            opinions.
          </p>
        </motion.div>

        <div className="mt-20">
          {busy || error ? (
            <AnalysisProgress error={error} onRetry={() => { setError(""); setBusy(false); }} />
          ) : (
            mode && <PurchaseForm onSubmit={start} busy={busy} mode={mode} signedIn={isAuthenticated} />
          )}
        </div>

        <SampleReports />
        <PlansSection mode={mode} />
        <Footer />
      </div>
    </div>
  );
}