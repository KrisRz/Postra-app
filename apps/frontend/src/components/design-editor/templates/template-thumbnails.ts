import * as fabric from 'fabric';
import type { DesignTemplate, BrandStyle, TemplateLang } from './template-types';
import type { PlatformSize } from '../editor.store';

// Thumbnails run the real template apply() at full platform size on an
// offscreen StaticCanvas and export scaled down — same layout code as the
// editor, so the preview is exactly what the user gets, in their Brand Kit
// colours.

const THUMB_WIDTH = 256;
const CACHE_MAX = 600;

const cache = new Map<string, string>();

export const templateThumbnailKey = (
  tpl: DesignTemplate,
  platform: PlatformSize,
  brand: BrandStyle,
  lang: TemplateLang
) =>
  [
    tpl.key,
    platform.width,
    platform.height,
    lang,
    brand.primary,
    brand.background,
    brand.text,
    brand.fontFamily,
  ].join('|');

export const renderTemplateThumbnail = (
  tpl: DesignTemplate,
  platform: PlatformSize,
  brand: BrandStyle,
  lang: TemplateLang
): string => {
  const key = templateThumbnailKey(tpl, platform, brand, lang);
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = new fabric.StaticCanvas(undefined, {
    width: platform.width,
    height: platform.height,
    renderOnAddRemove: false,
  });
  try {
    // Templates only use add/remove/backgroundColor, all of which
    // StaticCanvas has — interactivity is the only thing missing.
    tpl.apply(canvas as unknown as fabric.Canvas, platform, brand, lang);
    canvas.renderAll();
    const url = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.82,
      multiplier: THUMB_WIDTH / platform.width,
    });
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, url);
    return url;
  } finally {
    void canvas.dispose();
  }
};
