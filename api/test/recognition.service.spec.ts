import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RecognitionService } from '../src/recognition/recognition.service';

function vector(index: number, secondaryIndex?: number, secondaryValue = 0): number[] {
  const result = Array<number>(512).fill(0);
  result[index] = 1;
  if (secondaryIndex !== undefined) result[secondaryIndex] = secondaryValue;
  return result;
}

describe('RecognitionService', () => {
  let service: RecognitionService;

  beforeEach(() => { service = new RecognitionService(); });

  it('creates people, adds normalized samples, and lists summaries', () => {
    service.createPerson('P001', 'Long');
    const updated = service.addEmbedding('P001', vector(0));

    expect(updated).toMatchObject({ id: 'P001', name: 'Long', sampleCount: 1, representativeReady: true });
    expect(service.listPeople()).toHaveLength(1);
    expect(() => service.createPerson('P001', 'Duplicate')).toThrow(ConflictException);
  });

  it('rejects missing people and zero embeddings', () => {
    expect(() => service.addEmbedding('missing', vector(0))).toThrow(NotFoundException);
    service.createPerson('P001', 'Long');
    expect(() => service.addEmbedding('P001', Array<number>(512).fill(0))).toThrow(UnprocessableEntityException);
  });

  it('returns MATCH after representative shortlist and sample rerank', () => {
    service.createPerson('P001', 'Long');
    service.addEmbedding('P001', vector(0, 1, 0.1));
    service.addEmbedding('P001', vector(0, 2, 0.1));
    service.createPerson('P002', 'Person B');
    service.addEmbedding('P002', vector(1));

    const result = service.search(vector(0), 5, 0.45, 0.08);

    expect(result.status).toBe('MATCH');
    expect(result.candidate?.personId).toBe('P001');
    expect(result.topCandidates).toHaveLength(2);
    expect(result.searchSource).toBe('MEMORY');
  });

  it('returns UNKNOWN when the best score does not reach the threshold', () => {
    service.createPerson('P001', 'Long');
    service.addEmbedding('P001', vector(0));

    const result = service.search(vector(10), 5, 0.45, 0.08);

    expect(result.status).toBe('UNKNOWN');
    expect(result.candidate).toBeNull();
  });

  it('returns UNKNOWN when top candidates are too close', () => {
    service.createPerson('P001', 'Long');
    service.addEmbedding('P001', vector(0, 1, 0.05));
    service.createPerson('P002', 'Lookalike');
    service.addEmbedding('P002', vector(0, 2, 0.05));

    const result = service.search(vector(0), 5, 0.45, 0.08);

    expect(result.status).toBe('UNKNOWN');
    expect(result.scoreDifference).toBeCloseTo(0);
  });
});
