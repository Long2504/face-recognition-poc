import type { RefObject } from 'react';
import { useRecognition } from '../hooks/useRecognition';
import type { FaceBox } from '../services/face-detector';
import type { FaceQualityResult } from '../services/face-quality.service';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  face: FaceBox | null;
  quality: FaceQualityResult | null;
};

function score(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(4);
}

export function RecognitionPanel({ videoRef, face, quality }: Props) {
  const recognition = useRecognition(videoRef);
  const canSearch = recognition.modelStatus === 'ready' && recognition.people.length > 0 && quality?.status === 'GOOD' && face !== null;
  const bestCandidate = recognition.result?.topCandidates[0] ?? null;

  return (
    <section className="recognition-panel">
      <div className="embedding-heading">
        <div><p className="eyebrow">LOCAL RECOGNITION</p><h2>Identify face</h2></div>
        <div className={`result-badge ${recognition.result?.status.toLowerCase() ?? recognition.modelStatus}`}>
          {recognition.result?.status ?? recognition.modelStatus.toUpperCase()}
        </div>
      </div>

      <div className="recognition-config">
        <label><span>Match threshold</span><input type="number" min="-1" max="1" step="0.01" value={recognition.thresholds.minimumSimilarity} onChange={(event) => recognition.setMinimumSimilarity(Number(event.target.value))} /></label>
        <label><span>Min difference</span><input type="number" min="0" max="1" step="0.01" value={recognition.thresholds.minimumMargin} onChange={(event) => recognition.setMinimumMargin(Number(event.target.value))} /></label>
        <div><span>Registry</span><strong>{recognition.people.length} PEOPLE</strong></div>
      </div>

      <button className="recognize-button" type="button" disabled={!canSearch || recognition.isSearching} onClick={() => void recognition.search(face)}>
        {recognition.isSearching ? 'Recognizing…' : recognition.people.length === 0 ? 'Enroll a person first' : quality?.status !== 'GOOD' ? 'Waiting for GOOD face' : 'Recognize current face'}
      </button>

      <div className={`candidate-card ${recognition.result?.status.toLowerCase() ?? ''}`}>
        <span>Best candidate</span>
        <strong>{bestCandidate ? bestCandidate.name : 'No result yet'}</strong>
        <small>{bestCandidate ? `${bestCandidate.personId} · representative ${score(bestCandidate.representativeScore)}` : 'Run recognition with one GOOD face'}</small>
      </div>

      <div className="recognition-scores">
        <div><span>Top 1</span><strong>{score(recognition.result?.top1Score)}</strong></div>
        <div><span>Top 2</span><strong>{score(recognition.result?.top2Score)}</strong></div>
        <div><span>Difference</span><strong>{score(recognition.result?.scoreDifference)}</strong></div>
      </div>

      <div className="recognition-timing">
        <span>Embedding {recognition.embeddingMs ? `${recognition.embeddingMs.toFixed(1)} ms` : '—'}</span>
        <span>Server search {recognition.result ? `${recognition.result.searchMs.toFixed(2)} ms` : '—'}</span>
        <span>Total {recognition.totalMs ? `${recognition.totalMs.toFixed(1)} ms` : '—'}</span>
      </div>
      {recognition.error && <p className="enrollment-feedback failed">{recognition.error}</p>}
    </section>
  );
}
