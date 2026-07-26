/**
 * Deterministic semantic scoring — vector space, no model.
 *
 * Message Consistency and Topical Focus used to be scored by an LLM, which drifted
 * (the same cached corpus produced 45/65 on one run and 95/85 on the next). Both are
 * now computed arithmetically from the text, so the same input always yields the same
 * number, byte for byte.
 *
 * Representation: each text unit (headline, About, every individual post) becomes an
 * L2-normalized tf-idf vector over content words. Similarity is cosine.
 *   message_consistency = mean pairwise cosine between the three SURFACES,
 *                         scaled by how many surfaces actually carry text
 *   topical_focus       = concentration of all units around the corpus centroid,
 *                         combined with the entropy of their cluster distribution
 */

import { STOPWORDS, stripUrls, stripHashtags, tokenize } from './textMetrics.ts';

export const SEMANTIC_METHOD = 'vector-space-v1';

/** Calibration constants — explicit so the scores are auditable. */
const CONSISTENCY_TARGET_COS = 0.22; // mean surface-to-surface cosine that scores 100
const FOCUS_TARGET_COS = 0.30;       // mean unit-to-centroid cosine that scores 100
const CLUSTER_THRESHOLD = 0.18;      // cosine at which two units count as the same topic
const FOCUS_CENTROID_WEIGHT = 0.6;   // remainder is carried by the cluster-entropy term

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round2 = (n) => Math.round(n * 100) / 100;
const rampUp = (value, target) => clamp((value / target) * 100);

/** Spelled-out numerals and bare quantity words carry no topic, so they are dropped. */
const NON_TOPIC = new Set(
  ('one,two,three,four,five,six,seven,eight,nine,ten,hundred,thousand,million,billion,first,second,third,next,last,many,much,new,good,great,thing,things,way,ways,time,times,year,years,day,days,people,make,made,get,got,see,saw,know,think,want,need,like,lot,really,going,use,used,using').split(',')
);

function contentTerms(text) {
  return tokenize(stripHashtags(stripUrls(text)))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !NON_TOPIC.has(t) && !/^\d/.test(t));
}

