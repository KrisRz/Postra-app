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

const getEdges = (obj: fabric.Object) => {
  const w = (obj.width || 0) * (obj.scaleX || 1);
  const h = (obj.height || 0) * (obj.scaleY || 1);
  const oX = obj.originX || 'left';
  const oY = obj.originY || 'top';

  let edgeLeft = obj.left || 0;
  if (oX === 'center') edgeLeft -= w / 2;
  else if (oX === 'right') edgeLeft -= w;

  let edgeTop = obj.top || 0;
  if (oY === 'center') edgeTop -= h / 2;
  else if (oY === 'bottom') edgeTop -= h;

  return { left: edgeLeft, top: edgeTop, width: w, height: h };
};

const applyEdges = (
  obj: fabric.Object,
  edgeLeft: number,
  edgeTop: number,
  width: number,
  height: number
) => {
  const oX = obj.originX || 'left';
  const oY = obj.originY || 'top';

  let finalLeft = edgeLeft;
  if (oX === 'center') finalLeft += width / 2;
  else if (oX === 'right') finalLeft += width;

  let finalTop = edgeTop;
  if (oY === 'center') finalTop += height / 2;
  else if (oY === 'bottom') finalTop += height;

  obj.set({ left: finalLeft, top: finalTop });
};

export const repositionObjectFromTo = (
  obj: fabric.Object,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): void => {
  const bounds = getEdges(obj);

  if (isBackground(obj, srcW, srcH)) {
    const coverScale = Math.max(dstW / bounds.width, dstH / bounds.height);
    obj.set({
      scaleX: (obj.scaleX || 1) * coverScale,
      scaleY: (obj.scaleY || 1) * coverScale,
    });
    const newW = bounds.width * coverScale;
    const newH = bounds.height * coverScale;
    applyEdges(obj, (dstW - newW) / 2, (dstH - newH) / 2, newW, newH);
    return;
  }

  const uniformScale = Math.min(dstW / srcW, dstH / srcH);
  const newW = bounds.width * uniformScale;
  const newH = bounds.height * uniformScale;

  const anchors: PositionAnchors = {
    x: detectAnchor(bounds.left, bounds.width, srcW),
    y: detectAnchor(bounds.top, bounds.height, srcH),
  };

  let newEdgeLeft: number;
  if (anchors.x === 'start') {
    newEdgeLeft = (bounds.left / srcW) * dstW;
  } else if (anchors.x === 'end') {
    const rightPad = srcW - (bounds.left + bounds.width);
    newEdgeLeft = dstW - newW - (rightPad / srcW) * dstW;
  } else {
    newEdgeLeft = (dstW - newW) / 2;
  }

  let newEdgeTop: number;
  if (anchors.y === 'start') {
    newEdgeTop = (bounds.top / srcH) * dstH;
  } else if (anchors.y === 'end') {
    const bottomPad = srcH - (bounds.top + bounds.height);
    newEdgeTop = dstH - newH - (bottomPad / srcH) * dstH;
  } else {
    newEdgeTop = (dstH - newH) / 2;
  }

  obj.set({
    scaleX: (obj.scaleX || 1) * uniformScale,
    scaleY: (obj.scaleY || 1) * uniformScale,
  });
  applyEdges(obj, newEdgeLeft, newEdgeTop, newW, newH);
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
    repositionObjectFromTo(obj, srcW, srcH, target.width, target.height)
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
