/**
 * Deterministic, text-derived metrics. No model involved.
 * Same input -> byte-identical output, always.
 * All calibration constants are explicit and versioned via ENGINE_VERSION.
 */

export const ENGINE_VERSION = "3.1.0-deterministic";

/**
 * The calibration constants of the three lexical metrics, in one auditable place.
 * These are the live values the formulas below read: the published methodology page
 * renders this object, so the documentation can never drift from the engine.
 */
export const CALIBRATION = {
  /** evidence markers per 100 words that scores 100 */
  evidence_target_per_100_words: 6.5,
  /** moving-average type-token ratio that scores 100 */
  mattr_target: 0.75,
  /** points deducted per boilerplate marker per 100 words */
  boilerplate_penalty_per_100_words: 12,
  /** trigram repeat rate at which redundancy control scores 0 */
  repeat_rate_tolerance: 0.15,
  /** filler markers per 100 words that incur the full filler penalty */
  filler_penalty_rate: 3,
  /** maximum points deducted for filler */
  filler_max_penalty: 30,
};

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

/**
 * The cleaned corpus the metrics are computed on: URLs and hashtag runs removed.
 * Anything downstream that describes the text (the semantic layer) must read this,
 * never the raw scrape — otherwise findings can quote a stripped URL.
 */
export function cleanSurfaces({ headline = "", about = "", posts = "" }) {
  const clean = (t) => stripHashtags(stripUrls(t)).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { headline: clean(headline), about: clean(about), posts: clean(posts) };
}

export const STOPWORDS = new Set(
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

/**
 * Display-only tokenizer. Unlike `tokenize` (which feeds the metrics and must not change),
 * it keeps currency/number expressions such as "$15M", "10k" or "3.5%" as single tokens and
 * preserves their original casing, so repeated phrases read the way the author wrote them.
 */
const DISPLAY_TOKEN_RE = /[$€£₪]\s?\d[\d.,]*\s?(?:k|m|bn|b|x)?|\d[\d.,]*\s?(?:%|k|m|bn|b|x)?|[a-zà-ÿ][a-zà-ÿ'’\-]*/gi;

function displayTokens(text) {
  return [...text.matchAll(DISPLAY_TOKEN_RE)].map((m) => {
    const raw = m[0].replace(/\s+/g, "");
    return { raw, norm: raw.toLowerCase() };
  });
}

/**
 * Repeated phrases for display: overlapping repeated n-grams are merged into the single
 * longest phrase they form ("a 15 m" + "15 m business" -> "a $15M business"). This is an
 * extraction/presentation concern only — `repetitionProfile` still drives the score.
 */
export function mergedRepeatedPhrases(text, n = 3, limit = 5) {
  const toks = displayTokens(stripHashtags(text));
  const norms = toks.map((t) => t.norm);
  const counts = new Map();
  for (let i = 0; i + n <= norms.length; i++) {
    const g = norms.slice(i, i + n).join(" ");
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  const repeated = new Set(
    [...counts.entries()]
      .filter(([g, c]) => c > 1 && g.split(" ").some((w) => !STOPWORDS.has(w)))
      .map(([g]) => g)
  );

  const phrases = new Map();
  let i = 0;
  while (i + n <= norms.length) {
    if (!repeated.has(norms.slice(i, i + n).join(" "))) { i++; continue; }
    let end = i + n; // exclusive
    while (end < norms.length && repeated.has(norms.slice(end - n + 1, end + 1).join(" "))) end++;
    const key = norms.slice(i, end).join(" ");
    if (!phrases.has(key)) phrases.set(key, toks.slice(i, end).map((t) => t.raw).join(" "));
    i = end - n + 1;
  }
  return [...phrases.values()].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, limit);
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
  const { repeat_rate } = repetitionProfile(tokenize(stripHashtags(text)));
  const repeated_phrases = mergedRepeatedPhrases(text);
  const boiler = phraseHits(text, BOILERPLATE);
  const filler = phraseHits(text, FILLER);
  const boilerPer100 = per100(boiler.total);
  const fillerPer100 = per100(filler.total);

  const C = CALIBRATION;
  const evidence_density = Math.round(rampUp(evidencePer100, C.evidence_target_per_100_words));
  const lexical_distinctiveness = Math.round(
    clamp(rampUp(ttr, C.mattr_target) - boilerPer100 * C.boilerplate_penalty_per_100_words)
  );
  const redundancy = Math.round(
    clamp(
      rampDown(repeat_rate, C.repeat_rate_tolerance) -
        Math.min(C.filler_max_penalty, (fillerPer100 / C.filler_penalty_rate) * C.filler_max_penalty)
    )
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