function termCounts(text) {
  const counts = new Map();
  for (const t of contentTerms(text)) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

/** Splits the posts blob back into the individual posts the scraper joined. */
export function splitPosts(posts) {
  return String(posts || '')
    .split(/\n\n---\n\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * L2-normalized term vectors. idf is applied only when there are enough units for document
 * frequency to be meaningful: across three surfaces it would penalise exactly the shared
 * vocabulary that consistency is supposed to reward, so surface comparison uses plain tf.
 */
function buildVectors(docs, useIdf = true) {
  const counts = docs.map(termCounts);
  const df = new Map();
  for (const c of counts) for (const term of c.keys()) df.set(term, (df.get(term) || 0) + 1);

  return counts.map((c) => {
    const vec = new Map();
    let norm = 0;
    for (const [term, n] of c) {
      // Smoothed idf; a term present in every unit still keeps a small positive weight,
      // otherwise a two-unit corpus would collapse to the zero vector.
      const idf = useIdf ? Math.max(Math.log((docs.length + 1) / ((df.get(term) || 0) + 0.5)), 0.05) : 1;
      const w = (1 + Math.log(n)) * idf;
      vec.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of vec) vec.set(term, w / norm);
    return vec;
  });
}

function cosine(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) {
    const other = large.get(term);
    if (other) dot += w * other;
  }
  return dot;
}

function centroid(vectors) {
  const sum = new Map();
  for (const v of vectors) for (const [term, w] of v) sum.set(term, (sum.get(term) || 0) + w);
  let norm = 0;
  for (const w of sum.values()) norm += w * w;
  norm = Math.sqrt(norm) || 1;
  for (const [term, w] of sum) sum.set(term, w / norm);
  return sum;
}

/** Greedy single-pass clustering — deterministic because unit order is deterministic. */
function clusterSizes(vectors) {
  const heads = [];
  const sizes = [];
  for (const v of vectors) {
    let best = -1;
    let bestSim = CLUSTER_THRESHOLD;
    for (let i = 0; i < heads.length; i++) {
      const sim = cosine(v, heads[i]);
      if (sim >= bestSim) { bestSim = sim; best = i; }
    }
    if (best === -1) { heads.push(v); sizes.push(1); } else { sizes[best] += 1; }
  }
  return sizes;
}

function normalizedEntropy(sizes) {
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total === 0 || sizes.length <= 1) return 0;
  let h = 0;
  for (const s of sizes) {
    const p = s / total;
    h -= p * Math.log(p);
  }
  return h / Math.log(sizes.length);
}

/** Highest-weight terms of the corpus centroid — the measured dominant topics. */
function topTerms(centroidVec, limit) {
  return [...centroidVec.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

/**
 * Returns the two semantic scores, their observations, the measured dominant topics,
 * and the surface inventory the narrative layer must be grounded in.
 */
export function computeSemanticScores({ headline = '', about = '', posts = '' }) {
  const postList = splitPosts(posts);
  const surfaces = [
    { key: 'headline', label: 'headline', text: headline },
    { key: 'about', label: 'About section', text: about },
    { key: 'posts', label: 'posts', text: posts },
  ];
  const present = surfaces.filter((s) => contentTerms(s.text).length > 0);

  const unitTexts = [headline, about, ...postList].filter((t) => contentTerms(t).length > 0);
  const inventory = {
    headline_chars: headline.trim().length,
    about_chars: about.trim().length,
    posts_count: postList.length,
    present_surfaces: present.map((s) => s.label),
    absent_surfaces: surfaces.filter((s) => !present.includes(s)).map((s) => s.label),
  };

  // --- Message consistency: pairwise cosine between the surfaces themselves.
  let meanSurfaceCos = 0;
  if (present.length >= 2) {
    const vectors = buildVectors(present.map((s) => s.text), false);
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) { sum += cosine(vectors[i], vectors[j]); pairs++; }
    }
    meanSurfaceCos = pairs ? sum / pairs : 0;
  }
  // A surface with no text cannot restate the claim, so coverage caps the score.
  const coverage = present.length / surfaces.length;
  const message_consistency = present.length < 2
    ? Math.round(clamp(present.length * 5))
    : Math.round(clamp(rampUp(meanSurfaceCos, CONSISTENCY_TARGET_COS) * coverage));

  // --- Topical focus: concentration of every unit around the corpus centroid,
  //     plus how few distinct topic clusters those units form.
  let meanCentroidCos = 0;
  let clusters = [];
  if (unitTexts.length >= 2) {
    const vectors = buildVectors(unitTexts);
    const c = centroid(vectors);
    meanCentroidCos = vectors.reduce((sum, v) => sum + cosine(v, c), 0) / vectors.length;
    clusters = clusterSizes(vectors);
  }
  const entropyTerm = unitTexts.length >= 2 ? (1 - normalizedEntropy(clusters)) * 100 : 0;
  const topical_focus = unitTexts.length < 2
    ? Math.round(clamp(unitTexts.length * 5))
    : Math.round(clamp(
        FOCUS_CENTROID_WEIGHT * rampUp(meanCentroidCos, FOCUS_TARGET_COS) +
        (1 - FOCUS_CENTROID_WEIGHT) * entropyTerm
      ));

  const dominant_topics = unitTexts.length
    ? topTerms(centroid(buildVectors(unitTexts)), 5)
    : [];

  return {
    scores: { message_consistency, topical_focus },
    dominant_topics,
    inventory,
    stats: {
      mean_surface_cosine: round2(meanSurfaceCos),
      mean_centroid_cosine: round2(meanCentroidCos),
      topic_clusters: clusters.length,
      scored_units: unitTexts.length,
    },
    observations: {
      message_consistency:
        present.length < 2
          ? `Only ${present.length} surface carries text (${inventory.present_surfaces.join(', ') || 'none'}), so no cross-surface claim can be measured.`
          : `Mean surface-to-surface cosine ${round2(meanSurfaceCos)} across ${present.length} populated surfaces (${inventory.present_surfaces.join(', ')}). Calibration: 0.22 mean cosine on all three surfaces scores 100.`,
      topical_focus:
        unitTexts.length < 2
          ? `Only ${unitTexts.length} text unit available, which is insufficient to establish topic concentration.`
          : `${unitTexts.length} text units resolve into ${clusters.length} topic clusters, mean cosine to the corpus centroid ${round2(meanCentroidCos)}. Calibration: 0.30 mean centroid cosine in a single cluster scores 100.`,
    },
  };
}