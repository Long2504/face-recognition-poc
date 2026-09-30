import { type RefObject, useEffect, useRef, useState } from 'react';
import { FACE_DETECTION_CONFIG as config } from '../config/face.config';
import { type FaceBox, faceDetector } from '../services/face-detector';
import {
  type FaceQualityResult,
  faceQualityService,
} from '../services/face-quality.service';

export type DetectorStatus = 'idle' | 'loading' | 'ready' | 'error';
export type DetectionMetrics = {
  status: DetectorStatus;
  faceCount: number;
  inferenceMs: number;
  detectionFps: number;
  quality: FaceQualityResult | null;
  primaryFace: FaceBox | null;
  error: string;
};

const INITIAL_METRICS: DetectionMetrics = {
  status: 'idle',
  faceCount: 0,
  inferenceMs: 0,
  detectionFps: 0,
  quality: null,
  primaryFace: null,
  error: '',
};

type EvaluatedFace = { face: FaceBox; quality: FaceQualityResult };

function drawFaces(canvas: HTMLCanvasElement, video: HTMLVideoElement, faces: EvaluatedFace[]): void {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const targetWidth = Math.round(cssWidth * pixelRatio);
  const targetHeight = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const context = canvas.getContext('2d');
  if (!context || !video.videoWidth || !video.videoHeight) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const scale = Math.max(cssWidth / video.videoWidth, cssHeight / video.videoHeight);
  const renderedWidth = video.videoWidth * scale;
  const renderedHeight = video.videoHeight * scale;
  const offsetX = (cssWidth - renderedWidth) / 2;
  const offsetY = (cssHeight - renderedHeight) / 2;

  context.lineWidth = 2;
  context.font = '500 11px "DM Mono", monospace';
  for (const { face, quality } of faces) {
    const left = offsetX + (1 - face.x2) * renderedWidth;
    const top = offsetY + face.y1 * renderedHeight;
    const width = (face.x2 - face.x1) * renderedWidth;
    const height = (face.y2 - face.y1) * renderedHeight;
    const label = `${quality.status} ${(face.confidence * 100).toFixed(1)}%`;
    const labelWidth = context.measureText(label).width + 14;
    const color = quality.status === 'GOOD' ? '#b9ff4a' : quality.status === 'BLUR' ? '#ffc857' : '#ff806e';

    context.strokeStyle = color;
    context.strokeRect(left, top, width, height);
    context.fillStyle = color;
    context.fillRect(left, Math.max(0, top - 23), labelWidth, 23);
    context.fillStyle = '#07100e';
    context.fillText(label, left + 7, Math.max(16, top - 7));
  }
}

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement | null>, isRunning: boolean) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState<DetectionMetrics>(INITIAL_METRICS);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let completedFrames = 0;
    let fpsWindowStartedAt = performance.now();
    let displayedFps = 0;

    const clearOverlay = () => {
      const canvas = overlayRef.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (!isRunning) {
      clearOverlay();
      setMetrics({ ...INITIAL_METRICS, status: faceDetector.isLoaded() ? 'ready' : 'idle' });
      return undefined;
    }

    const loop = async () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (cancelled || !video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (!cancelled) timer = window.setTimeout(() => void loop(), 50);
        return;
      }

      const cycleStartedAt = performance.now();
      try {
        const result = await faceDetector.detect(video);
        if (cancelled) return;
        const evaluatedFaces = result.faces.map((face) => ({
          face,
          quality: faceQualityService.evaluate(video, face),
        }));
        const primaryFace = evaluatedFaces.reduce<EvaluatedFace | null>((current, candidate) => {
          if (!current) return candidate;
          const currentArea = (current.face.x2 - current.face.x1) * (current.face.y2 - current.face.y1);
          const candidateArea = (candidate.face.x2 - candidate.face.x1) * (candidate.face.y2 - candidate.face.y1);
          return candidateArea > currentArea ? candidate : current;
        }, null);
        drawFaces(canvas, video, evaluatedFaces);
        completedFrames += 1;
        const now = performance.now();
        const elapsed = now - fpsWindowStartedAt;
        if (elapsed >= 1000) {
          displayedFps = (completedFrames * 1000) / elapsed;
          completedFrames = 0;
          fpsWindowStartedAt = now;
        }
        setMetrics({
          status: 'ready',
          faceCount: result.faces.length,
          inferenceMs: result.inferenceMs,
          detectionFps: displayedFps,
          quality: primaryFace?.quality ?? null,
          primaryFace: primaryFace?.face ?? null,
          error: '',
        });
      } catch (reason) {
        if (cancelled) return;
        clearOverlay();
        setMetrics({
          ...INITIAL_METRICS,
          status: 'error',
          error: reason instanceof Error ? reason.message : 'Face detector failed.',
        });
        return;
      }

      const delay = Math.max(0, config.targetIntervalMs - (performance.now() - cycleStartedAt));
      timer = window.setTimeout(() => void loop(), delay);
    };

    setMetrics({ ...INITIAL_METRICS, status: faceDetector.isLoaded() ? 'ready' : 'loading' });
    void faceDetector.load().then(() => {
      if (!cancelled) void loop();
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setMetrics({
          ...INITIAL_METRICS,
          status: 'error',
          error: reason instanceof Error ? reason.message : 'Could not load face detector.',
        });
      }
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      clearOverlay();
    };
  }, [isRunning, videoRef]);

  return { overlayRef, metrics };
}
