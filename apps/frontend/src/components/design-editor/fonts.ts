import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

export interface StudioFont {
  key: string;
  label: string;
  family: string;
  classification: 'sans' | 'serif' | 'display' | 'mono';
}

export const STUDIO_FONTS: StudioFont[] = [
  {
    key: 'geist',
    label: 'Geist',
    family: 'Geist, system-ui, sans-serif',
    classification: 'sans',
  },
  {
    key: 'lato',
    label: 'Lato',
    family: 'Lato, sans-serif',
    classification: 'sans',
  },
  {
    key: 'inter',
    label: 'Inter',
    family: 'Inter, sans-serif',
    classification: 'sans',
  },
  {
    key: 'bebas-neue',
    label: 'Bebas Neue',
    family: '"Bebas Neue", Impact, sans-serif',
    classification: 'display',
  },
  {
    key: 'playfair-display',
    label: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    classification: 'serif',
  },
  {
    key: 'jetbrains-mono',
    label: 'JetBrains Mono',
    family: '"JetBrains Mono", "Courier New", monospace',
    classification: 'mono',
  },
];

export const DEFAULT_FONT = STUDIO_FONTS[0];

export const findFontByFamily = (family?: string): StudioFont => {
  if (!family) return DEFAULT_FONT;
  const match = STUDIO_FONTS.find((f) =>
    family.toLowerCase().includes(f.label.toLowerCase())
  );
  return match || DEFAULT_FONT;
};
