import type * as fabric from 'fabric';
import { repositionObjectFromTo } from './multi-format-renderer';

/**
 * Switching platform sizes moves and rescales every layer. The bug this guards
 * against was silent and cumulative: scaling by min(dstW/srcW, dstH/srcH) loses
 * size on every aspect-ratio change and never gives it back, so clicking around
 * the format bar shrank text a little at a time until it disappeared. The
 * property that matters is REVERSIBILITY — a round trip must land where it
 * started.
 */

// Only the geometry fields are read or written, so a literal stands in for a
// Fabric object and keeps canvas out of the test.
type Geom = {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  originX?: string;
  originY?: string;
};

const obj = (o: Partial<Geom>): Geom & { set: (v: Partial<Geom>) => void } => {
  const base = {
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    scaleX: 1,
    scaleY: 1,
    ...o,
  } as Geom & { set: (v: Partial<Geom>) => void };
  base.set = (v: Partial<Geom>) => Object.assign(base, v);
  return base;
};

const move = (o: ReturnType<typeof obj>, from: [number, number], to: [number, number]) =>
  repositionObjectFromTo(o as unknown as fabric.Object, from[0], from[1], to[0], to[1]);

const SQUARE: [number, number] = [1080, 1080];
const STORY: [number, number] = [1080, 1920];
const LANDSCAPE: [number, number] = [1600, 900];

describe('repositionObjectFromTo', () => {
  it('returns a layer to its original size after a round trip', () => {
    // Size is the property that used to decay: every trip through a different
    // aspect ratio shaved a bit off and nothing ever put it back.
    const o = obj({ left: 140, top: 300, width: 400, height: 120 });
    move(o, SQUARE, STORY);
    move(o, STORY, SQUARE);
    expect(o.scaleX).toBeCloseTo(1, 5);
    expect(o.scaleY).toBeCloseTo(1, 5);
  });

  it('returns a centred layer to its exact place after a round trip', () => {
    // Position is only round-trippable for a layer that reads as centred or
    // edge-anchored; anything in between is deliberately snapped to centre.
    const o = obj({ left: 340, top: 480, width: 400, height: 120 });
    move(o, SQUARE, STORY);
    move(o, STORY, SQUARE);
    expect(o.left).toBeCloseTo(340, 3);
    expect(o.top).toBeCloseTo(480, 3);
  });

  it('survives a tour of every format without shrinking', () => {
    const o = obj({ left: 140, top: 300, width: 400, height: 120 });
    move(o, SQUARE, STORY);
    move(o, STORY, LANDSCAPE);
    move(o, LANDSCAPE, STORY);
    move(o, STORY, SQUARE);
    expect(o.scaleX).toBeCloseTo(1, 5);
    expect(o.width * o.scaleX).toBeCloseTo(400, 3);
  });

  it('scales by the short side, so a square-to-story move keeps the size', () => {
    const o = obj({ left: 340, top: 480, width: 400, height: 120 });
    move(o, SQUARE, STORY);
    // Both formats are 1080 wide, so nothing should have been resized.
    expect(o.scaleX).toBeCloseTo(1, 5);
  });

  it('never lets a layer grow past the destination canvas', () => {
    const o = obj({ left: 0, top: 0, width: 1000, height: 200 });
    move(o, SQUARE, LANDSCAPE);
    expect(o.width * o.scaleX).toBeLessThanOrEqual(LANDSCAPE[0] + 0.001);
  });

  it('keeps a background layer covering the whole frame', () => {
    // Anything at least half the canvas area counts as background.
    const o = obj({ left: 0, top: 0, width: 1080, height: 1080 });
    move(o, SQUARE, STORY);
    expect(o.width * o.scaleX).toBeGreaterThanOrEqual(STORY[0] - 0.001);
    expect(o.height * o.scaleY).toBeGreaterThanOrEqual(STORY[1] - 0.001);
  });

  it('keeps an edge-anchored layer on its edge, with proportional padding', () => {
    // Bottom-left caption: 5% in from the left, 5% up from the bottom. The
    // gaps stay at 5% of the NEW canvas, so the layout reads the same on a
    // taller frame rather than clinging to a pixel count.
    const o = obj({ left: 54, top: 918, width: 200, height: 108 });
    move(o, SQUARE, STORY);
    expect(o.left / STORY[0]).toBeCloseTo(0.05, 3);
    const bottomGap = STORY[1] - (o.top + o.height * o.scaleY);
    expect(bottomGap / STORY[1]).toBeCloseTo(0.05, 3);
  });

  it('re-centres a centred layer', () => {
    const o = obj({ left: 340, top: 480, width: 400, height: 120 });
    move(o, SQUARE, STORY);
    const centreX = o.left + (o.width * o.scaleX) / 2;
    expect(centreX).toBeCloseTo(STORY[0] / 2, 3);
  });

  it('honours centre origins when reading and writing position', () => {
    const o = obj({
      left: 540,
      top: 540,
      width: 400,
      height: 120,
      originX: 'center',
      originY: 'center',
    });
    move(o, SQUARE, STORY);
    // Still centred horizontally, and `left` is still the object's centre.
    expect(o.left).toBeCloseTo(STORY[0] / 2, 3);
  });
});
