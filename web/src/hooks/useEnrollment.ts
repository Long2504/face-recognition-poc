import { useCallback, useEffect, useState } from 'react';
import type { FaceFrameSnapshot } from './useFaceDetection';
import { faceEmbedder } from '../services/face-embedder';
import { enrollPerson, listPeople, type ApiPerson } from '../services/recognition-api';

const REQUIRED_SAMPLES = 5;
type ModelStatus = 'loading' | 'ready' | 'error';

export function useEnrollment(captureTrackFrame: (trackId: number) => FaceFrameSnapshot | null) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(faceEmbedder.isLoaded() ? 'ready' : 'loading');
  const [samples, setSamples] = useState<Float32Array[]>([]);
  const [people, setPeople] = useState<ApiPerson[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inferenceMs, setInferenceMs] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshPeople = useCallback(async () => {
    try {
      setPeople(await listPeople());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read enrolled people.');
    }
  }, []);

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
        setError(reason instanceof Error ? reason.message : 'Could not initialize enrollment.');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const capture = useCallback(async (trackId: number | null) => {
    if (trackId === null || modelStatus !== 'ready' || samples.length >= REQUIRED_SAMPLES) return;
    const frame = captureTrackFrame(trackId);
    if (!frame) return;
    setIsCapturing(true);
    setError('');
    setMessage('');
    try {
      const result = await faceEmbedder.embed(frame.source, frame.face);
      setSamples((current) => [...current, result.embedding]);
      setInferenceMs(result.inferenceMs);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not capture face sample.');
    } finally {
      setIsCapturing(false);
    }
  }, [captureTrackFrame, modelStatus, samples.length]);

  const save = useCallback(async (id: string, name: string) => {
    const cleanId = id.trim();
    const cleanName = name.trim();
    if (!cleanId || !cleanName || samples.length !== REQUIRED_SAMPLES) return false;
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await enrollPerson(cleanId, cleanName, samples);
      await refreshPeople();
      setSamples([]);
      setInferenceMs(0);
      setMessage(`${cleanName} enrolled on API with ${REQUIRED_SAMPLES} samples.`);
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
