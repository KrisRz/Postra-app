import type * as fabric from 'fabric';
import type { PlatformSize } from '../editor.store';

export type TemplateLang = 'pl' | 'en';

export type TemplateCategory =
  | 'promo'
  | 'quote'
  | 'announcement'
  | 'stats'
  | 'tip'
  | 'event'
  | 'community'
  | 'reel-cover';

export interface BrandStyle {
  primary: string;
  background: string;
  text: string;
  fontFamily: string;
}

export interface DesignTemplate {
  key: string;
  category: TemplateCategory;
  label: string;
  labelPl: string;
  description: string;
  descriptionPl: string;
  apply: (
    canvas: fabric.Canvas,
    platform: PlatformSize,
    brand: BrandStyle,
    lang: TemplateLang
  ) => void;
}

export const TEMPLATE_CATEGORIES: {
  key: TemplateCategory;
  labelKey: string;
  fallback: string;
  emoji: string;
}[] = [
  { key: 'promo', labelKey: 'tpl_cat_promo', fallback: 'Promo', emoji: '🛍️' },
  { key: 'quote', labelKey: 'tpl_cat_quote', fallback: 'Quote', emoji: '💬' },
  { key: 'announcement', labelKey: 'tpl_cat_announcement', fallback: 'Announcement', emoji: '📢' },
  { key: 'stats', labelKey: 'tpl_cat_stats', fallback: 'Stats', emoji: '📊' },
  { key: 'tip', labelKey: 'tpl_cat_tip', fallback: 'Tip', emoji: '💡' },
  { key: 'event', labelKey: 'tpl_cat_event', fallback: 'Event', emoji: '🎉' },
  { key: 'community', labelKey: 'tpl_cat_community', fallback: 'Community', emoji: '🤝' },
  { key: 'reel-cover', labelKey: 'tpl_cat_reel_cover', fallback: 'Reel cover', emoji: '📱' },
];

export const DEFAULT_BRAND: BrandStyle = {
  primary: '#38bdf8',
  background: '#0a0e1a',
  text: '#ffffff',
  fontFamily: 'Geist, system-ui, sans-serif',
};
