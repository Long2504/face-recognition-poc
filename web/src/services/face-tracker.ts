import type { FaceBox } from './face-detector';

export type TrackedFace = { trackId: number; face: FaceBox };
type Track = { trackId: number; face: FaceBox; missedFrames: number };

export function boxArea(face: FaceBox): number {
  return Math.max(0, face.x2 - face.x1) * Math.max(0, face.y2 - face.y1);
}

export function boxIoU(left: FaceBox, right: FaceBox): number {
  const width = Math.max(0, Math.min(left.x2, right.x2) - Math.max(left.x1, right.x1));
  const height = Math.max(0, Math.min(left.y2, right.y2) - Math.max(left.y1, right.y1));
  const intersection = width * height;
  return intersection / Math.max(boxArea(left) + boxArea(right) - intersection, Number.EPSILON);
}

export class FaceTracker {
  private tracks: Track[] = [];
  private nextTrackId = 1;

  constructor(private readonly minimumIoU = 0.3, private readonly maximumMissedFrames = 2) {}

  update(detections: FaceBox[]): TrackedFace[] {
    const usedDetections = new Set<number>();
    const visible: TrackedFace[] = [];

    for (const track of this.tracks) {
      let bestIndex = -1;
      let bestIoU = this.minimumIoU;
      detections.forEach((face, index) => {
        if (usedDetections.has(index)) return;
        const overlap = boxIoU(track.face, face);
        if (overlap > bestIoU) {
          bestIoU = overlap;
          bestIndex = index;
        }
      });
      if (bestIndex >= 0) {
        track.face = detections[bestIndex];
        track.missedFrames = 0;
        usedDetections.add(bestIndex);
        visible.push({ trackId: track.trackId, face: track.face });
      } else {
        track.missedFrames += 1;
      }
    }

    this.tracks = this.tracks.filter((track) => track.missedFrames <= this.maximumMissedFrames);
    detections.forEach((face, index) => {
      if (usedDetections.has(index)) return;
      const track: Track = { trackId: this.nextTrackId, face, missedFrames: 0 };
      this.nextTrackId += 1;
      this.tracks.push(track);
      visible.push({ trackId: track.trackId, face });
    });
    return visible;
  }

  reset(): void {
    this.tracks = [];
  }
}
