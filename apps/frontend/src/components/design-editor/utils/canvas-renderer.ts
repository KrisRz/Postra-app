import * as fabric from 'fabric';
import { PlatformSize } from '../editor.store';

export interface PostDesignSpec {
  headline: string;
  subtext: string;
  cta: string;
  imagePrompt: string;
  colors: { background: string; accent: string; text: string };
  layout: 'centered-stack' | 'left-aligned' | 'bottom-stack' | 'top-banner';
  backgroundUrl: string;
  cacheHit: boolean;
  brandKit?: { logoPath: string | null } | null;
}

const TEXT_FONT = 'Geist, sans-serif';

interface PositionEntry {
  left: number;
  top: number;
  textAlign: 'left' | 'center';
  originX: 'left' | 'center';
  originY: 'top';
}

interface LayoutPositions {
  headline: PositionEntry;
  subtext: PositionEntry;
  cta: PositionEntry;
}

const computeLayout = (
  layout: PostDesignSpec['layout'],
  width: number,
  height: number
): LayoutPositions => {
  const cx = width / 2;
  // Fabric v7 default originX = 'center'. We need explicit origin so that
  // `left` is interpreted as either box-left-edge (originX='left') or
  // box-horizontal-center (originX='center'). Without this the left-aligned
  // layout cuts text off the left of the canvas.
  switch (layout) {
    case 'left-aligned':
      return {
        headline: { left: width * 0.08, top: height * 0.45, textAlign: 'left', originX: 'left', originY: 'top' },
        subtext: { left: width * 0.08, top: height * 0.6, textAlign: 'left', originX: 'left', originY: 'top' },
        cta: { left: width * 0.08, top: height * 0.78, textAlign: 'left', originX: 'left', originY: 'top' },
      };
    case 'bottom-stack':
      return {
        headline: { left: cx, top: height * 0.62, textAlign: 'center', originX: 'center', originY: 'top' },
        subtext: { left: cx, top: height * 0.76, textAlign: 'center', originX: 'center', originY: 'top' },
        cta: { left: cx, top: height * 0.88, textAlign: 'center', originX: 'center', originY: 'top' },
      };
    case 'top-banner':
      return {
        headline: { left: cx, top: height * 0.12, textAlign: 'center', originX: 'center', originY: 'top' },
        subtext: { left: cx, top: height * 0.26, textAlign: 'center', originX: 'center', originY: 'top' },
        cta: { left: cx, top: height * 0.4, textAlign: 'center', originX: 'center', originY: 'top' },
      };
    case 'centered-stack':
    default:
      return {
        headline: { left: cx, top: height * 0.42, textAlign: 'center', originX: 'center', originY: 'top' },
        subtext: { left: cx, top: height * 0.56, textAlign: 'center', originX: 'center', originY: 'top' },
        cta: { left: cx, top: height * 0.72, textAlign: 'center', originX: 'center', originY: 'top' },
      };
  }
};

const buildGradient = (color: string, width: number, height: number) =>
  new fabric.Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: 0, y2: height },
    colorStops: [
      { offset: 0, color: color },
      { offset: 1, color: '#000000' },
    ],
  });

export const renderDesignSpec = async (
  canvas: fabric.Canvas,
  spec: PostDesignSpec,
  platform: PlatformSize
) => {
  canvas.clear();

  const { width, height } = platform;
  const positions = computeLayout(spec.layout, width, height);
  const headlineFontSize = Math.round(width * 0.07);
  const subtextFontSize = Math.round(width * 0.035);
  const ctaFontSize = Math.round(width * 0.03);

  // 1. Background gradient placeholder (immediate)
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    fill: buildGradient(spec.colors.background, width, height),
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
  });
  canvas.add(bgRect);

  // 2. Text layers (immediate)
  const headline = new fabric.Textbox(spec.headline, {
    ...positions.headline,
    width: width * 0.84,
    fontSize: headlineFontSize,
    fontFamily: TEXT_FONT,
    fontWeight: '700',
    fill: spec.colors.text,
    shadow: new fabric.Shadow({
      color: 'rgba(0,0,0,0.5)',
      blur: 8,
      offsetX: 0,
      offsetY: 2,
    }),
  });
  const subtext = new fabric.Textbox(spec.subtext, {
    ...positions.subtext,
    width: width * 0.78,
    fontSize: subtextFontSize,
    fontFamily: TEXT_FONT,
    fill: spec.colors.text,
    opacity: 0.9,
  });
  const cta = new fabric.Textbox(spec.cta, {
    ...positions.cta,
    width: width * 0.5,
    fontSize: ctaFontSize,
    fontFamily: TEXT_FONT,
    fontWeight: '600',
    fill: spec.colors.accent,
    backgroundColor: 'rgba(255,255,255,0.08)',
  });

  canvas.add(headline);
  canvas.add(subtext);
  canvas.add(cta);
  canvas.renderAll();

  // 3. Background image (async — swap once loaded)
  try {
    const imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error('background image load failed'));
      imgEl.src = spec.backgroundUrl;
    });

    const bgImg = new fabric.FabricImage(imgEl, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    });
    bgImg.scaleToWidth(width);
    if (bgImg.getScaledHeight() < height) {
      bgImg.scaleToHeight(height);
    }

    canvas.remove(bgRect);
    // Keep at index 0 so text stays on top
    canvas.insertAt(0, bgImg);
    canvas.renderAll();
  } catch (err) {
    // Gradient placeholder remains — usable design
    console.warn('Background image swap skipped:', err);
  }

  // 4. Brand logo bottom-right (optional, async)
  if (spec.brandKit?.logoPath) {
    try {
      const logoEl = new Image();
      logoEl.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoEl.onload = () => resolve();
        logoEl.onerror = () => reject(new Error('logo load failed'));
        logoEl.src = spec.brandKit!.logoPath!;
      });

      const logo = new fabric.FabricImage(logoEl, { selectable: true });
      const logoTargetWidth = width * 0.12;
      const padding = width * 0.04;
      logo.scaleToWidth(logoTargetWidth);
      logo.set({
        left: width - padding,
        top: height - padding,
        originX: 'right',
        originY: 'bottom',
      });
      canvas.add(logo);
      canvas.renderAll();
    } catch (err) {
      console.warn('Logo placement skipped:', err);
    }
  }
};
