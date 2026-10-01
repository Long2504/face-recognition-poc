import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { FACE_DETECTION_CONFIG as config } from '../config/face.config';
import { type FaceBox, faceDetector } from '../services/face-detector';
import { boxArea, FaceTracker, type TrackedFace } from '../services/face-tracker';
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
  primaryTrackId: number | null;
  multipleFaces: boolean;
  error: string;
};

const INITIAL_METRICS: DetectionMetrics = {
  status: 'idle',
  faceCount: 0,
  inferenceMs: 0,
  detectionFps: 0,
  quality: null,
  primaryFace: null,
  primaryTrackId: null,
  multipleFaces: false,
  error: '',
};

type EvaluatedFace = TrackedFace & { quality: FaceQualityResult };
export type RecognitionOverlay = { text: string; status: 'searching' | 'match' | 'unknown'; expiresAt: number };
export type FaceFrameSnapshot = { trackId: number; source: HTMLCanvasElement; face: FaceBox };

function drawFaces(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  faces: EvaluatedFace[],
  recognition: Map<number, RecognitionOverlay>,
): void {
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
  const now = Date.now();
  for (const { trackId, face, quality } of faces) {
    const left = offsetX + (1 - face.x2) * renderedWidth;
    const top = offsetY + face.y1 * renderedHeight;
    const width = (face.x2 - face.x1) * renderedWidth;
    const height = (face.y2 - face.y1) * renderedHeight;
    const storedRecognition = recognition.get(trackId) ?? null;
    const recognitionForFace = storedRecognition && storedRecognition.expiresAt > now ? storedRecognition : null;
    const label = recognitionForFace?.text ?? `${quality.status} ${(face.confidence * 100).toFixed(1)}%`;
    const labelWidth = context.measureText(label).width + 14;
    const color = recognitionForFace?.status === 'match'
      ? '#b9ff4a'
      : recognitionForFace?.status === 'unknown'
        ? '#ff806e'
        : recognitionForFace?.status === 'searching'
          ? '#ffc857'
          : quality.status === 'GOOD' ? '#b9ff4a' : quality.status === 'BLUR' ? '#ffc857' : '#ff806e';

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
  const frameCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const workingFrameCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const latestFacesRef = useRef<EvaluatedFace[]>([]);
  const recognitionOverlaysRef = useRef(new Map<number, RecognitionOverlay>());
  const trackerRef = useRef(new FaceTracker(config.trackingIouThreshold, config.trackingMaximumMissedFrames));
  const [metrics, setMetrics] = useState<DetectionMetrics>(INITIAL_METRICS);

  const setRecognitionOverlay = useCallback((trackId: number, value: Omit<RecognitionOverlay, 'expiresAt'> | null) => {
    if (value) recognitionOverlaysRef.current.set(trackId, { ...value, expiresAt: Date.now() + config.identityTtlMs });
    else recognitionOverlaysRef.current.delete(trackId);
  }, []);

  const isTrackActive = useCallback((trackId: number): boolean => {
    return latestFacesRef.current.some((item) => item.trackId === trackId);
  }, []);

  const captureTrackFrame = useCallback((trackId: number): FaceFrameSnapshot | null => {
    const tracked = latestFacesRef.current.find((item) => item.trackId === trackId);
    const frame = frameCanvasRef.current;
    if (!tracked || frame.width === 0 || frame.height === 0) return null;
    const snapshot = document.createElement('canvas');
    snapshot.width = frame.width;
    snapshot.height = frame.height;
    snapshot.getContext('2d')?.drawImage(frame, 0, 0);
    return { trackId, source: snapshot, face: { ...tracked.face } };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let completedFrames = 0;
    let fpsWindowStartedAt = performance.now();
    let displayedFps = 0;
    const tracker = trackerRef.current;
    const recognitionOverlays = recognitionOverlaysRef.current;

    const clearOverlay = () => {
      const canvas = overlayRef.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (!isRunning) {
      tracker.reset();
      latestFacesRef.current = [];
      recognitionOverlays.clear();
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
        const frame = workingFrameCanvasRef.current;
        if (frame.width !== video.videoWidth || frame.height !== video.videoHeight) {
          frame.width = video.videoWidth;
          frame.height = video.videoHeight;
        }
        frame.getContext('2d')?.drawImage(video, 0, 0, frame.width, frame.height);
        const result = await faceDetector.detect(frame);
        if (cancelled) return;
        const evaluatedFaces = tracker.update(result.faces).map((tracked) => ({
          ...tracked,
          quality: faceQualityService.evaluate(frame, tracked.face),
        }));
        const previousCompletedFrame = frameCanvasRef.current;
        frameCanvasRef.current = frame;
        workingFrameCanvasRef.current = previousCompletedFrame;
        latestFacesRef.current = evaluatedFaces;
        const visibleTrackIds = new Set(evaluatedFaces.map((item) => item.trackId));
        for (const trackId of recognitionOverlays.keys()) {
          if (!visibleTrackIds.has(trackId)) recognitionOverlays.delete(trackId);
        }
        const rankedFaces = [...evaluatedFaces].sort((a, b) => boxArea(b.face) - boxArea(a.face));
        const largestArea = rankedFaces[0] ? boxArea(rankedFaces[0].face) : 0;
        const secondArea = rankedFaces[1] ? boxArea(rankedFaces[1].face) : 0;
        const multipleFaces = largestArea > 0 && secondArea / largestArea > config.ambiguousFaceAreaRatio;
        const primaryFace = multipleFaces ? null : rankedFaces[0] ?? null;
        drawFaces(canvas, video, evaluatedFaces, recognitionOverlays);
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
          primaryTrackId: primaryFace?.trackId ?? null,
          multipleFaces,
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
      latestFacesRef.current = [];
      recognitionOverlays.clear();
      tracker.reset();
    };
  }, [isRunning, videoRef]);

  return { overlayRef, metrics, setRecognitionOverlay, captureTrackFrame, isTrackActive };
}
