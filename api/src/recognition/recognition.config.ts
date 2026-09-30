export const RECOGNITION_CONFIG = {
  embeddingDimensions: 512,
  maximumSamplesPerPerson: 20,
  defaultTopK: 5,
  maximumTopK: 20,
  minimumSimilarity: 0.45,
  minimumMargin: 0.08,
} as const;
