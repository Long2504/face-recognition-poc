import { useState, type RefObject } from 'react';
import { useEnrollment } from '../hooks/useEnrollment';
import type { FaceBox } from '../services/face-detector';
import type { FaceQualityResult } from '../services/face-quality.service';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  face: FaceBox | null;
  quality: FaceQualityResult | null;
};

export function EnrollmentPanel({ videoRef, face, quality }: Props) {
  const enrollment = useEnrollment(videoRef);
  const [personId, setPersonId] = useState('');
  const [name, setName] = useState('');
  const canCapture = enrollment.modelStatus === 'ready' && quality?.status === 'GOOD' && face !== null && enrollment.samples.length < enrollment.requiredSamples;
  const canSave = personId.trim() !== '' && name.trim() !== '' && enrollment.samples.length === enrollment.requiredSamples;

  const save = async () => {
    if (await enrollment.save(personId, name)) {
      setPersonId('');
      setName('');
    }
  };

  return (
    <section className="enrollment-panel">
      <div className="embedding-heading">
        <div><p className="eyebrow">LOCAL ENROLLMENT</p><h2>Register person</h2></div>
        <div className={`model-badge ${enrollment.modelStatus}`}>{enrollment.modelStatus.toUpperCase()}</div>
      </div>

      <div className="person-form">
        <label><span>Person ID</span><input value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="P001" maxLength={64} /></label>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Văn A" maxLength={100} /></label>
      </div>

      <div className="sample-progress">
        {Array.from({ length: enrollment.requiredSamples }, (_, index) => (
          <div className={index < enrollment.samples.length ? 'complete' : ''} key={index}>
            <strong>{index + 1}</strong><span>{index < enrollment.samples.length ? 'READY' : 'EMPTY'}</span>
          </div>
        ))}
      </div>

      <div className="enrollment-actions">
        <button className="capture-sample" type="button" onClick={() => void enrollment.capture(face)} disabled={!canCapture || enrollment.isCapturing}>
          {enrollment.isCapturing ? 'Capturing…' : enrollment.samples.length >= enrollment.requiredSamples ? '5 samples ready' : `Capture sample ${enrollment.samples.length + 1}`}
        </button>
        <button className="secondary" type="button" onClick={enrollment.resetSamples} disabled={enrollment.samples.length === 0}>Reset</button>
      </div>

      <div className="representative-card">
        <div><span>Representative</span><strong>{enrollment.samples.length === enrollment.requiredSamples ? 'READY · 512D' : `${enrollment.samples.length} / ${enrollment.requiredSamples} SAMPLES`}</strong></div>
        <div><span>Last embedding</span><strong>{enrollment.inferenceMs ? `${enrollment.inferenceMs.toFixed(1)} ms` : '—'}</strong></div>
      </div>

      <button className="save-person" type="button" disabled={!canSave || enrollment.isSaving} onClick={() => void save()}>
        {enrollment.isSaving ? 'Saving…' : 'Save person to API'}
      </button>

      <div className="registry-summary">
        <label><span>Registered people · {enrollment.people.length}</span>
          <select disabled={enrollment.people.length === 0} defaultValue="">
            <option value="">{enrollment.people.length ? 'Select to inspect' : 'No registered people'}</option>
            {enrollment.people.map((person) => <option value={person.id} key={person.id}>{person.id} · {person.name} · {person.sampleCount} samples</option>)}
          </select>
        </label>
      </div>

      <p className={`enrollment-feedback ${enrollment.error ? 'failed' : ''}`}>
        {enrollment.error || enrollment.message || (quality?.status === 'GOOD' ? 'Face is ready for capture.' : 'Center one GOOD face to capture.')}
      </p>
    </section>
  );
}
