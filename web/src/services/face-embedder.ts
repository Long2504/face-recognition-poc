import * as ort from 'onnxruntime-web/wasm';
import { FACE_EMBEDDING_CONFIG as config } from '../config/face.config';
import type { FaceBox } from './face-detector';
import { normalizeEmbedding } from './embedding-math';

export type FaceEmbeddingResult = {
  embedding: Float32Array;
  inferenceMs: number;
};

export interface FaceEmbedder {
  load(): Promise<void>;
  embed(video: HTMLVideoElement, face: FaceBox): Promise<FaceEmbeddingResult>;
  isLoaded(): boolean;
}

class ArcFaceMobileFaceNetEmbedder implements FaceEmbedder {
  private session: ort.InferenceSession | null = null;
  private loading: Promise<void> | null = null;
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;

  constructor() {
    this.canvas.width = config.inputWidth;
    this.canvas.height = config.inputHeight;
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is not available for face embedding.');
    this.context = context;
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

  async embed(video: HTMLVideoElement, face: FaceBox): Promise<FaceEmbeddingResult> {
    await this.load();
    if (!this.session) throw new Error('Face embedding model is not loaded.');

    this.drawFaceCrop(video, face);
    const rgba = this.context.getImageData(0, 0, config.inputWidth, config.inputHeight).data;
    const planeSize = config.inputWidth * config.inputHeight;
    const input = new Float32Array(planeSize * 3);
    for (let pixel = 0; pixel < planeSize; pixel += 1) {
      const source = pixel * 4;
      input[pixel] = (rgba[source] - 127.5) / 127.5;
      input[planeSize + pixel] = (rgba[source + 1] - 127.5) / 127.5;
      input[planeSize * 2 + pixel] = (rgba[source + 2] - 127.5) / 127.5;
    }

    const tensor = new ort.Tensor('float32', input, [1, 3, config.inputHeight, config.inputWidth]);
    const startedAt = performance.now();
    const output = await this.session.run({ [this.session.inputNames[0]]: tensor });
    const inferenceMs = performance.now() - startedAt;
    const outputTensor = output[this.session.outputNames[0]];
    const rawEmbedding = outputTensor?.data as Float32Array | undefined;
    if (!rawEmbedding || rawEmbedding.length !== config.dimensions) {
      throw new Error(`Expected ${config.dimensions}-dimension embedding.`);
    }
    return { embedding: normalizeEmbedding(rawEmbedding), inferenceMs };
  }

  private drawFaceCrop(video: HTMLVideoElement, face: FaceBox): void {
    const boxWidth = (face.x2 - face.x1) * video.videoWidth;
    const boxHeight = (face.y2 - face.y1) * video.videoHeight;
    const centerX = ((face.x1 + face.x2) / 2) * video.videoWidth;
    const centerY = ((face.y1 + face.y2) / 2) * video.videoHeight;
    const desiredSize = Math.max(boxWidth, boxHeight) * (1 + config.cropMarginRatio * 2);
    const cropSize = Math.min(desiredSize, video.videoWidth, video.videoHeight);
    const sourceX = Math.max(0, Math.min(video.videoWidth - cropSize, centerX - cropSize / 2));
    const sourceY = Math.max(0, Math.min(video.videoHeight - cropSize, centerY - cropSize / 2));
    this.context.drawImage(
      video,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      config.inputWidth,
      config.inputHeight,
    );
  }
}

export const faceEmbedder: FaceEmbedder = new ArcFaceMobileFaceNetEmbedder();
