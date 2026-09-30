import { useCallback, useEffect, useState, type RefObject } from 'react';
import { RECOGNITION_CONFIG } from '../config/face.config';
import type { FaceBox } from '../services/face-detector';
import { faceEmbedder } from '../services/face-embedder';
import { personRepository, type StoredPerson } from '../services/person.repository';
import {
  recognitionService,
  type RecognitionResult,
  type RecognitionThresholds,
} from '../services/recognition.service';

type ModelStatus = 'loading' | 'ready' | 'error';

export function useRecognition(videoRef: RefObject<HTMLVideoElement | null>) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(faceEmbedder.isLoaded() ? 'ready' : 'loading');
  const [people, setPeople] = useState<StoredPerson[]>([]);
  const [thresholds, setThresholds] = useState<RecognitionThresholds>({ ...RECOGNITION_CONFIG });
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [embeddingMs, setEmbeddingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([faceEmbedder.load(), personRepository.list()]).then(([, storedPeople]) => {
      if (!cancelled) {
        setModelStatus('ready');
        setPeople(storedPeople);
      }
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setModelStatus('error');
        setError(reason instanceof Error ? reason.message : 'Could not initialize recognition.');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const search = useCallback(async (face: FaceBox | null) => {
    const video = videoRef.current;
    if (!video || !face || modelStatus !== 'ready' || people.length === 0) return;
    setIsSearching(true);
    setError('');
    const startedAt = performance.now();
    try {
      const embedding = await faceEmbedder.embed(video, face);
      const searchResult = recognitionService.search(embedding.embedding, people, thresholds);
      setEmbeddingMs(embedding.inferenceMs);
      setResult(searchResult);
      setTotalMs(performance.now() - startedAt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Recognition failed.');
    } finally {
      setIsSearching(false);
    }
  }, [modelStatus, people, thresholds, videoRef]);

  const setMinimumSimilarity = useCallback((value: number) => {
    if (Number.isFinite(value)) setThresholds((current) => ({ ...current, minimumSimilarity: Math.max(-1, Math.min(1, value)) }));
  }, []);
  const setMinimumMargin = useCallback((value: number) => {
    if (Number.isFinite(value)) setThresholds((current) => ({ ...current, minimumMargin: Math.max(0, Math.min(1, value)) }));
  }, []);

  return {
    modelStatus,
    people,
    thresholds,
    result,
    embeddingMs,
    totalMs,
    isSearching,
    error,
    search,
    setMinimumSimilarity,
    setMinimumMargin,
  };
}
