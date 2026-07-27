/**
 * Deterministic semantic scoring — vector space, no model.
 *
 * v2 calibration. v1 was reproducible but did not discriminate: every unit became its
 * own cluster (so the cluster term subtracted a near-constant penalty from everyone) and
 * consistency rewarded shared vocabulary rather than a shared message.
 *
 * Three changes:
 *   1. Tokens are stemmed, so build / building / builds count as the same term.
 *   2. Clustering runs on plain tf vectors with a shared-top-terms rule, so a corpus of
 *      posts on one theme collapses into few clusters while a scattered corpus does not.
 *   3. Message consistency compares each surface to the centroid of the OTHER surfaces
 *      (leave-one-out), so it measures whether the same claim recurs, not whether the
 *      same words do. A surface with no text is penalised through squared coverage.
 */

import { STOPWORDS, stripUrls, stripHashtags, tokenize, corpusCoverage } from './textMetrics.ts';

export const SEMANTIC_METHOD = 'vector-space-v2';

/** Calibration constants — explicit so the scores are auditable. */
const CONSISTENCY_TARGET_COS = 0.25; // mean leave-one-out surface cosine that scores 100
const FOCUS_TARGET_COS = 0.60;       // mean unit-to-centroid cosine that scores 100
const FOCUS_CENTROID_WEIGHT = 0.55;  // remainder is carried by cluster concentration
const CLUSTER_BASE_COS = 0.15;       // cosine at which a unit joins an existing cluster
const CLUSTER_TOP_TERMS = 8;         // size of the per-unit top-term signature
const CLUSTER_SHARED_TERMS = 2;      // shared signature terms that also merge a unit

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round2 = (n) => Math.round(n * 100) / 100;
const rampUp = (value, target) => clamp((value / target) * 100);

/** Spelled-out numerals and bare quantity words carry no topic, so they are dropped. */
const NON_TOPIC = new Set(
  ('one,two,three,four,five,six,seven,eight,nine,ten,hundred,thousand,million,billion,first,second,third,next,last,many,much,new,good,great,thing,things,way,ways,time,times,year,years,day,days,people,make,made,get,got,see,saw,know,think,want,need,like,lot,really,going,use,used,using').split(',')
);

/**
 * Light suffix stripping. Not linguistically complete, but deterministic and enough to
 * fold the inflections that matter here (plurals, -ing, -ed, adverbs).
 */
export function stem(word) {
  let s = word;
  if (s.length > 4 && s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.length > 4 && s.endsWith('sses')) return s.slice(0, -2);
  if (s.length > 3 && s.endsWith('s') && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  if (s.length > 4 && /(.)\1$/.test(s)) s = s.slice(0, -1);
  if (s.length > 4 && s.endsWith('e')) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith('ly')) s = s.slice(0, -2);
  return s;
}

function contentTerms(text) {
  return tokenize(stripHashtags(stripUrls(text)))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !NON_TOPIC.has(t) && !/^\d/.test(t))
    .map(stem)
    .filter((t) => t.length >= 3);
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
 * L2-normalized sublinear tf vectors. idf is deliberately not applied: it downweights
 * exactly the recurring theme terms that focus and consistency are meant to detect,
 * which is what made v1 clustering degenerate.
 */
