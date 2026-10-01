import * as ort from 'onnxruntime-web/wasm';
import { FACE_DETECTION_CONFIG as config } from '../config/face.config';
import type { FrameSource } from './frame-source';

export type FaceBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
};

export type FaceDetectionResult = {
  faces: FaceBox[];
  inferenceMs: number;
};

export interface FaceDetector {
  load(): Promise<void>;
  detect(source: FrameSource): Promise<FaceDetectionResult>;
  isLoaded(): boolean;
}

function intersectionOverUnion(a: FaceBox, b: FaceBox): number {
  const intersectionWidth = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const intersectionHeight = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const intersection = intersectionWidth * intersectionHeight;
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  return intersection / Math.max(areaA + areaB - intersection, Number.EPSILON);
}

export function hardNms(boxes: FaceBox[], iouThreshold: number, limit: number): FaceBox[] {
  const pending = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const selected: FaceBox[] = [];
  while (pending.length > 0 && selected.length < limit) {
    const candidate = pending.shift();
    if (!candidate) break;
    selected.push(candidate);
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (intersectionOverUnion(candidate, pending[index]) > iouThreshold) pending.splice(index, 1);
    }
  }
  return selected;
}

class UltraLightFaceDetector implements FaceDetector {
  private session: ort.InferenceSession | null = null;
  private loading: Promise<void> | null = null;
  private readonly inputCanvas = document.createElement('canvas');
  private readonly inputContext: CanvasRenderingContext2D;

  constructor() {
    this.inputCanvas.width = config.inputWidth;
    this.inputCanvas.height = config.inputHeight;
    const context = this.inputCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is not available in this browser.');
    this.inputContext = context;
  }

  isLoaded(): boolean {
    return this.session !== null;
  }

  async load(): Promise<void> {
    if (this.session) return;
    if (!this.loading) {
      ort.env.logLevel = 'error';
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = { wasm: '/ort-wasm-simd-threaded.wasm' };
      this.loading = ort.InferenceSession.create(config.modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }).then((session) => {
        this.session = session;
      }).catch((error: unknown) => {
        this.loading = null;
        throw error;
      });
    }
    await this.loading;
  }

  async detect(source: FrameSource): Promise<FaceDetectionResult> {
    await this.load();
    if (!this.session) throw new Error('Face detector is not loaded.');

    this.inputContext.drawImage(source, 0, 0, config.inputWidth, config.inputHeight);
    const pixels = this.inputContext.getImageData(0, 0, config.inputWidth, config.inputHeight).data;
    const planeSize = config.inputWidth * config.inputHeight;
    const input = new Float32Array(planeSize * 3);
    for (let pixel = 0; pixel < planeSize; pixel += 1) {
      const rgbaIndex = pixel * 4;
      input[pixel] = (pixels[rgbaIndex] - 127) / 128;
      input[planeSize + pixel] = (pixels[rgbaIndex + 1] - 127) / 128;
      input[planeSize * 2 + pixel] = (pixels[rgbaIndex + 2] - 127) / 128;
    }

    const tensor = new ort.Tensor('float32', input, [1, 3, config.inputHeight, config.inputWidth]);
    const startedAt = performance.now();
    const output = await this.session.run({ [this.session.inputNames[0]]: tensor });
    const inferenceMs = performance.now() - startedAt;
    const tensors = this.session.outputNames.map((name) => output[name]);
    const scoresTensor = tensors.find((item) => item?.dims.at(-1) === 2);
    const boxesTensor = tensors.find((item) => item?.dims.at(-1) === 4);
    if (!scoresTensor || !boxesTensor) throw new Error('Unexpected face detector output.');

    const scores = scoresTensor.data as Float32Array;
    const boxes = boxesTensor.data as Float32Array;
    const candidates: FaceBox[] = [];
    for (let index = 0; index < scores.length / 2; index += 1) {
      const confidence = scores[index * 2 + 1];
      if (confidence < config.confidenceThreshold) continue;
      const offset = index * 4;
      const face = {
        x1: Math.max(0, Math.min(1, boxes[offset])),
        y1: Math.max(0, Math.min(1, boxes[offset + 1])),
        x2: Math.max(0, Math.min(1, boxes[offset + 2])),
        y2: Math.max(0, Math.min(1, boxes[offset + 3])),
        confidence,
      };
      if (face.x2 > face.x1 && face.y2 > face.y1) candidates.push(face);
    }

    return {
      faces: hardNms(candidates, config.iouThreshold, config.maxDetections),
      inferenceMs,
    };
  }
}

export const faceDetector: FaceDetector = new UltraLightFaceDetector();
