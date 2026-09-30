import type { RefObject } from 'react';
import { FACE_EMBEDDING_CONFIG } from '../config/face.config';
import { useFaceEmbedding, type CaptureSlot } from '../hooks/useFaceEmbedding';
import type { FaceBox } from '../services/face-detector';
import type { FaceQualityResult } from '../services/face-quality.service';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  face: FaceBox | null;
  quality: FaceQualityResult | null;
};

const CAPTURE_LABELS: Record<CaptureSlot, string> = {
  A1: 'Person A · Sample 1',
  A2: 'Person A · Sample 2',
  B1: 'Person B · Sample 1',
};

function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(4);
}

export function EmbeddingLab({ videoRef, face, quality }: Props) {
  const embedding = useFaceEmbedding(videoRef);
  const canCapture = embedding.status === 'ready' && quality?.status === 'GOOD' && face !== null;

  return (
    <section className="embedding-lab">
      <div className="embedding-heading">
        <div><p className="eyebrow">FACE EMBEDDING</p><h2>Capture samples</h2></div>
        <div className={`model-badge ${embedding.status}`}>
          {embedding.status.toUpperCase()}
        </div>
      </div>

      <div className="capture-grid">
        {(Object.keys(CAPTURE_LABELS) as CaptureSlot[]).map((slot) => {
          const captured = embedding.captures[slot];
          return (
            <article className={`capture-card ${captured ? 'captured' : ''}`} key={slot}>
              <span className="capture-code">{slot}</span>
              <h3>{CAPTURE_LABELS[slot].replace('Person ', '').replace(' · Sample ', ' / ')}</h3>
              <p>{captured ? `${FACE_EMBEDDING_CONFIG.dimensions}D · ${captured.capturedAt}` : 'Not captured'}</p>
              <button
                type="button"
                onClick={() => void embedding.capture(slot, face)}
                disabled={!canCapture || embedding.busySlot !== null}
              >
                {embedding.busySlot === slot ? 'Capturing…' : captured ? 'Capture again' : `Capture ${slot}`}
              </button>
            </article>
          );
        })}
      </div>

      <div className="similarity-panel">
        <div><span>A1 ↔ A2 · SAME</span><strong>{formatScore(embedding.similarities.samePerson)}</strong></div>
        <div><span>A1 ↔ B1 · DIFFERENT</span><strong>{formatScore(embedding.similarities.differentPerson)}</strong></div>
      </div>

      <div className="embedding-note">
        <p>{embedding.inferenceMs ? `${embedding.inferenceMs.toFixed(1)} ms · 512D · L2 normalized` : quality?.status === 'GOOD' ? 'Ready to capture' : 'Waiting for GOOD face'}</p>
        <button type="button" className="text-button" onClick={embedding.clear} disabled={Object.keys(embedding.captures).length === 0}>Clear captures</button>
      </div>
      {embedding.error && <p className="error" role="alert">Embedding: {embedding.error}</p>}
    </section>
  );
}
