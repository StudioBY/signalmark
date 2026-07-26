import { computeDeterministicMetrics, ENGINE_VERSION } from './textMetrics.ts';
import { semanticCacheKey } from './semanticCache.ts';

export { ENGINE_VERSION };

/** Absolute law. Composite is computed in JS from these weights, never by the model. */
export const WEIGHTS = {
  message_consistency: 0.25,
  evidence_density: 0.25,
  topical_focus: 0.2,
  lexical_distinctiveness: 0.2,
  redundancy: 0.1,
};

const LABELS = {
  message_consistency: 'Message Consistency',
  evidence_density: 'Evidence Density',
  topical_focus: 'Topical Focus',
  lexical_distinctiveness: 'Lexical Distinctiveness',
  redundancy: 'Redundancy Control',
};

const ORDER = [
  'message_consistency',
  'evidence_density',
  'topical_focus',
  'lexical_distinctiveness',
  'redundancy',
];

/** The model is restricted to semantics only: two scores, plus prose about measured facts. */
const SEMANTIC_SCHEMA = {
  type: 'object',
  properties: {
    message_consistency: { type: 'number' },
    message_consistency_observation: { type: 'string' },
    topical_focus: { type: 'number' },
    topical_focus_observation: { type: 'string' },
    dominant_topics: { type: 'array', items: { type: 'string' } },
    verdict_title: { type: 'string' },
    verdict_summary: { type: 'string' },
    signal_findings: {
      type: 'array',
      items: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } } },
    },
    rewrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          revised: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
  },
  required: ['message_consistency', 'topical_focus'],
};

function semanticPrompt({ headline, about, posts }, deterministic) {
  const d = deterministic;
  return `You are the semantic layer of a computational-linguistics scoring engine. Operate deterministically: apply the rubrics literally, in the same way every time, with no stylistic variation, no creativity and no marketing register. Prose must be cold, factual and in English.

You score EXACTLY TWO metrics. Do not score anything else — the other three metrics are already computed arithmetically and are given to you as fixed facts.

METRIC A — message_consistency (integer 0-100)
Measure the semantic overlap of the positioning claim across the three surfaces (headline, About, posts).
Rubric, applied literally:
  90-100 identical core claim (same audience, same offer, same domain) restated on all three surfaces
  70-89  same domain and audience on all surfaces; offer wording varies
  50-69  two surfaces align, the third diverges in audience or domain
  30-49  a single recurring theme, but the claimed role/offer differs across surfaces
  10-29  no recurring positioning claim; surfaces read as unrelated
  0-9    one or more surfaces empty, or no identifiable claim anywhere
Score 0-9 for any surface that is empty and state that in the observation.

METRIC B — topical_focus (integer 0-100)
Measure topic concentration across the full corpus.
Rubric, applied literally:
  90-100 one dominant subject domain accounts for nearly all content
  70-89  one dominant domain plus one adjacent secondary domain
  50-69  two or three distinct domains with roughly comparable weight
  30-49  four or more distinct domains, no dominant one
  10-29  topically scattered; consecutive passages share no subject
  0-9    insufficient text to establish a topic

dominant_topics: up to 5 noun-phrase topics, ordered by measured prominence, taken from the text.

Each observation: one or two sentences, citing concrete wording from the text. No advice, no praise.

verdict_title: max 8 words, factual, no hype. Example register: "Consistent positioning, thin quantified evidence".
verdict_summary: exactly 2 sentences stating what the score set means. Reference the measured statistics below, not intuition.

signal_findings: exactly 4 findings (short title + 2-3 analytical sentences). Ground each finding in the MEASURED STATISTICS below or in verbatim text. Never invent a number: only cite figures present in those statistics.

rewrites: exactly 3 line-level revisions. "original" MUST be a verbatim line from the input text. "revised" must raise a named metric. "rationale": one sentence naming which metric it raises and why.

MEASURED STATISTICS (already computed deterministically — treat as ground truth):
  word count: ${d.stats.word_count}
  moving-average type-token ratio: ${d.stats.type_token_ratio}
  mean sentence length: ${d.stats.avg_sentence_length} words
  evidence markers: ${d.stats.evidence_marker_count} (${d.stats.evidence_per_100_words} per 100 words)
  trigram repeat rate: ${d.stats.trigram_repeat_rate}
  repeated phrases: ${d.stats.repeated_phrases.join(' | ') || 'none'}
  boilerplate hits: ${d.stats.boilerplate_hits.join(' | ') || 'none'} (${d.stats.boilerplate_per_100_words} per 100 words)
  filler markers per 100 words: ${d.stats.filler_per_100_words}
  top content words: ${d.stats.top_content_words.join(', ') || 'none'}
  computed scores — evidence_density: ${d.scores.evidence_density}, lexical_distinctiveness: ${d.scores.lexical_distinctiveness}, redundancy: ${d.scores.redundancy}

HEADLINE:
${headline || '(empty)'}

ABOUT:
${about || '(empty)'}

RECENT POSTS:
${posts || '(empty)'}`;
}

