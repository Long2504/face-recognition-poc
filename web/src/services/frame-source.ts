export type FrameSource = HTMLVideoElement | HTMLCanvasElement;

export function getFrameDimensions(source: FrameSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.width, height: source.height };
}
