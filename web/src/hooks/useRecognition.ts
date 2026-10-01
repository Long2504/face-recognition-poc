import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceFrameSnapshot } from './useFaceDetection';
import { RECOGNITION_CONFIG } from '../config/face.config';
import { faceEmbedder } from '../services/face-embedder';
import { listPeople, searchRecognition, type ApiPerson } from '../services/recognition-api';
import {
  type RecognitionResult,
  type RecognitionThresholds,
} from '../services/recognition.service';

type ModelStatus = 'loading' | 'ready' | 'error';

export function useRecognition(
  captureTrackFrame: (trackId: number) => FaceFrameSnapshot | null,
  isTrackActive: (trackId: number) => boolean,
) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(faceEmbedder.isLoaded() ? 'ready' : 'loading');
  const [people, setPeople] = useState<ApiPerson[]>([]);
  const [thresholds, setThresholds] = useState<RecognitionThresholds>({ ...RECOGNITION_CONFIG });
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [resultTrackId, setResultTrackId] = useState<number | null>(null);
  const [embeddingMs, setEmbeddingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const searchingRef = useRef(false);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([faceEmbedder.load(), listPeople()]).then(([, storedPeople]) => {
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

  const search = useCallback(async (trackId: number | null) => {
    if (trackId === null || modelStatus !== 'ready' || people.length === 0 || searchingRef.current) return;
    const frame = captureTrackFrame(trackId);
    if (!frame) return;
    const requestSequence = ++requestSequenceRef.current;
    searchingRef.current = true;
    setIsSearching(true);
    setError('');
    const startedAt = performance.now();
    try {
      const embedding = await faceEmbedder.embed(frame.source, frame.face);
      const searchResult = await searchRecognition(embedding.embedding, thresholds);
      if (requestSequence !== requestSequenceRef.current || !isTrackActive(trackId)) return;
      setEmbeddingMs(embedding.inferenceMs);
      setResult(searchResult);
      setResultTrackId(trackId);
      setTotalMs(performance.now() - startedAt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Recognition failed.');
    } finally {
      searchingRef.current = false;
      setIsSearching(false);
    }
  }, [captureTrackFrame, isTrackActive, modelStatus, people, thresholds]);

  const clearResult = useCallback(() => {
    requestSequenceRef.current += 1;
    setResult(null);
    setResultTrackId(null);
    setEmbeddingMs(0);
    setTotalMs(0);
    setError('');
  }, []);

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
    resultTrackId,
    embeddingMs,
    totalMs,
    isSearching,
    error,
    search,
    clearResult,
    setMinimumSimilarity,
    setMinimumMargin,
  };
}
