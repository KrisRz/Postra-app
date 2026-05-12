import * as fabric from 'fabric';
import { PLATFORM_SIZES, PlatformSize } from '../editor.store';

export interface FormatRender {
  platform: PlatformSize;
  dataUrl: string;
}

const BG_COVERAGE_THRESHOLD = 0.5;
const EDGE_ANCHOR_RATIO = 0.25;

type Anchor = 'start' | 'center' | 'end';

interface PositionAnchors {
  x: Anchor;
  y: Anchor;
}

const detectAnchor = (
  pos: number,
  size: number,
  bounds: number
): Anchor => {
  const center = pos + size / 2;
  const rel = center / bounds;
  if (rel < EDGE_ANCHOR_RATIO) return 'start';
  if (rel > 1 - EDGE_ANCHOR_RATIO) return 'end';
  return 'center';
};

const isBackground = (
  obj: fabric.Object,
  srcW: number,
  srcH: number
): boolean => {
  const w = (obj.width || 0) * (obj.scaleX || 1);
  const h = (obj.height || 0) * (obj.scaleY || 1);
  return w * h >= srcW * srcH * BG_COVERAGE_THRESHOLD;
};

const repositionObject = (
  obj: fabric.Object,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): void => {
  const objW = (obj.width || 0) * (obj.scaleX || 1);
  const objH = (obj.height || 0) * (obj.scaleY || 1);
  const left = obj.left || 0;
  const top = obj.top || 0;

  if (isBackground(obj, srcW, srcH)) {
    const coverScale = Math.max(dstW / objW, dstH / objH);
    obj.set({
      scaleX: (obj.scaleX || 1) * coverScale,
      scaleY: (obj.scaleY || 1) * coverScale,
      left: (dstW - objW * coverScale) / 2,
      top: (dstH - objH * coverScale) / 2,
    });
    return;
  }

  const uniformScale = Math.min(dstW / srcW, dstH / srcH);
  const newW = objW * uniformScale;
  const newH = objH * uniformScale;

  const anchors: PositionAnchors = {
    x: detectAnchor(left, objW, srcW),
    y: detectAnchor(top, objH, srcH),
  };

  let newLeft: number;
  if (anchors.x === 'start') {
    newLeft = (left / srcW) * dstW;
  } else if (anchors.x === 'end') {
    const rightPad = srcW - (left + objW);
    newLeft = dstW - newW - (rightPad / srcW) * dstW;
  } else {
    newLeft = (dstW - newW) / 2;
  }

  let newTop: number;
  if (anchors.y === 'start') {
    newTop = (top / srcH) * dstH;
  } else if (anchors.y === 'end') {
    const bottomPad = srcH - (top + objH);
    newTop = dstH - newH - (bottomPad / srcH) * dstH;
  } else {
    newTop = (dstH - newH) / 2;
  }

  obj.set({
    scaleX: (obj.scaleX || 1) * uniformScale,
    scaleY: (obj.scaleY || 1) * uniformScale,
    left: newLeft,
    top: newTop,
  });
};

export const renderCanvasAtSize = async (
  canvasJson: string,
  srcW: number,
  srcH: number,
  target: PlatformSize
): Promise<string> => {
  const el = document.createElement('canvas');
  el.width = target.width;
  el.height = target.height;

  const c = new fabric.StaticCanvas(el, {
    width: target.width,
    height: target.height,
    backgroundColor: '#1a1a2e',
    enableRetinaScaling: false,
  });

  await c.loadFromJSON(canvasJson);

  c.getObjects().forEach((obj) =>
    repositionObject(obj, srcW, srcH, target.width, target.height)
  );

  c.renderAll();
  const dataUrl = c.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
  c.dispose();
  return dataUrl;
};

export const renderAllFormats = async (
  canvasJson: string,
  srcW: number,
  srcH: number,
  onProgress?: (done: number, total: number) => void
): Promise<FormatRender[]> => {
  const targets = PLATFORM_SIZES.filter((p) => p.key !== 'custom');
  const results: FormatRender[] = [];

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    // eslint-disable-next-line no-await-in-loop
    const dataUrl = await renderCanvasAtSize(canvasJson, srcW, srcH, target);
    results.push({ platform: target, dataUrl });
    onProgress?.(i + 1, targets.length);
  }

  return results;
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await window.fetch(dataUrl);
  return res.blob();
};
