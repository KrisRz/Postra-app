import type * as fabric from 'fabric';
import type { PlatformSize } from '../editor.store';

export type TemplateCategory =
  | 'promo'
  | 'quote'
  | 'announcement'
  | 'stats'
  | 'tip'
  | 'event'
  | 'community';

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
  description: string;
  apply: (canvas: fabric.Canvas, platform: PlatformSize, brand: BrandStyle) => void;
}

export const TEMPLATE_CATEGORIES: {
  key: TemplateCategory;
  labelKey: string;
  fallback: string;
  emoji: string;
}[] = [
  { key: 'promo', labelKey: 'tpl_cat_promo', fallback: 'Promocja', emoji: '🛍️' },
  { key: 'quote', labelKey: 'tpl_cat_quote', fallback: 'Cytat', emoji: '💬' },
  { key: 'announcement', labelKey: 'tpl_cat_announcement', fallback: 'Ogłoszenie', emoji: '📢' },
  { key: 'stats', labelKey: 'tpl_cat_stats', fallback: 'Statystyki', emoji: '📊' },
  { key: 'tip', labelKey: 'tpl_cat_tip', fallback: 'Tip', emoji: '💡' },
  { key: 'event', labelKey: 'tpl_cat_event', fallback: 'Wydarzenie', emoji: '🎉' },
  { key: 'community', labelKey: 'tpl_cat_community', fallback: 'Społeczność', emoji: '🤝' },
];

export const DEFAULT_BRAND: BrandStyle = {
  primary: '#38bdf8',
  background: '#0a0e1a',
  text: '#ffffff',
  fontFamily: 'Geist, system-ui, sans-serif',
};
