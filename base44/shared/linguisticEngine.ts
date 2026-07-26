import { computeDeterministicMetrics, cleanSurfaces, ENGINE_VERSION } from './textMetrics.ts';
import { computeSemanticScores, SEMANTIC_METHOD } from './semanticScoring.ts';
import { semanticCacheKey } from './semanticCache.ts';
import { stripEmDashesDeep } from './noEmDash.ts';

export { ENGINE_VERSION };

/** Absolute law. Composite is computed in JS from these weights, never by the model. */
export const WEIGHTS = {
  message_consistency: 0.30,
  evidence_density: 0.25,
  topical_focus: 0.20,
  lexical_distinctiveness: 0.15,
  redundancy: 0.10,
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

/**
 * The model no longer scores anything. All five metrics are computed arithmetically;
 * the model only writes prose about numbers it is handed as ground truth.
 */
const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
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
  required: ['verdict_title', 'verdict_summary'],
};

function narrativePrompt({ headline, about, posts }, d, sem, scores, composite) {
  const inv = sem.inventory;
  return `You are the narrative layer of a computational-linguistics scoring engine. Every number below has already been computed arithmetically and is FINAL. You do not score anything. You describe. Operate deterministically: apply the rules literally, with no creativity, no marketing register and no stylistic variation. Write cold, factual English prose.

SURFACE INVENTORY (ground truth, established by direct measurement of the corpus):
  headline: ${inv.headline_chars > 0 ? `PRESENT, ${inv.headline_chars} characters` : 'ABSENT (empty)'}
  About section: ${inv.about_chars > 0 ? `PRESENT, ${inv.about_chars} characters` : 'ABSENT (empty)'}
  posts: ${inv.posts_count > 0 ? `PRESENT, ${inv.posts_count} posts` : 'ABSENT (none)'}
FACTUAL LAW: you may state that a surface is empty ONLY if it is marked ABSENT above. Any surface marked PRESENT contains text that is reproduced in full below, and describing it as empty, missing or thin-to-the-point-of-absent is a factual error.

FINAL SCORES (do not restate them as anything other than these values):
  message consistency ${scores.message_consistency} (deterministic, ${SEMANTIC_METHOD}: mean leave-one-out surface cosine ${sem.stats.mean_surface_cosine} over ${inv.present_surfaces.length} populated surfaces)
  evidence density ${scores.evidence_density} (deterministic)
  topical focus ${scores.topical_focus} (deterministic, ${SEMANTIC_METHOD}: ${sem.stats.scored_units} text units in ${sem.stats.topic_clusters} topic clusters, largest cluster ${sem.stats.largest_cluster} units, mean centroid cosine ${sem.stats.mean_centroid_cosine})
  lexical distinctiveness ${scores.lexical_distinctiveness} (deterministic)
  redundancy control ${scores.redundancy} (deterministic)
  composite ${composite}

MEASURED STATISTICS (ground truth):
  word count: ${d.stats.word_count}
  moving-average type-token ratio: ${d.stats.type_token_ratio}
  mean sentence length: ${d.stats.avg_sentence_length} words
  evidence markers: ${d.stats.evidence_marker_count} (${d.stats.evidence_per_100_words} per 100 words)
  trigram repeat rate: ${d.stats.trigram_repeat_rate}
  repeated phrases: ${d.stats.repeated_phrases.join(' | ') || 'none'}
  boilerplate hits: ${d.stats.boilerplate_hits.join(' | ') || 'none'} (${d.stats.boilerplate_per_100_words} per 100 words)
  filler markers per 100 words: ${d.stats.filler_per_100_words}
  top content words: ${d.stats.top_content_words.join(', ') || 'none'}
  measured dominant topics: ${sem.dominant_topics.join(', ') || 'none'}

METRIC POLARITY DEFINITIONS, every description must agree with the direction of the metric it discusses. A description that contradicts the number is an error:
  message_consistency (higher = the same positioning claim recurs across surfaces; lower = surfaces diverge)
  evidence_density (higher = MORE quantified markers per 100 words; lower = thin quantified evidence)
  topical_focus (higher = topics concentrated in one domain; lower = topically scattered)
  lexical_distinctiveness (higher = varied, specific vocabulary with LITTLE generic boilerplate; lower = generic register)
  redundancy, displayed as "Redundancy Control" (higher = LESS repetition: a LOW trigram repeat rate and few filler markers, i.e. efficient compression; lower = MORE repetition)
Titles are held to the same polarity check as bodies: a title may not contain a qualifier that contradicts the score. The redundancy finding's title must be exactly "Redundancy Control", with no added qualifier.

TYPOGRAPHIC LAW, never use an em dash or an en dash in ANY text you produce. Restructure with a comma, colon, period or parentheses instead. Regular hyphens inside compound words ("type-token ratio") are correct and must be kept.

PRODUCE:
verdict_title: max 8 words, factual, no hype. Register example: "Consistent positioning, thin quantified evidence".
verdict_summary: exactly 2 sentences stating what this score set means, referencing the measured statistics above.
signal_findings: exactly 4 findings (short title + 2 to 3 analytical sentences). Ground every finding in the statistics above or in verbatim text below. Never invent a number. Never quote a URL or web address: URLs and hashtags have already been removed from the corpus below.
rewrites: exactly 3 line-level revisions. "original" MUST be a verbatim line from the text below. "revised" must raise a named metric. "rationale": one sentence naming the metric it raises and why.

HEADLINE:
${headline || '(empty)'}

ABOUT:
${about || '(empty)'}

RECENT POSTS:
${posts || '(empty)'}`;
}

