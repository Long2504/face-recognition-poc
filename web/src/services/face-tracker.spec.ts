import { describe, expect, it } from 'vitest';
import type { FaceBox } from './face-detector';
import { FaceTracker, boxIoU } from './face-tracker';

function face(x1: number, y1: number, x2: number, y2: number): FaceBox {
  return { x1, y1, x2, y2, confidence: 0.99 };
}

describe('FaceTracker', () => {
  it('keeps the same track ID for overlapping detections', () => {
    const tracker = new FaceTracker();
    const first = tracker.update([face(0.1, 0.1, 0.4, 0.5)])[0];
    const second = tracker.update([face(0.12, 0.11, 0.42, 0.51)])[0];
    expect(second.trackId).toBe(first.trackId);
  });

  it('creates a new track when a different face replaces the old one', () => {
    const tracker = new FaceTracker();
    const first = tracker.update([face(0.05, 0.1, 0.3, 0.5)])[0];
    const second = tracker.update([face(0.7, 0.1, 0.95, 0.5)])[0];
    expect(second.trackId).not.toBe(first.trackId);
  });

  it('does not return missed tracks as visible faces', () => {
    const tracker = new FaceTracker(0.3, 2);
    tracker.update([face(0.1, 0.1, 0.4, 0.5)]);
    expect(tracker.update([])).toEqual([]);
    expect(tracker.update([])).toEqual([]);
    expect(tracker.update([])).toEqual([]);
    expect(tracker.update([face(0.1, 0.1, 0.4, 0.5)])[0].trackId).toBe(2);
  });

  it('computes IoU for normalized boxes', () => {
    expect(boxIoU(face(0, 0, 1, 1), face(0.5, 0, 1, 1))).toBeCloseTo(0.5);
  });
});
