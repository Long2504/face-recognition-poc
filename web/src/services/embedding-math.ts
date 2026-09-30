export function normalizeEmbedding(values: Float32Array): Float32Array {
  let sumSquared = 0;
  for (const value of values) sumSquared += value * value;
  const norm = Math.sqrt(sumSquared);
  if (!Number.isFinite(norm) || norm <= Number.EPSILON) throw new Error('Embedding norm is zero or invalid.');
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) normalized[index] = values[index] / norm;
  return normalized;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) throw new Error('Embeddings must have the same non-zero dimension.');
  let dotProduct = 0;
  for (let index = 0; index < a.length; index += 1) dotProduct += a[index] * b[index];
  return Math.max(-1, Math.min(1, dotProduct));
}
