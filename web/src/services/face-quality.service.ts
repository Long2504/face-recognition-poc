import { FACE_QUALITY_CONFIG as config } from '../config/face.config';
import type { FaceBox } from './face-detector';

export type FaceQualityStatus =
  | 'GOOD'
  | 'TOO_SMALL'
  | 'BLUR'
  | 'LOW_CONFIDENCE'
  | 'TOO_CLOSE_TO_EDGE';

export type FaceQualityResult = {
  status: FaceQualityStatus;
  blurScore: number;
  faceWidthPx: number;
  faceHeightPx: number;
};

export interface FaceQualityService {
  evaluate(video: HTMLVideoElement, face: FaceBox): FaceQualityResult;
}

class BrowserFaceQualityService implements FaceQualityService {
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;

  constructor() {
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is not available for face quality checks.');
    this.context = context;
  }

  evaluate(video: HTMLVideoElement, face: FaceBox): FaceQualityResult {
    const faceWidthPx = Math.max(0, (face.x2 - face.x1) * video.videoWidth);
    const faceHeightPx = Math.max(0, (face.y2 - face.y1) * video.videoHeight);
    const blurScore = this.calculateBlurScore(video, face, faceWidthPx, faceHeightPx);

    let status: FaceQualityStatus = 'GOOD';
    if (face.confidence < config.minimumConfidence) {
      status = 'LOW_CONFIDENCE';
    } else if (Math.min(faceWidthPx, faceHeightPx) < config.minimumFaceSizePx) {
      status = 'TOO_SMALL';
    } else if (
      face.x1 < config.edgeMarginRatio ||
      face.y1 < config.edgeMarginRatio ||
      face.x2 > 1 - config.edgeMarginRatio ||
      face.y2 > 1 - config.edgeMarginRatio
    ) {
      status = 'TOO_CLOSE_TO_EDGE';
    } else if (blurScore < config.minimumBlurScore) {
      status = 'BLUR';
    }

    return {
      status,
      blurScore,
      faceWidthPx: Math.round(faceWidthPx),
      faceHeightPx: Math.round(faceHeightPx),
    };
  }

  private calculateBlurScore(
    video: HTMLVideoElement,
    face: FaceBox,
    sourceWidth: number,
    sourceHeight: number,
  ): number {
    if (sourceWidth < 3 || sourceHeight < 3) return 0;
    const scale = Math.min(1, config.blurSampleMaxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(3, Math.round(sourceWidth * scale));
    const height = Math.max(3, Math.round(sourceHeight * scale));
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.drawImage(
      video,
      face.x1 * video.videoWidth,
      face.y1 * video.videoHeight,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );

    const rgba = this.context.getImageData(0, 0, width, height).data;
    const gray = new Float32Array(width * height);
    for (let index = 0; index < gray.length; index += 1) {
      const offset = index * 4;
      gray[index] = rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114;
    }

    let sum = 0;
    let sumSquared = 0;
    let count = 0;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const laplacian =
          gray[index] * 4 - gray[index - 1] - gray[index + 1] - gray[index - width] - gray[index + width];
        sum += laplacian;
        sumSquared += laplacian * laplacian;
        count += 1;
      }
    }
    if (count === 0) return 0;
    const mean = sum / count;
    return Math.max(0, sumSquared / count - mean * mean);
  }
}

export const faceQualityService: FaceQualityService = new BrowserFaceQualityService();
