import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell, { Section } from "@/components/signal/PageShell";
import SignalDefinition from "@/components/signal/SignalDefinition";

const BANDS = [
  ["85 to 100", "Strong. Consistent positioning carried by quantified, specific language."],
  ["70 to 84", "Solid. The signal holds, with one or two measurable weak points."],
  ["55 to 69", "Mixed. Some surfaces carry the claim, others dilute it."],
  ["0 to 54", "Weak. Generic register, thin evidence or scattered topics dominate."],
];

export default function Methodology() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("engineSpec", {})
      .then((res) => setSpec(res.data))
      .catch(() => setSpec(null));
  }, []);

  if (!spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCFB]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Loading methodology</p>
      </div>
    );
  }

  const w = spec.weights;
  const c = spec.calibration;
  const pct = (v) => `${Math.round(v * 100)}%`;

  const SIGNALS = [
    {
      name: "Message consistency",
      weight: pct(w.message_consistency),
      measures:
        "Whether the same positioning claim recurs across the separate surfaces of the profile, or whether each surface argues something different.",
      method: `Each populated surface is turned into a normalized term vector and compared by cosine similarity against the centroid of the remaining surfaces, leave one out. Deterministic, no model involved (${spec.semantic_method}).`,
    },
    {
      name: "Evidence density",
      weight: pct(w.evidence_density),
      measures:
        "How much of the language is anchored to quantified claims rather than assertion: figures, percentages, currency, multipliers and scale expressions.",
      method: `Non-overlapping quantified markers per 100 words. A rate of ${c.evidence_target_per_100_words} markers per 100 words scores 100.`,
    },
    {
      name: "Topical focus",
      weight: pct(w.topical_focus),
      measures:
        "Whether the corpus concentrates on one domain or spreads thinly across unrelated subjects.",
      method:
        "Text units are clustered by cosine proximity and scored on their distance to the corpus centroid plus the concentration of the largest cluster. Deterministic.",
    },
    {
      name: "Lexical distinctiveness",
      weight: pct(w.lexical_distinctiveness),
      measures:
        "Vocabulary range and specificity, against the generic professional register that fills most profiles.",
      method: `Moving-average type-token ratio, where ${c.mattr_target} scores 100, minus ${c.boilerplate_penalty_per_100_words} points for every boilerplate marker per 100 words.`,
    },
    {
      name: "Redundancy control",
      weight: pct(w.redundancy),
      measures:
        "Compression: how little of the text repeats itself or pads itself with filler. Higher is better.",
      method: `Trigram repeat rate, where ${c.repeat_rate_tolerance} scores 0, minus up to ${c.filler_max_penalty} points scaled by filler markers per 100 words (full penalty at ${c.filler_penalty_rate} per 100).`,
    },
  ];

  return (
    <PageShell title="Methodology" subtitle="How the Linguistic Signal Score is computed.">
      <Section label="Principle">
        <p>
          The score is deterministic and reproducible. The same text, under the same engine
          version, always produces the same numbers. There is no rubric grading and no opinion in
          the score: all five signals are computed arithmetically from the text itself.
        </p>
        <p>
          A language model is used for one thing only, writing the prose of the report from numbers
          it is handed as ground truth. It does not score, weight or rank anything. Engine version{" "}
          {spec.engine_version}.
        </p>
      </Section>

      <Section label="Corpus">
        <p>
          The measured corpus is the public text of one LinkedIn profile: the headline, the About
          section, the current role description and up to {spec.max_posts} most recent posts.
        </p>
        <p>
          URLs and hashtag runs are stripped before any measurement, since they are not language.
          A corpus with fewer than {spec.limited_corpus.posts} posts or under{" "}
          {spec.limited_corpus.words} words is flagged on the report as limited, because short
          corpora make every rate less stable.
        </p>
      </Section>

      <Section label="Corpus sufficiency">
        <p>
          Very short corpora are scaled down by a volume sufficiency factor: the total word
          count divided by {c.sufficiency_words}, capped at 1. That factor multiplies topical
          focus, lexical distinctiveness and redundancy control, because a text of a few dozen
          words satisfies those three by construction. A corpus of {c.sufficiency_words} words
          or more is not scaled at all.
        </p>
        <p>
          Message consistency carries a separate factor of its own: the share of the{" "}
          {c.coverage_surfaces} surfaces that actually carry text, raised to the power of{" "}
          {c.coverage_exponent}, since a missing surface cannot restate the claim.
        </p>
      </Section>

      <Section label="The five signals">
        <div className="space-y-8">
          {SIGNALS.map((s) => (
            <SignalDefinition key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section label="Composite">
        <p>
          The composite is a weighted sum, computed in code, never by a model:
        </p>
        <p className="font-mono text-[14px] leading-[1.9] text-[#1B2430]">
          {pct(w.message_consistency)} message consistency + {pct(w.evidence_density)} evidence
          density + {pct(w.topical_focus)} topical focus + {pct(w.lexical_distinctiveness)} lexical
          distinctiveness + {pct(w.redundancy)} redundancy control
        </p>
        <p>
          Every sub-score is clamped to 0 to 100 before weighting, and the result is rounded to a
          whole number. The calibration constants in force are: evidence target{" "}
          {c.evidence_target_per_100_words} markers per 100 words, type-token target{" "}
          {c.mattr_target}, boilerplate penalty {c.boilerplate_penalty_per_100_words} points per
          marker per 100 words, repeat-rate tolerance {c.repeat_rate_tolerance}, filler penalty up
          to {c.filler_max_penalty} points at {c.filler_penalty_rate} markers per 100 words.
        </p>
      </Section>

      <Section label="Score bands">
        <div className="space-y-4">
          {BANDS.map(([range, text]) => (
            <div key={range} className="flex gap-6 border-t border-neutral-200 pt-4">
              <p className="w-24 shrink-0 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                {range}
              </p>
              <p className="text-[15px] font-light leading-[1.7] text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Limitations">
        <p>
          The score measures language patterns. It does not measure career quality, competence,
          reach, engagement or the truth of any claim in the text.
        </p>
        <p>
          Small corpora are noisier: with little text, a single post can move a rate. Only publicly
          visible text is read, so a profile that keeps its About section or posts private is
          measured on less material and scores accordingly.
        </p>
      </Section>
    </PageShell>
  );
}