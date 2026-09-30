import { describe, expect, it } from 'vitest';
import { normalizeEmbedding } from './embedding-math';
import type { StoredPerson } from './person.repository';
import { recognitionService } from './recognition.service';
import { createRepresentativeEmbedding } from './representative-embedding';

function vector(...values: number[]): Float32Array {
  return normalizeEmbedding(Float32Array.from(values));
}

function person(id: string, representative: Float32Array, samples: Float32Array[]): StoredPerson {
  return { id, name: `Person ${id}`, representativeEmbedding: representative, embeddings: samples, createdAt: '2026-01-01T00:00:00.000Z' };
}

const thresholds = { minimumSimilarity: 0.45, minimumMargin: 0.08, topK: 5 };

describe('LocalRecognitionService', () => {
  it('matches the strongest separated candidate', () => {
    const result = recognitionService.search(vector(1, 0), [
      person('A', vector(1, 0), [vector(1, 0), vector(0.98, 0.1)]),
      person('B', vector(0, 1), [vector(0, 1)]),
    ], thresholds);

    expect(result.status).toBe('MATCH');
    expect(result.candidate?.personId).toBe('A');
    expect(result.top1Score).toBeCloseTo(1, 5);
    expect(result.scoreDifference).toBeGreaterThan(0.9);
  });

  it('returns UNKNOWN below the similarity threshold', () => {
    const result = recognitionService.search(vector(1, 1), [
      person('A', vector(1, 0), [vector(1, 0)]),
    ], { ...thresholds, minimumSimilarity: 0.8 });
    expect(result.status).toBe('UNKNOWN');
    expect(result.candidate).toBeNull();
  });

  it('returns UNKNOWN when top candidates are too close', () => {
    const result = recognitionService.search(vector(1, 0), [
      person('A', vector(1, 0), [vector(1, 0)]),
      person('B', vector(0.99, 0.05), [vector(0.99, 0.05)]),
    ], thresholds);
    expect(result.status).toBe('UNKNOWN');
    expect(result.scoreDifference).toBeLessThan(thresholds.minimumMargin);
  });

  it('reranks the representative shortlist using sample scores', () => {
    const result = recognitionService.search(vector(1, 0), [
      person('A', vector(1, 0), [vector(0.7, 0.7)]),
      person('B', vector(0.9, 0.3), [vector(1, 0)]),
    ], { ...thresholds, minimumMargin: 0 });
    expect(result.topCandidates[0].personId).toBe('B');
  });
});

describe('createRepresentativeEmbedding', () => {
  it('averages normalized samples and normalizes the mean', () => {
    const representative = createRepresentativeEmbedding([vector(1, 0), vector(0, 1)]);
    expect(representative[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(representative[1]).toBeCloseTo(Math.SQRT1_2, 5);
  });
});
