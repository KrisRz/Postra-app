'use client';

import * as fabric from 'fabric';

let cachedModule: typeof import('@imgly/background-removal') | null = null;

const getModule = async () => {
  if (cachedModule) return cachedModule;
  cachedModule = await import('@imgly/background-removal');
  return cachedModule;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export interface RemoveBgOptions {
  onProgress?: (progress: number) => void;
}

const isWebGpuAvailable = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { gpu?: unknown };
  return Boolean(nav.gpu);
};

export const removeBackgroundFromImage = async (
  imgEl: HTMLImageElement,
  options: RemoveBgOptions = {}
): Promise<string> => {
  const mod = await getModule();
  const blob = await mod.removeBackground(imgEl.src, {
    device: isWebGpuAvailable() ? 'gpu' : 'cpu',
    output: { format: 'image/png' },
    progress: options.onProgress
      ? (key, current, total) => {
          if (total > 0) options.onProgress!(current / total);
        }
      : undefined,
  });
  return blobToDataUrl(blob);
};

export const replaceImageOnCanvas = async (
  canvas: fabric.Canvas,
  targetImage: fabric.FabricImage,
  newSrc: string
): Promise<void> => {
  const imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    imgEl.onload = () => resolve();
    imgEl.onerror = () => reject(new Error('image load failed'));
    imgEl.src = newSrc;
  });

  const replacement = new fabric.FabricImage(imgEl);
  replacement.set({
    left: targetImage.left,
    top: targetImage.top,
    scaleX:
      ((targetImage.width || 1) * (targetImage.scaleX || 1)) /
      (imgEl.naturalWidth || imgEl.width || 1),
    scaleY:
      ((targetImage.height || 1) * (targetImage.scaleY || 1)) /
      (imgEl.naturalHeight || imgEl.height || 1),
    angle: targetImage.angle,
    originX: targetImage.originX,
    originY: targetImage.originY,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });

  canvas.remove(targetImage);
  canvas.add(replacement);
  canvas.setActiveObject(replacement);
  canvas.renderAll();
};