const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Runs the full engine. Every score is deterministic JS: identical input text under the
 * same engine version always produces an identical score set. The model contributes prose
 * only, and that prose is itself cached on a hash of the text + engine version.
 */
export async function runEngine(extracted, invokeLLM, cache = null) {
  const deterministic = computeDeterministicMetrics(extracted);
  // Both the semantic scorer and the narrative layer read the same cleaned corpus
  // the deterministic metrics were computed on.
  const cleaned = cleanSurfaces(extracted);
  const semantic = computeSemanticScores(cleaned);

  const scores = {
    message_consistency: clampScore(semantic.scores.message_consistency),
    topical_focus: clampScore(semantic.scores.topical_focus),
    evidence_density: clampScore(deterministic.scores.evidence_density),
    lexical_distinctiveness: clampScore(deterministic.scores.lexical_distinctiveness),
    redundancy: clampScore(deterministic.scores.redundancy),
  };

  // Composite: arithmetic only. The model never touches this number.
  const overall_score = Math.round(
    ORDER.reduce((sum, key) => sum + scores[key] * WEIGHTS[key], 0)
  );

  const cacheKey = cache ? await semanticCacheKey(ENGINE_VERSION, extracted, scores) : null;
  let narrative = cacheKey ? await cache.get(cacheKey) : null;

  if (!narrative) {
    narrative = await invokeLLM({
      prompt: narrativePrompt(cleaned, deterministic, semantic, scores, overall_score),
      response_json_schema: NARRATIVE_SCHEMA,
      temperature: 0,
    });
    if (cacheKey) await cache.set(cacheKey, ENGINE_VERSION, narrative);
  }

  const observations = {
    message_consistency: semantic.observations.message_consistency,
    topical_focus: semantic.observations.topical_focus,
    evidence_density: `${deterministic.stats.evidence_marker_count} quantified markers across ${deterministic.stats.word_count} words (${deterministic.stats.evidence_per_100_words} per 100). Calibration: 6.5 per 100 words scores 100.`,
    lexical_distinctiveness: `Type-token ratio ${deterministic.stats.type_token_ratio}; ${deterministic.stats.boilerplate_per_100_words} boilerplate markers per 100 words${deterministic.stats.boilerplate_hits.length ? ` (${deterministic.stats.boilerplate_hits.slice(0, 3).join(', ')})` : ''}.`,
    redundancy: `Trigram repeat rate ${deterministic.stats.trigram_repeat_rate}; ${deterministic.stats.filler_per_100_words} filler markers per 100 words.`,
  };

  // Post-processing pass: no em dash survives into storage, display, PDF or email.
  return stripEmDashesDeep({
    engine_version: ENGINE_VERSION,
    overall_score,
    verdict_title: narrative.verdict_title || '',
    verdict_summary: narrative.verdict_summary || '',
    metrics: ORDER.map((key) => ({
      key,
      label: LABELS[key],
      score: scores[key],
      weight: WEIGHTS[key],
      method: 'deterministic',
      observation: observations[key],
    })),
    lexical_stats: {
      ...deterministic.stats,
      dominant_topics: semantic.dominant_topics,
    },
    signal_findings: narrative.signal_findings || [],
    rewrites: narrative.rewrites || [],
  });
}