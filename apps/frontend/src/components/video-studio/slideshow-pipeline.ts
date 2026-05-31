import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  CanvasSource,
  QUALITY_MEDIUM,
} from 'mediabunny';

/**
 * Postra Clip — photos → video (slideshow).
 *
 * The shop owner ("Marek") has product PHOTOS, not footage. This turns a handful
 * of images into a branded vertical clip: each photo fills the frame with a
 * gentle Ken Burns push, the caller paints branded text on top, and we encode to
 * MP4 with the same CanvasSource the video compositor uses. Silent by design —
 * the message lives in the text, not a soundtrack.
 */

export interface SlideshowOptions {
  images: Blob[];
  width: number;
  height: number;
  /** Seconds each image is on screen. */
  secondsPerImage: number;
  /** Frames per second of the output (default 30). */
  fps?: number;
  /** Slow zoom-in per image for a less static feel (default true). */
  kenBurns?: boolean;
  /** Background behind images that don't perfectly fill (letterbox edges). */
  backgroundColor?: string;
  /** Paint branded text/overlays on the current frame. */
  drawOverlay?: (
    ctx: CanvasRenderingContext2D,
    info: { timestampSec: number; index: number; width: number; height: number }
  ) => void;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
  bitrate?: number;
}

export interface SlideshowResult {
  blob: Blob;
  frames: number;
}

/** Draw an image "cover" (fill + crop) into width×height, scaled by `zoom`. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  width: number,
  height: number,
  zoom: number
): void {
  const base = Math.max(width / img.width, height / img.height);
  const scale = base * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}

export async function composeSlideshow(opts: SlideshowOptions): Promise<SlideshowResult> {
  const {
    images,
    width,
    height,
    secondsPerImage,
    fps = 30,
    kenBurns = true,
    backgroundColor = '#000000',
    drawOverlay,
    onProgress,
    signal,
  } = opts;

  if (!images.length) throw new Error('No images for slideshow');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas context');

  const bitmaps = await Promise.all(images.map((img) => createImageBitmap(img)));

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: opts.bitrate ?? QUALITY_MEDIUM,
  });
  output.addVideoTrack(videoSource);
  await output.start();

  const framesPerImage = Math.max(1, Math.round(secondsPerImage * fps));
  const totalFrames = framesPerImage * bitmaps.length;
  const frameDuration = 1 / fps;
  let frameIndex = 0;

  try {
    for (let i = 0; i < bitmaps.length; i++) {
      for (let f = 0; f < framesPerImage; f++) {
        if (signal?.aborted) break;
        const within = framesPerImage > 1 ? f / (framesPerImage - 1) : 0;
        const zoom = kenBurns ? 1 + within * 0.08 : 1;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        drawCover(ctx, bitmaps[i], width, height, zoom);

        const timestampSec = frameIndex * frameDuration;
        drawOverlay?.(ctx, { timestampSec, index: i, width, height });

        await videoSource.add(timestampSec, frameDuration);
        frameIndex += 1;
        if (frameIndex % 5 === 0) onProgress?.(frameIndex / totalFrames);
      }
      if (signal?.aborted) break;
    }
  } finally {
    videoSource.close();
    bitmaps.forEach((b) => b.close());
  }

  if (signal?.aborted) throw new DOMException('Slideshow aborted', 'AbortError');

  await output.finalize();
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Empty output buffer');

  onProgress?.(1);
  return { blob: new Blob([buffer], { type: 'video/mp4' }), frames: frameIndex };
}
