/**
 * Deterministic, text-derived metrics. No model involved.
 * Same input -> byte-identical output, always.
 * All calibration constants are explicit and versioned via ENGINE_VERSION.
 */

export const ENGINE_VERSION = "2.1.0-deterministic";

/** Removes URLs before any metric is computed — they are not language. */
export function stripUrls(text) {
  return text
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\b[a-z0-9-]+\.(?:com|net|org|io|co|ai|me|ly|in)\/\S*/gi, " ");
}

/** Removes hashtag runs (used for repetition analysis only). */
export function stripHashtags(text) {
  return text.replace(/#[\p{L}\p{N}_]+/gu, " ");
}

const STOPWORDS = new Set(
  ("a,about,above,after,all,also,am,an,and,any,are,as,at,be,because,been,before,being,but,by,can,could,did,do,does,doing,down,during,each,few,for,from,further,had,has,have,having,he,her,here,hers,him,his,how,i,if,in,into,is,it,its,itself,just,me,more,most,my,no,nor,not,now,of,off,on,once,only,or,other,our,ours,out,over,own,same,she,should,so,some,such,than,that,the,their,theirs,them,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,you,your,yours").split(",")
);

/** Generic LinkedIn register. Frequency of these depresses distinctiveness. */
const BOILERPLATE = [
  "passionate", "passion", "results-driven", "results driven", "thought leader", "thought leadership",
  "seasoned", "proven track record", "dynamic", "synergy", "leverage", "leveraging", "game changer",
  "game-changer", "cutting edge", "cutting-edge", "best in class", "best-in-class", "world class",
  "world-class", "value add", "value-add", "self-starter", "team player", "go-getter", "hustle",
  "guru", "ninja", "rockstar", "visionary", "disruptive", "disrupting", "innovative", "innovation",
  "excited to share", "thrilled to announce", "humbled", "honored", "grateful", "journey",
  "next level", "empower", "empowering", "unlock", "unlocking", "transformative", "holistic",
  "strategic thinker", "detail oriented", "detail-oriented", "driven professional", "storyteller",
  "helping companies", "helping businesses", "on a mission", "obsessed with", "love what i do",
];

/** Filler / hedging register. Counts against redundancy control. */
const FILLER = [
  "very", "really", "actually", "basically", "literally", "truly", "simply", "just",
  "a lot of", "kind of", "sort of", "in order to", "at the end of the day", "needless to say",
  "it goes without saying", "as you know", "that being said", "in my opinion",
];

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/** Maps a raw rate onto 0-100 against an explicit target rate (target -> 100). */
const rampUp = (rate, target) => clamp((rate / target) * 100);
/** Inverse ramp: 0 -> 100, tolerance -> 0. */
const rampDown = (rate, tolerance) => clamp(100 - (rate / tolerance) * 100);

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-zà-ÿ][a-zà-ÿ'’\-]*|\d+(?:[.,]\d+)?%?/g) || []);
}

export function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/**
 * Moving-Average Type-Token Ratio (window 50) — length-independent, unlike raw TTR.
 * Falls back to raw TTR for texts shorter than one window.
 */
export function mattr(tokens, window = 50) {
  if (tokens.length === 0) return 0;
  if (tokens.length <= window) return new Set(tokens).size / tokens.length;
  let sum = 0;
  for (let i = 0; i + window <= tokens.length; i++) {
    sum += new Set(tokens.slice(i, i + window)).size / window;
  }
  return sum / (tokens.length - window + 1);
}

/** Quantified-claim markers: numerals, percentages, currency, multipliers, scale words. */
export function countEvidenceMarkers(text) {
  const patterns = [
    /\b\d+(?:[.,]\d+)?\s?%/g,                      // 40%
    /[$€£₪]\s?\d+(?:[.,]\d+)?\s?(?:k|m|bn|b)?/gi,  // $2M
    /\b\d+(?:[.,]\d+)?\s?(?:x|×)\b/gi,             // 3x
    /\b\d+(?:[.,]\d+)?\s?(?:k|m|bn)\b/gi,          // 250k
    /\b(?:19|20)\d{2}\b/g,                         // years
    /\b\d+(?:[.,]\d+)?\s?(?:users|customers|clients|employees|people|companies|teams|hours|days|weeks|months|years|countries|markets|deals|leads|arr|mrr|revenue|points|bps)\b/gi,
    /\b(?:increased|decreased|reduced|grew|scaled|cut|raised|shipped|launched|led|built|delivered)\b(?=[^.!?]*\d)/gi,
    /\b\d+(?:[.,]\d+)?\b/g,                        // bare numerals
  ];
  // Collect all matches, then count only non-overlapping spans (longest match wins)
  // so that "40%" is one marker and not two ("40%" + "40").
  const matches = [];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) matches.push([m.index, m.index + m[0].length]);
  }
  matches.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let count = 0;
  let coveredTo = -1;
  for (const [start, end] of matches) {
    if (start >= coveredTo) { count++; coveredTo = end; }
  }
  return count;
}

