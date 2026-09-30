import { cosineSimilarity } from './embedding-math';
import type { StoredPerson } from './person.repository';

export type RecognitionThresholds = {
  minimumSimilarity: number;
  minimumMargin: number;
  topK: number;
};

export type RecognitionCandidate = {
  personId: string;
  name: string;
  representativeScore: number;
  sampleScore: number;
  score: number;
};

export type RecognitionResult = {
  status: 'MATCH' | 'UNKNOWN';
  candidate: RecognitionCandidate | null;
  topCandidates: RecognitionCandidate[];
  top1Score: number | null;
  top2Score: number | null;
  scoreDifference: number | null;
  searchMs: number;
  searchSource?: 'MEMORY';
};

export interface RecognitionService {
  search(query: Float32Array, people: StoredPerson[], thresholds: RecognitionThresholds): RecognitionResult;
}

class LocalRecognitionService implements RecognitionService {
  search(query: Float32Array, people: StoredPerson[], thresholds: RecognitionThresholds): RecognitionResult {
    const startedAt = performance.now();
    const shortlist = people
      .map((person) => ({ person, representativeScore: cosineSimilarity(query, person.representativeEmbedding) }))
      .sort((a, b) => b.representativeScore - a.representativeScore)
      .slice(0, Math.max(1, thresholds.topK));

    const topCandidates = shortlist
      .map(({ person, representativeScore }) => {
        const sampleScore = person.embeddings.reduce(
          (best, sample) => Math.max(best, cosineSimilarity(query, sample)),
          -1,
        );
        return {
          personId: person.id,
          name: person.name,
          representativeScore,
          sampleScore,
          score: sampleScore,
        };
      })
      .sort((a, b) => b.score - a.score);

    const top1 = topCandidates[0] ?? null;
    const top2 = topCandidates[1] ?? null;
    const scoreDifference = top1 && top2 ? top1.score - top2.score : null;
    const passesSimilarity = top1 !== null && top1.score >= thresholds.minimumSimilarity;
    const passesMargin = top2 === null || (scoreDifference !== null && scoreDifference >= thresholds.minimumMargin);
    const status = passesSimilarity && passesMargin ? 'MATCH' : 'UNKNOWN';

    return {
      status,
      candidate: status === 'MATCH' ? top1 : null,
      topCandidates,
      top1Score: top1?.score ?? null,
      top2Score: top2?.score ?? null,
      scoreDifference,
      searchMs: performance.now() - startedAt,
    };
  }
}

export const recognitionService: RecognitionService = new LocalRecognitionService();
