import { normalizeEmbedding } from './embedding-math';

export function createRepresentativeEmbedding(embeddings: Float32Array[]): Float32Array {
  if (embeddings.length === 0) throw new Error('At least one embedding is required.');
  const dimensions = embeddings[0].length;
  if (dimensions === 0 || embeddings.some((embedding) => embedding.length !== dimensions)) {
    throw new Error('All embeddings must have the same non-zero dimension.');
  }

  const mean = new Float32Array(dimensions);
  for (const embedding of embeddings) {
    for (let index = 0; index < dimensions; index += 1) mean[index] += embedding[index] / embeddings.length;
  }
  return normalizeEmbedding(mean);
}
