import { useEffect, useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { useFaceDetection } from './hooks/useFaceDetection';
import { type ApiStatus, checkApiHealth } from './services/api';

export function App() {
  const camera = useCamera();
  const detection = useFaceDetection(camera.videoRef, camera.isRunning);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();
    checkApiHealth(controller.signal).then(() => setApiStatus('ok')).catch(() => setApiStatus('error'));
    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Face Lab home"><span className="brand-mark">F</span><span>FACE LAB</span></a>
        <div className={`api-pill ${apiStatus}`}><span /> API {apiStatus === 'ok' ? 'OK' : apiStatus === 'error' ? 'OFFLINE' : 'CHECKING'}</div>
      </header>

      <section className="intro">
        <p className="eyebrow">PHASE 03 · FACE QUALITY</p>
        <h1>Recognition<br /><em>test bench.</em></h1>
        <p className="lede">Phát hiện và kiểm tra chất lượng khuôn mặt trực tiếp trong trình duyệt. Video không được gửi đến server.</p>
      </section>

      <section className="workspace">
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
        </div>

        <aside className="control-panel">
          <div>
            <p className="panel-number">03 / QUALITY GATE</p>
            <h2>Face quality</h2>
          </div>

          <label className="field">
            <span>Camera source</span>
            <select value={camera.selectedDeviceId} onChange={(event) => camera.selectDevice(event.target.value)} disabled={camera.devices.length === 0}>
              {camera.devices.length === 0 && <option value="">Chưa tìm thấy camera</option>}
              {camera.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
          </label>

          <div className="actions">
            <button className="primary" type="button" onClick={camera.start} disabled={camera.isRunning}>Start camera <span>↗</span></button>
            <button className="secondary" type="button" onClick={camera.stop} disabled={!camera.isRunning}>Stop</button>
          </div>

          {camera.error && <p className="error" role="alert">{camera.error}</p>}
          {detection.metrics.error && <p className="error" role="alert">Model: {detection.metrics.error}</p>}

          <dl className="metrics">
            <div><dt>Resolution</dt><dd>{camera.metrics.width ? `${camera.metrics.width} × ${camera.metrics.height}` : '—'}</dd></div>
            <div><dt>Video FPS</dt><dd>{camera.metrics.fps || '—'}</dd></div>
            <div><dt>Model</dt><dd className={detection.metrics.status === 'ready' ? 'active' : detection.metrics.status === 'error' ? 'failed' : ''}>{detection.metrics.status.toUpperCase()}</dd></div>
            <div><dt>Detected faces</dt><dd>{camera.isRunning ? detection.metrics.faceCount : '—'}</dd></div>
            <div><dt>Inference</dt><dd>{detection.metrics.inferenceMs ? `${detection.metrics.inferenceMs.toFixed(1)} ms` : '—'}</dd></div>
            <div><dt>Detection FPS</dt><dd>{detection.metrics.detectionFps ? detection.metrics.detectionFps.toFixed(1) : '—'}</dd></div>
            <div className="quality-row"><dt>Quality</dt><dd className={detection.metrics.quality?.status === 'GOOD' ? 'active' : detection.metrics.quality ? 'warning' : ''}>{detection.metrics.quality?.status ?? 'NO_FACE'}</dd></div>
            <div><dt>Face size</dt><dd>{detection.metrics.quality ? `${detection.metrics.quality.faceWidthPx} × ${detection.metrics.quality.faceHeightPx}` : '—'}</dd></div>
            <div><dt>Blur score</dt><dd>{detection.metrics.quality ? detection.metrics.quality.blurScore.toFixed(1) : '—'}</dd></div>
          </dl>

          <p className="privacy"><span>◆</span> Privacy note<br /><small>Frames are processed locally. No video is uploaded or stored.</small></p>
        </aside>
      </section>

      <footer><span>FACE RECOGNITION POC</span><span>PHASE 03 · DETECTION + QUALITY · ON-DEVICE</span></footer>
    </main>
  );
}
