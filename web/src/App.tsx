import { useEffect, useState } from 'react';
import { EnrollmentPanel } from './components/EnrollmentPanel';
import { RecognitionPanel } from './components/RecognitionPanel';
import { useCamera } from './hooks/useCamera';
import { useFaceDetection } from './hooks/useFaceDetection';
import { type ApiStatus, checkApiHealth } from './services/api';

export function App() {
  const camera = useCamera();
  const detection = useFaceDetection(camera.videoRef, camera.isRunning);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [mode, setMode] = useState<'recognize' | 'enroll'>('recognize');

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then(() => setApiStatus('ok')).catch(() => setApiStatus('error'));
    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Face Lab home"><span className="brand-mark">F</span><span>FACE LAB</span></a>
        <div className="page-context"><strong>Recognition test</strong><span>Phase 06 · Local recognition</span></div>
        <div className={`api-pill ${apiStatus}`}><span /> API {apiStatus === 'ok' ? 'OK' : apiStatus === 'error' ? 'OFFLINE' : 'CHECKING'}</div>
      </header>

      <section className="dashboard">
        <div className="camera-stage">
          <div className="viewer">
          <video ref={camera.videoRef} muted playsInline aria-label="Camera preview" />
          <canvas ref={detection.overlayRef} className="detection-overlay" aria-label="Face detection overlay" />
          {!camera.isRunning && (
            <div className="empty-state">
              <div className="aperture" aria-hidden="true"><span /></div>
              <p>Camera đang tắt</p>
              <small>Bấm Start camera để bắt đầu</small>
            </div>
          )}
          <div className="viewer-tag">LOCAL ONNX · LIVE INPUT</div>
          {camera.isRunning && <div className="record-dot" aria-label="Camera active" />}
            <div className="viewer-hud">
              <span>{camera.metrics.width ? `${camera.metrics.width} × ${camera.metrics.height}` : 'NO VIDEO'}</span>
              <span>{detection.metrics.faceCount} FACE</span>
              <span>{detection.metrics.inferenceMs ? `${detection.metrics.inferenceMs.toFixed(1)} ms DETECT` : '— ms DETECT'}</span>
              <span>{detection.metrics.detectionFps ? `${detection.metrics.detectionFps.toFixed(1)} DET FPS` : '— DET FPS'}</span>
            </div>
          </div>
        </div>

        <aside className="command-panel">
          <section className="camera-controls">
            <div className="section-heading">
              <div><p className="panel-number">CAMERA + QUALITY</p><h1>Capture source</h1></div>
              <span className={`status-chip ${detection.metrics.status}`}>{detection.metrics.status.toUpperCase()}</span>
            </div>

            <div className="camera-row">
              <label className="field">
                <span>Camera</span>
                <select value={camera.selectedDeviceId} onChange={(event) => camera.selectDevice(event.target.value)} disabled={camera.devices.length === 0}>
                  {camera.devices.length === 0 && <option value="">Chưa tìm thấy camera</option>}
                  {camera.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                </select>
              </label>

              <div className="actions">
                <button className="primary" type="button" onClick={camera.start} disabled={camera.isRunning}>Start</button>
                <button className="secondary" type="button" onClick={camera.stop} disabled={!camera.isRunning}>Stop</button>
              </div>
            </div>

            {camera.error && <p className="error" role="alert">{camera.error}</p>}
            {detection.metrics.error && <p className="error" role="alert">Model: {detection.metrics.error}</p>}

            <div className="quality-summary">
              <div className="quality-state"><span>Quality</span><strong className={detection.metrics.quality?.status === 'GOOD' ? 'good' : ''}>{detection.metrics.quality?.status ?? 'NO_FACE'}</strong></div>
              <div><span>Face size</span><strong>{detection.metrics.quality ? `${detection.metrics.quality.faceWidthPx} × ${detection.metrics.quality.faceHeightPx}` : '—'}</strong></div>
              <div><span>Blur</span><strong>{detection.metrics.quality ? detection.metrics.quality.blurScore.toFixed(1) : '—'}</strong></div>
              <div><span>Video</span><strong>{camera.metrics.fps ? `${camera.metrics.fps} FPS` : '—'}</strong></div>
            </div>
          </section>

          <div className="mode-tabs" role="tablist" aria-label="Face workflow">
            <button type="button" className={mode === 'recognize' ? 'active' : ''} onClick={() => setMode('recognize')}>Recognize</button>
            <button type="button" className={mode === 'enroll' ? 'active' : ''} onClick={() => setMode('enroll')}>Enroll</button>
          </div>
          {mode === 'recognize' ? (
            <RecognitionPanel videoRef={camera.videoRef} face={detection.metrics.primaryFace} quality={detection.metrics.quality} />
          ) : (
            <EnrollmentPanel videoRef={camera.videoRef} face={detection.metrics.primaryFace} quality={detection.metrics.quality} />
          )}
        </aside>
      </section>
    </main>
  );
}
