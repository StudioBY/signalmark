export const SIGNAL_SCHEMA = {
  type: "object",
  properties: {
    overall_score: { type: "number" },
    verdict_title: { type: "string" },
    verdict_summary: { type: "string" },
    metrics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          score: { type: "number" },
          observation: { type: "string" },
        },
      },
    },
    lexical_stats: {
      type: "object",
      properties: {
        type_token_ratio: { type: "number" },
        avg_sentence_length: { type: "number" },
        evidence_per_100_words: { type: "number" },
        repeated_phrases: { type: "array", items: { type: "string" } },
        dominant_topics: { type: "array", items: { type: "string" } },
      },
    },
    signal_findings: {
      type: "array",
      items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } } },
    },
    rewrites: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          revised: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
  },
};

export function buildPrompt({ headline, about, posts }) {
  return `You are a computational linguistics engine that audits LinkedIn profile text. You do NOT coach and you do NOT use marketing language. You measure how the text is written, using observable, text-derived signals only. Tone: cold, precise, analytical, in English.

Compute five metrics, each scored 0-100 with a one-to-two sentence observation citing concrete evidence from the text:
1. key "message_consistency", label "Message Consistency" — semantic overlap between headline, About, and posts; does the same positioning claim recur across surfaces?
2. key "evidence_density", label "Evidence Density" — density of quantified outcomes, numbers, named artifacts, verifiable results vs. unsupported adjectives.
3. key "topical_focus", label "Topical Focus" — concentration of topics; penalize scattered subject matter.
4. key "lexical_distinctiveness", label "Lexical Distinctiveness" — proportion of low-frequency, domain-specific wording vs. generic LinkedIn boilerplate ("passionate", "results-driven", "thought leader").
5. key "redundancy", label "Redundancy Control" — 100 means little repetition/filler; low means repeated phrases, restated clauses, padding.

overall_score: weighted composite (message_consistency 0.25, evidence_density 0.25, topical_focus 0.2, lexical_distinctiveness 0.2, redundancy 0.1), rounded to integer.
verdict_title: max 8 words, factual, no hype (e.g. "Consistent positioning, thin quantified evidence").
verdict_summary: 2 sentences explaining what the score means.
lexical_stats: type_token_ratio (0-1), avg_sentence_length (words), evidence_per_100_words, repeated_phrases (up to 5 actual repeated phrases from the text), dominant_topics (up to 5).
signal_findings: 4 findings, each with a short title and a 2-3 sentence analytical body referencing the text.
rewrites: 3 line-level revisions — original line taken verbatim from the input, a revised version, and a one-sentence rationale grounded in the metrics.

If a section is empty, state that in the relevant observation and score conservatively.

HEADLINE:
${headline || "(empty)"}

ABOUT:
${about || "(empty)"}

RECENT POSTS:
${posts || "(empty)"}`;
}