function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

/** Share of trigrams that are not first occurrences, plus the repeated surface forms. */
export function repetitionProfile(tokens) {
  const grams = ngrams(tokens, 3);
  if (grams.length === 0) return { repeat_rate: 0, repeated_phrases: [] };
  const counts = new Map();
  for (const g of grams) counts.set(g, (counts.get(g) || 0) + 1);
  let repeated = 0;
  for (const c of counts.values()) if (c > 1) repeated += c - 1;
  const repeated_phrases = [...counts.entries()]
    .filter(([g, c]) => c > 1 && g.split(" ").some((w) => !STOPWORDS.has(w)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([g]) => g);
  return { repeat_rate: repeated / grams.length, repeated_phrases };
}

function phraseHits(text, phrases) {
  const hay = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const hits = [];
  let total = 0;
  for (const p of phrases) {
    const re = new RegExp(`(?<![a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "g");
    const n = (hay.match(re) || []).length;
    if (n > 0) { total += n; hits.push(p); }
  }
  return { total, hits };
}

/** Content-word frequency table, stopwords removed. */
export function contentFrequencies(tokens) {
  const counts = new Map();
  for (const t of tokens) {
    if (STOPWORDS.has(t) || t.length < 3 || /^\d/.test(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Computes the three deterministic metrics + the raw lexical statistics.
 * Calibration (explicit, so results are auditable):
 *   evidence_density        6.5 markers / 100 words  -> 100
 *   lexical_distinctiveness MATTR 0.75 -> 100 ; each boilerplate hit / 100 words costs 12 pts
 *   redundancy              trigram repeat rate 0.15 -> 0 ; filler 3 / 100 words -> -30
 */
export function computeDeterministicMetrics({ headline = "", about = "", posts = "" }) {
  const text = stripUrls([headline, about, posts].filter(Boolean).join("\n\n"));
  const tokens = tokenize(text);
  const wordCount = tokens.filter((t) => !/^\d/.test(t)).length || 1;
  const sents = sentences(text);
  const per100 = (n) => (n / wordCount) * 100;

  const ttr = mattr(tokens);
  const evidence = countEvidenceMarkers(text);
  const evidencePer100 = per100(evidence);
  const { repeat_rate, repeated_phrases } = repetitionProfile(tokenize(stripHashtags(text)));
  const boiler = phraseHits(text, BOILERPLATE);
  const filler = phraseHits(text, FILLER);
  const boilerPer100 = per100(boiler.total);
  const fillerPer100 = per100(filler.total);

  const evidence_density = Math.round(rampUp(evidencePer100, 6.5));
  const lexical_distinctiveness = Math.round(
    clamp(rampUp(ttr, 0.75) - boilerPer100 * 12)
  );
  const redundancy = Math.round(
    clamp(rampDown(repeat_rate, 0.15) - Math.min(30, (fillerPer100 / 3) * 30))
  );

  return {
    scores: { evidence_density, lexical_distinctiveness, redundancy },
    stats: {
      word_count: wordCount,
      type_token_ratio: round2(ttr),
      avg_sentence_length: round1(wordCount / (sents.length || 1)),
      evidence_marker_count: evidence,
      evidence_per_100_words: round1(evidencePer100),
      trigram_repeat_rate: round2(repeat_rate),
      repeated_phrases,
      boilerplate_hits: boiler.hits.slice(0, 8),
      boilerplate_per_100_words: round1(boilerPer100),
      filler_per_100_words: round1(fillerPer100),
      top_content_words: contentFrequencies(tokens).slice(0, 12).map(([w, c]) => `${w} (${c})`),
    },
  };
}