import { useEffect, useRef } from 'react';
import { useRecognition } from '../hooks/useRecognition';
import type { FaceFrameSnapshot, RecognitionOverlay } from '../hooks/useFaceDetection';
import type { FaceQualityResult } from '../services/face-quality.service';

type Props = {
  primaryTrackId: number | null;
  multipleFaces: boolean;
  captureTrackFrame: (trackId: number) => FaceFrameSnapshot | null;
  isTrackActive: (trackId: number) => boolean;
  quality: FaceQualityResult | null;
  onOverlayChange: (trackId: number, value: Omit<RecognitionOverlay, 'expiresAt'> | null) => void;
};

export function RecognitionPanel({ primaryTrackId, multipleFaces, captureTrackFrame, isTrackActive, quality, onOverlayChange }: Props) {
  const recognition = useRecognition(captureTrackFrame, isTrackActive);
  const { clearResult, search } = recognition;
  const trackIdRef = useRef(primaryTrackId);
  trackIdRef.current = primaryTrackId;
  const canRecognize = recognition.modelStatus === 'ready' && recognition.people.length > 0 && quality?.status === 'GOOD' && primaryTrackId !== null && !multipleFaces;
  const resultBelongsToTrack = recognition.resultTrackId !== null && recognition.resultTrackId === primaryTrackId;
  const matchedCandidate = resultBelongsToTrack && recognition.result?.status === 'MATCH' ? recognition.result.candidate : null;

  useEffect(() => {
    if (!canRecognize) {
      clearResult();
      return undefined;
    }
    const run = () => { void search(trackIdRef.current); };
    run();
    const timer = window.setInterval(run, 1500);
    return () => window.clearInterval(timer);
  }, [canRecognize, clearResult, search]);

  useEffect(() => {
    if (primaryTrackId === null) return undefined;
    if (!canRecognize) onOverlayChange(primaryTrackId, null);
    else if (recognition.isSearching && !resultBelongsToTrack) onOverlayChange(primaryTrackId, { text: 'RECOGNIZING…', status: 'searching' });
    else if (matchedCandidate) onOverlayChange(primaryTrackId, { text: matchedCandidate.name, status: 'match' });
    else if (resultBelongsToTrack && recognition.result) onOverlayChange(primaryTrackId, { text: 'UNKNOWN', status: 'unknown' });
    return () => onOverlayChange(primaryTrackId, null);
  }, [canRecognize, matchedCandidate, onOverlayChange, primaryTrackId, recognition.isSearching, recognition.result, resultBelongsToTrack]);

  return (
    <section className="recognition-panel">
      <div className="embedding-heading">
        <div><p className="eyebrow">API RECOGNITION</p><h2>Identify face</h2></div>
        <div className={`result-badge ${recognition.result?.status.toLowerCase() ?? recognition.modelStatus}`}>
          {recognition.result?.status ?? recognition.modelStatus.toUpperCase()}
        </div>
      </div>

      <div className={`candidate-card ${recognition.result?.status.toLowerCase() ?? ''}`}>
        <span>{recognition.people.length} registered people</span>
        <strong>{multipleFaces ? 'MULTIPLE FACES' : matchedCandidate?.name ?? (resultBelongsToTrack && recognition.result ? 'UNKNOWN' : 'Waiting for face')}</strong>
        <small>{matchedCandidate ? `ID · ${matchedCandidate.personId}` : recognition.people.length === 0 ? 'Enroll a person first' : multipleFaces ? 'Keep only one person in view' : 'Center one GOOD face in the camera'}</small>
      </div>
      {recognition.error && <p className="enrollment-feedback failed">{recognition.error}</p>}
    </section>
  );
}
