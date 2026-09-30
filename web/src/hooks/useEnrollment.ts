import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { FaceBox } from '../services/face-detector';
import { faceEmbedder } from '../services/face-embedder';
import { personRepository, type StoredPerson } from '../services/person.repository';
import { createRepresentativeEmbedding } from '../services/representative-embedding';

const REQUIRED_SAMPLES = 5;
type ModelStatus = 'loading' | 'ready' | 'error';

export function useEnrollment(videoRef: RefObject<HTMLVideoElement | null>) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(faceEmbedder.isLoaded() ? 'ready' : 'loading');
  const [samples, setSamples] = useState<Float32Array[]>([]);
  const [people, setPeople] = useState<StoredPerson[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inferenceMs, setInferenceMs] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshPeople = useCallback(async () => {
    try {
      setPeople(await personRepository.list());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read enrolled people.');
    }
  }, []);

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
        setError(reason instanceof Error ? reason.message : 'Could not initialize enrollment.');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const capture = useCallback(async (face: FaceBox | null) => {
    const video = videoRef.current;
    if (!video || !face || modelStatus !== 'ready' || samples.length >= REQUIRED_SAMPLES) return;
    setIsCapturing(true);
    setError('');
    setMessage('');
    try {
      const result = await faceEmbedder.embed(video, face);
      setSamples((current) => [...current, result.embedding]);
      setInferenceMs(result.inferenceMs);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not capture face sample.');
    } finally {
      setIsCapturing(false);
    }
  }, [modelStatus, samples.length, videoRef]);

  const save = useCallback(async (id: string, name: string) => {
    const cleanId = id.trim();
    const cleanName = name.trim();
    if (!cleanId || !cleanName || samples.length !== REQUIRED_SAMPLES) return false;
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await personRepository.add({
        id: cleanId,
        name: cleanName,
        embeddings: samples,
        representativeEmbedding: createRepresentativeEmbedding(samples),
        createdAt: new Date().toISOString(),
      });
      await refreshPeople();
      setSamples([]);
      setInferenceMs(0);
      setMessage(`${cleanName} enrolled with ${REQUIRED_SAMPLES} samples.`);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save person.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [refreshPeople, samples]);

  const resetSamples = useCallback(() => {
    setSamples([]);
    setInferenceMs(0);
    setMessage('');
    setError('');
  }, []);

  return {
    requiredSamples: REQUIRED_SAMPLES,
    modelStatus,
    samples,
    people,
    isCapturing,
    isSaving,
    inferenceMs,
    message,
    error,
    capture,
    save,
    resetSamples,
  };
}