function buildVectors(docs) {
  return docs.map((doc) => {
    const vec = new Map();
    let norm = 0;
    for (const [term, n] of termCounts(doc)) {
      const w = 1 + Math.log(n);
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

function topTerms(vec, limit) {
  return [...vec.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

/**
 * Greedy single-pass clustering against live cluster centroids. A unit joins a cluster
 * when it is close enough in cosine OR shares enough of its top-term signature — the
 * second rule is what lets short posts on a common theme merge, which raw cosine on a
 * handful of terms never achieves. Deterministic: unit order is deterministic.
 */
function clusterSizes(vectors) {
  const clusters = [];
  const signatures = vectors.map((v) => new Set(topTerms(v, CLUSTER_TOP_TERMS)));
  vectors.forEach((v, i) => {
    let best = -1;
    let bestScore = -1;
    clusters.forEach((c, ci) => {
      const cos = cosine(v, c.centroid);
      let shared = 0;
      for (const t of signatures[i]) if (c.terms.has(t)) shared++;
      if (shared >= CLUSTER_SHARED_TERMS || cos >= CLUSTER_BASE_COS) {
        const score = cos + shared * 0.05;
        if (score > bestScore) { bestScore = score; best = ci; }
      }
    });
    if (best === -1) {
      clusters.push({ vectors: [v], centroid: v, terms: new Set(signatures[i]) });
    } else {
      const c = clusters[best];
      c.vectors.push(v);
      c.centroid = centroid(c.vectors);
      for (const t of signatures[i]) c.terms.add(t);
    }
  });
  return clusters.map((c) => c.vectors.length);
}

/** 1 cluster over N units -> 100 ; every unit its own cluster -> 0. */
function clusterConcentration(clusterCount, unitCount) {
  if (unitCount <= 1) return 0;
  return clamp((1 - (clusterCount - 1) / (unitCount - 1)) * 100);
}

/**
 * Returns the two semantic scores, their observations, the measured dominant topics,
 * and the surface inventory the narrative layer must be grounded in.
 */
export function computeSemanticScores({ headline = '', about = '', posts = '' }) {
  const postList = splitPosts(posts);
  const surfaces = [
    { key: 'headline', label: 'headline', texts: [headline] },
    { key: 'about', label: 'About section', texts: [about] },
    { key: 'posts', label: 'posts', texts: postList },
  ].map((s) => ({ ...s, texts: s.texts.filter((t) => contentTerms(t).length > 0) }));

  const present = surfaces.filter((s) => s.texts.length > 0);
  const inventory = {
    headline_chars: headline.trim().length,
    about_chars: about.trim().length,
    posts_count: postList.length,
    present_surfaces: present.map((s) => s.label),
    absent_surfaces: surfaces.filter((s) => s.texts.length === 0).map((s) => s.label),
  };

  // Every unit of text in the corpus, tagged with the surface it came from.
  const units = [];
  for (const s of present) for (const t of s.texts) units.push({ surface: s.key, text: t });
  const vectors = buildVectors(units.map((u) => u.text));

  // --- Message consistency: each surface against the centroid of the OTHER surfaces.
  //     Shared vocabulary alone no longer scores; the claim has to recur.
  const looBySurface = {};
  const looValues = [];
  for (const s of present) {
    const own = vectors.filter((_, i) => units[i].surface === s.key);
    const rest = vectors.filter((_, i) => units[i].surface !== s.key);
    if (!rest.length || !own.length) continue;
    const restCentroid = centroid(rest);
    const value = own.reduce((sum, v) => sum + cosine(v, restCentroid), 0) / own.length;
    looBySurface[s.key] = round2(value);
    looValues.push(value);
  }
  const meanSurfaceCos = looValues.length
    ? looValues.reduce((a, b) => a + b, 0) / looValues.length
    : 0;
  // A missing surface cannot restate the claim. Squared coverage makes that expensive.
  const coverage = corpusCoverage(present.length);
  const message_consistency = present.length < 2
    ? Math.round(clamp(present.length * 5))
    : Math.round(clamp(rampUp(meanSurfaceCos, CONSISTENCY_TARGET_COS) * coverage));

  // --- Topical focus: concentration around the corpus centroid, plus how few
  //     distinct topic clusters the units form.
  let meanCentroidCos = 0;
  let clusters = [];
  let corpusCentroid = new Map();
  if (vectors.length >= 2) {
    corpusCentroid = centroid(vectors);
    meanCentroidCos = vectors.reduce((sum, v) => sum + cosine(v, corpusCentroid), 0) / vectors.length;
    clusters = clusterSizes(vectors);
  } else if (vectors.length === 1) {
    corpusCentroid = vectors[0];
  }
  const concentration = clusterConcentration(clusters.length, vectors.length);
  // Scaled by corpus coverage: a tiny corpus concentrates by construction.
  const topical_focus = vectors.length < 2
    ? Math.round(clamp(vectors.length * 5))
    : Math.round(clamp(
        (FOCUS_CENTROID_WEIGHT * rampUp(meanCentroidCos, FOCUS_TARGET_COS) +
          (1 - FOCUS_CENTROID_WEIGHT) * concentration) * coverage
      ));

  const dominant_topics = vectors.length ? topTerms(corpusCentroid, 5) : [];

  return {
    scores: { message_consistency, topical_focus },
    dominant_topics,
    inventory,
    stats: {
      mean_surface_cosine: round2(meanSurfaceCos),
      surface_cosines: looBySurface,
      mean_centroid_cosine: round2(meanCentroidCos),
      topic_clusters: clusters.length,
      largest_cluster: clusters.length ? Math.max(...clusters) : 0,
      scored_units: vectors.length,
    },
    observations: {
      message_consistency:
        present.length < 2
          ? `Only ${present.length} surface carries text (${inventory.present_surfaces.join(', ') || 'none'}), so no cross-surface claim can be measured.`
          : `Mean leave-one-out surface cosine ${round2(meanSurfaceCos)} across ${present.length} populated surfaces (${inventory.present_surfaces.join(', ')})${inventory.absent_surfaces.length ? `; ${inventory.absent_surfaces.join(' and ')} absent, coverage factor ${round2(coverage)}` : ''}. Calibration: 0.25 mean cosine on all three surfaces scores 100.`,
      topical_focus:
        vectors.length < 2
          ? `Only ${vectors.length} text unit available, which is insufficient to establish topic concentration.`
          : `${vectors.length} text units resolve into ${clusters.length} topic clusters (largest holds ${clusters.length ? Math.max(...clusters) : 0}), mean cosine to the corpus centroid ${round2(meanCentroidCos)}${coverage < 1 ? `, scaled by corpus coverage factor ${round2(coverage)}` : ''}. Calibration: 0.60 mean centroid cosine in a single cluster scores 100.`,
    },
  };
}