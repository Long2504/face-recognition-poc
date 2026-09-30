import { apiRequest } from './api';
import type { RecognitionResult, RecognitionThresholds } from './recognition.service';

export type ApiPerson = {
  id: string;
  name: string;
  sampleCount: number;
  representativeReady: boolean;
  createdAt: string;
};

export async function listPeople(): Promise<ApiPerson[]> {
  return apiRequest<ApiPerson[]>('/persons');
}

export async function enrollPerson(id: string, name: string, embeddings: Float32Array[]): Promise<ApiPerson> {
  await apiRequest<ApiPerson>('/persons', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  });
  let person: ApiPerson | null = null;
  for (const embedding of embeddings) {
    person = await apiRequest<ApiPerson>(`/persons/${encodeURIComponent(id)}/embeddings`, {
      method: 'POST',
      body: JSON.stringify({ embedding: Array.from(embedding) }),
    });
  }
  if (!person) throw new Error('At least one embedding is required.');
  return person;
}

export async function searchRecognition(
  embedding: Float32Array,
  thresholds: RecognitionThresholds,
): Promise<RecognitionResult> {
  return apiRequest<RecognitionResult>('/recognition/search', {
    method: 'POST',
    body: JSON.stringify({
      embedding: Array.from(embedding),
      topK: thresholds.topK,
      minimumSimilarity: thresholds.minimumSimilarity,
      minimumMargin: thresholds.minimumMargin,
    }),
  });
}
