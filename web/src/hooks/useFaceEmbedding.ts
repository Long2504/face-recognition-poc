import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { FaceBox } from '../services/face-detector';
import { cosineSimilarity, faceEmbedder } from '../services/face-embedder';

export type CaptureSlot = 'A1' | 'A2' | 'B1';
type ModelStatus = 'loading' | 'ready' | 'error';
type CapturedEmbedding = { embedding: Float32Array; capturedAt: string };

export function useFaceEmbedding(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<ModelStatus>(faceEmbedder.isLoaded() ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [busySlot, setBusySlot] = useState<CaptureSlot | null>(null);
  const [captures, setCaptures] = useState<Partial<Record<CaptureSlot, CapturedEmbedding>>>({});
  const [inferenceMs, setInferenceMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void faceEmbedder.load().then(() => {
      if (!cancelled) setStatus('ready');
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'Could not load embedding model.');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const capture = useCallback(async (slot: CaptureSlot, face: FaceBox | null) => {
    const video = videoRef.current;
    if (!video || !face || status !== 'ready') return;
    setBusySlot(slot);
    setError('');
    try {
      const result = await faceEmbedder.embed(video, face);
      setCaptures((current) => ({
        ...current,
        [slot]: { embedding: result.embedding, capturedAt: new Date().toLocaleTimeString() },
      }));
      setInferenceMs(result.inferenceMs);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not capture embedding.');
    } finally {
      setBusySlot(null);
    }
  }, [status, videoRef]);

  const similarities = useMemo(() => ({
    samePerson: captures.A1 && captures.A2 ? cosineSimilarity(captures.A1.embedding, captures.A2.embedding) : null,
    differentPerson: captures.A1 && captures.B1 ? cosineSimilarity(captures.A1.embedding, captures.B1.embedding) : null,
  }), [captures]);

  const clear = useCallback(() => {
    setCaptures({});
    setInferenceMs(0);
    setError('');
  }, []);

  return { status, error, busySlot, captures, inferenceMs, similarities, capture, clear };
}
