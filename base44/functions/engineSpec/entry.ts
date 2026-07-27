import { ENGINE_VERSION, CALIBRATION } from '../../shared/textMetrics.ts';
import { WEIGHTS } from '../../shared/linguisticEngine.ts';
import { SEMANTIC_METHOD } from '../../shared/semanticScoring.ts';
import { MAX_POSTS } from '../../shared/apifyLinkedin.ts';

/**
 * Publishes the live engine constants so the methodology page documents the engine
 * that is actually running, rather than a copy of it.
 */
export default async function (_req) {
  return Response.json({
    engine_version: ENGINE_VERSION,
    semantic_method: SEMANTIC_METHOD,
    weights: WEIGHTS,
    calibration: CALIBRATION,
    max_posts: MAX_POSTS,
    limited_corpus: { posts: 10, words: 500 },
  });
}