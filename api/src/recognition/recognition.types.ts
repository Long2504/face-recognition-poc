export type PersonRecord = {
  id: string;
  name: string;
  embeddings: number[][];
  representativeEmbedding: number[] | null;
  createdAt: string;
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
  searchSource: 'MEMORY';
};