const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Runs the full engine: deterministic metrics in JS, two semantic metrics via the model,
 * composite computed arithmetically from WEIGHTS.
 */
export async function runEngine(extracted, invokeLLM, cache = null) {
  const deterministic = computeDeterministicMetrics(extracted);

  // Semantic layer: served from the text-hash cache when the same text was scored
  // under the same engine version, so those two metrics never drift.
  const cacheKey = cache ? await semanticCacheKey(ENGINE_VERSION, extracted) : null;
  let semantic = cacheKey ? await cache.get(cacheKey) : null;

  if (!semantic) {
    semantic = await invokeLLM({
      prompt: semanticPrompt(extracted, deterministic),
      response_json_schema: SEMANTIC_SCHEMA,
      temperature: 0,
    });
    if (cacheKey) await cache.set(cacheKey, ENGINE_VERSION, semantic);
  }

  const scores = {
    message_consistency: clampScore(semantic.message_consistency),
    topical_focus: clampScore(semantic.topical_focus),
    evidence_density: clampScore(deterministic.scores.evidence_density),
    lexical_distinctiveness: clampScore(deterministic.scores.lexical_distinctiveness),
    redundancy: clampScore(deterministic.scores.redundancy),
  };

  // Composite: arithmetic only. The model never touches this number.
  const overall_score = Math.round(
    ORDER.reduce((sum, key) => sum + scores[key] * WEIGHTS[key], 0)
  );

  const observations = {
    message_consistency: semantic.message_consistency_observation || '',
    topical_focus: semantic.topical_focus_observation || '',
    evidence_density: `${deterministic.stats.evidence_marker_count} quantified markers across ${deterministic.stats.word_count} words (${deterministic.stats.evidence_per_100_words} per 100). Calibration: 4.0 per 100 words scores 100.`,
    lexical_distinctiveness: `Type-token ratio ${deterministic.stats.type_token_ratio}; ${deterministic.stats.boilerplate_per_100_words} boilerplate markers per 100 words${deterministic.stats.boilerplate_hits.length ? ` (${deterministic.stats.boilerplate_hits.slice(0, 3).join(', ')})` : ''}.`,
    redundancy: `Trigram repeat rate ${deterministic.stats.trigram_repeat_rate}; ${deterministic.stats.filler_per_100_words} filler markers per 100 words.`,
  };

  return {
    engine_version: ENGINE_VERSION,
    overall_score,
    verdict_title: semantic.verdict_title || '',
    verdict_summary: semantic.verdict_summary || '',
    metrics: ORDER.map((key) => ({
      key,
      label: LABELS[key],
      score: scores[key],
      weight: WEIGHTS[key],
      method: key === 'message_consistency' || key === 'topical_focus' ? 'semantic' : 'deterministic',
      observation: observations[key],
    })),
    lexical_stats: {
      ...deterministic.stats,
      dominant_topics: semantic.dominant_topics || [],
    },
    signal_findings: semantic.signal_findings || [],
    rewrites: semantic.rewrites || [],
  };
}