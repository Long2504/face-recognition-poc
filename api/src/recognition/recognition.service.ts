import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { RECOGNITION_CONFIG } from './recognition.config';
import type { RecognitionCandidate, RecognitionResult, PersonRecord } from './recognition.types';

export type PersonSummary = {
  id: string;
  name: string;
  sampleCount: number;
  representativeReady: boolean;
  createdAt: string;
};

@Injectable()
export class RecognitionService {
  private readonly people = new Map<string, PersonRecord>();

  createPerson(id: string, name: string): PersonSummary {
    const cleanId = id.trim();
    if (this.people.has(cleanId)) throw new ConflictException(`Person ID "${cleanId}" already exists`);
    const person: PersonRecord = {
      id: cleanId,
      name: name.trim(),
      embeddings: [],
      representativeEmbedding: null,
      createdAt: new Date().toISOString(),
    };
    this.people.set(cleanId, person);
    return this.toSummary(person);
  }

  addEmbedding(personId: string, input: number[]): PersonSummary {
    const person = this.people.get(personId);
    if (!person) throw new NotFoundException(`Person ID "${personId}" was not found`);
    if (person.embeddings.length >= RECOGNITION_CONFIG.maximumSamplesPerPerson) {
      throw new UnprocessableEntityException(`A person can contain at most ${RECOGNITION_CONFIG.maximumSamplesPerPerson} samples`);
    }
    const embedding = this.normalize(input);
    person.embeddings.push(embedding);
    person.representativeEmbedding = this.createRepresentative(person.embeddings);
    return this.toSummary(person);
  }

  listPeople(): PersonSummary[] {
    return [...this.people.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((person) => this.toSummary(person));
  }

  search(queryInput: number[], topK: number, minimumSimilarity: number, minimumMargin: number): RecognitionResult {
    const startedAt = performance.now();
    const query = this.normalize(queryInput);
    const shortlist = [...this.people.values()]
      .filter((person): person is PersonRecord & { representativeEmbedding: number[] } => person.representativeEmbedding !== null && person.embeddings.length > 0)
      .map((person) => ({ person, representativeScore: this.cosineSimilarity(query, person.representativeEmbedding) }))
      .sort((a, b) => b.representativeScore - a.representativeScore)
      .slice(0, topK);

    const topCandidates: RecognitionCandidate[] = shortlist
      .map(({ person, representativeScore }) => {
        const sampleScore = person.embeddings.reduce(
          (best, sample) => Math.max(best, this.cosineSimilarity(query, sample)),
          -1,
        );
        return { personId: person.id, name: person.name, representativeScore, sampleScore, score: sampleScore };
      })
      .sort((a, b) => b.score - a.score);

    const top1 = topCandidates[0] ?? null;
    const top2 = topCandidates[1] ?? null;
    const scoreDifference = top1 && top2 ? top1.score - top2.score : null;
    const passesSimilarity = top1 !== null && top1.score >= minimumSimilarity;
    const passesMargin = top2 === null || (scoreDifference !== null && scoreDifference >= minimumMargin);
    const status = passesSimilarity && passesMargin ? 'MATCH' : 'UNKNOWN';

    return {
      status,
      candidate: status === 'MATCH' ? top1 : null,
      topCandidates,
      top1Score: top1?.score ?? null,
      top2Score: top2?.score ?? null,
      scoreDifference,
      searchMs: performance.now() - startedAt,
      searchSource: 'MEMORY',
    };
  }

  private normalize(values: number[]): number[] {
    const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(magnitude) || magnitude <= Number.EPSILON) {
      throw new UnprocessableEntityException('Embedding must have a non-zero finite magnitude');
    }
    return values.map((value) => value / magnitude);
  }

  private createRepresentative(samples: number[][]): number[] {
    const mean = Array.from({ length: RECOGNITION_CONFIG.embeddingDimensions }, (_, index) =>
      samples.reduce((sum, sample) => sum + sample[index], 0) / samples.length,
    );
    return this.normalize(mean);
  }

  private cosineSimilarity(left: number[], right: number[]): number {
    return left.reduce((sum, value, index) => sum + value * right[index], 0);
  }

  private toSummary(person: PersonRecord): PersonSummary {
    return {
      id: person.id,
      name: person.name,
      sampleCount: person.embeddings.length,
      representativeReady: person.representativeEmbedding !== null,
      createdAt: person.createdAt,
    };
  }
}
