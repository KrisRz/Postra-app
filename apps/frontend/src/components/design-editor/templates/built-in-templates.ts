import * as fabric from 'fabric';
import type { DesignTemplate, BrandStyle } from './template-types';
import type { PlatformSize } from '../editor.store';

const clearCanvas = (canvas: fabric.Canvas, bg: string) => {
  canvas.getObjects().forEach((obj) => canvas.remove(obj));
  canvas.backgroundColor = bg;
};

const addTextbox = (
  canvas: fabric.Canvas,
  text: string,
  options: Partial<fabric.Textbox> & { fontFamily?: string }
): fabric.Textbox => {
  const tb = new fabric.Textbox(text, {
    fontFamily: 'Geist, system-ui, sans-serif',
    fill: '#ffffff',
    textAlign: 'center',
    editable: true,
    ...options,
  });
  canvas.add(tb);
  return tb;
};

const addRect = (
  canvas: fabric.Canvas,
  options: Partial<fabric.Rect>
): fabric.Rect => {
  const r = new fabric.Rect({ ...options });
  canvas.add(r);
  return r;
};

const addCircle = (
  canvas: fabric.Canvas,
  options: Partial<fabric.Circle>
): fabric.Circle => {
  const c = new fabric.Circle({ ...options });
  canvas.add(c);
  return c;
};

const promoModern: DesignTemplate = {
  key: 'promo-modern',
  category: 'promo',
  label: 'Promocja Modern',
  description: 'Nagłówek z procentem zniżki i CTA',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addRect(canvas, {
      left: 0,
      top: 0,
      width: p.width,
      height: p.height * 0.15,
      fill: brand.primary,
      selectable: false,
    });

    addTextbox(canvas, 'PROMOCJA', {
      left: cx,
      top: p.height * 0.045,
      width: p.width * 0.9,
      fontSize: p.width * 0.045,
      fill: brand.background,
      originX: 'center',
      textAlign: 'center',
      fontWeight: 'bold',
      charSpacing: 80,
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, '-50%', {
      left: cx,
      top: p.height * 0.32,
      width: p.width * 0.9,
      fontSize: p.width * 0.28,
      fill: brand.primary,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Na wszystkie produkty', {
      left: cx,
      top: p.height * 0.68,
      width: p.width * 0.85,
      fontSize: p.width * 0.045,
      fill: brand.text,
      originX: 'center',
      fontFamily: brand.fontFamily,
    });

    addRect(canvas, {
      left: cx,
      top: p.height * 0.82,
      width: p.width * 0.4,
      height: p.height * 0.08,
      fill: brand.primary,
      rx: p.height * 0.04,
      ry: p.height * 0.04,
      originX: 'center',
    });

    addTextbox(canvas, 'Kup teraz', {
      left: cx,
      top: p.height * 0.84,
      width: p.width * 0.4,
      fontSize: p.width * 0.04,
      fill: brand.background,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });
  },
};

const quoteClassic: DesignTemplate = {
  key: 'quote-classic',
  category: 'quote',
  label: 'Cytat Klasyczny',
  description: 'Cytat z autorem na ciemnym tle',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addTextbox(canvas, '"', {
      left: cx,
      top: p.height * 0.12,
      width: p.width * 0.5,
      fontSize: p.width * 0.25,
      fill: brand.primary,
      originX: 'center',
      fontFamily: '"Playfair Display", Georgia, serif',
    });

    addTextbox(canvas, 'Sukces to suma\nmałych wysiłków\npowtarzanych\ncodziennie.', {
      left: cx,
      top: p.height * 0.38,
      width: p.width * 0.85,
      fontSize: p.width * 0.06,
      fill: brand.text,
      originX: 'center',
      fontStyle: 'italic',
      lineHeight: 1.3,
      fontFamily: '"Playfair Display", Georgia, serif',
    });

    addRect(canvas, {
      left: cx,
      top: p.height * 0.78,
      width: p.width * 0.15,
      height: 2,
      fill: brand.primary,
      originX: 'center',
    });

    addTextbox(canvas, '— Robert Collier', {
      left: cx,
      top: p.height * 0.82,
      width: p.width * 0.7,
      fontSize: p.width * 0.035,
      fill: brand.primary,
      originX: 'center',
      fontFamily: brand.fontFamily,
    });
  },
};

const announcementBold: DesignTemplate = {
  key: 'announcement-bold',
  category: 'announcement',
  label: 'Ogłoszenie Bold',
  description: 'Duży nagłówek z dwuwierszowym podtytułem',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addCircle(canvas, {
      left: p.width * 0.05,
      top: p.height * 0.08,
      radius: p.width * 0.04,
      fill: brand.primary,
    });

    addTextbox(canvas, 'NOWOŚĆ', {
      left: p.width * 0.18,
      top: p.height * 0.1,
      width: p.width * 0.5,
      fontSize: p.width * 0.04,
      fill: brand.primary,
      textAlign: 'left',
      fontWeight: 'bold',
      charSpacing: 80,
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Nowy\nprodukt\njuż dostępny', {
      left: cx,
      top: p.height * 0.28,
      width: p.width * 0.9,
      fontSize: p.width * 0.13,
      fill: brand.text,
      originX: 'center',
      fontWeight: 'bold',
      lineHeight: 1.05,
      fontFamily: '"Bebas Neue", Impact, sans-serif',
    });

    addTextbox(canvas, 'Sprawdź szczegóły na naszej stronie i zamów przed innymi.', {
      left: cx,
      top: p.height * 0.78,
      width: p.width * 0.8,
      fontSize: p.width * 0.035,
      fill: brand.text,
      originX: 'center',
      opacity: 0.8,
      fontFamily: brand.fontFamily,
    });
  },
};

const statsHighlight: DesignTemplate = {
  key: 'stats-highlight',
  category: 'stats',
  label: 'Statystyki Highlight',
  description: 'Duża liczba z opisem',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addTextbox(canvas, '12K+', {
      left: cx,
      top: p.height * 0.25,
      width: p.width * 0.9,
      fontSize: p.width * 0.34,
      fill: brand.primary,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });

    addRect(canvas, {
      left: cx,
      top: p.height * 0.62,
      width: p.width * 0.12,
      height: 3,
      fill: brand.text,
      originX: 'center',
    });

    addTextbox(canvas, 'Zadowolonych klientów', {
      left: cx,
      top: p.height * 0.66,
      width: p.width * 0.8,
      fontSize: p.width * 0.055,
      fill: brand.text,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Dziękujemy za zaufanie w 2026 roku', {
      left: cx,
      top: p.height * 0.8,
      width: p.width * 0.8,
      fontSize: p.width * 0.032,
      fill: brand.text,
      originX: 'center',
      opacity: 0.7,
      fontFamily: brand.fontFamily,
    });
  },
};

const tipNumbered: DesignTemplate = {
  key: 'tip-numbered',
  category: 'tip',
  label: 'Tip Numbered',
  description: 'Lista 3 wskazówek z numerami',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);

    addTextbox(canvas, '3 wskazówki', {
      left: p.width * 0.08,
      top: p.height * 0.08,
      width: p.width * 0.85,
      fontSize: p.width * 0.075,
      fill: brand.text,
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });

    addRect(canvas, {
      left: p.width * 0.08,
      top: p.height * 0.2,
      width: p.width * 0.15,
      height: 3,
      fill: brand.primary,
    });

    const tips = [
      'Publikuj regularnie',
      'Słuchaj odbiorców',
      'Mierz wyniki',
    ];

    tips.forEach((tip, i) => {
      const top = p.height * (0.32 + i * 0.17);
      addCircle(canvas, {
        left: p.width * 0.08,
        top,
        radius: p.width * 0.035,
        fill: brand.primary,
      });
      addTextbox(canvas, `${i + 1}`, {
        left: p.width * 0.08,
        top: top + p.width * 0.012,
        width: p.width * 0.07,
        fontSize: p.width * 0.032,
        fill: brand.background,
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily: brand.fontFamily,
      });
      addTextbox(canvas, tip, {
        left: p.width * 0.22,
        top: top + p.width * 0.015,
        width: p.width * 0.7,
        fontSize: p.width * 0.045,
        fill: brand.text,
        fontFamily: brand.fontFamily,
      });
    });
  },
};

const eventDate: DesignTemplate = {
  key: 'event-date',
  category: 'event',
  label: 'Wydarzenie z datą',
  description: 'Data + tytuł + lokalizacja',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addRect(canvas, {
      left: cx,
      top: p.height * 0.12,
      width: p.width * 0.55,
      height: p.height * 0.22,
      fill: 'transparent',
      stroke: brand.primary,
      strokeWidth: 3,
      originX: 'center',
    });

    addTextbox(canvas, '15', {
      left: cx,
      top: p.height * 0.14,
      width: p.width * 0.6,
      fontSize: p.width * 0.18,
      fill: brand.primary,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: '"Bebas Neue", Impact, sans-serif',
    });

    addTextbox(canvas, 'GRUDNIA · 2026', {
      left: cx,
      top: p.height * 0.3,
      width: p.width * 0.6,
      fontSize: p.width * 0.03,
      fill: brand.text,
      originX: 'center',
      textAlign: 'center',
      charSpacing: 100,
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Webinar:\nMarketing 2027', {
      left: cx,
      top: p.height * 0.45,
      width: p.width * 0.9,
      fontSize: p.width * 0.09,
      fill: brand.text,
      originX: 'center',
      fontWeight: 'bold',
      lineHeight: 1.1,
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, '📍 Online · 19:00', {
      left: cx,
      top: p.height * 0.72,
      width: p.width * 0.8,
      fontSize: p.width * 0.04,
      fill: brand.primary,
      originX: 'center',
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Zarezerwuj miejsce: postra.pl/event', {
      left: cx,
      top: p.height * 0.82,
      width: p.width * 0.8,
      fontSize: p.width * 0.032,
      fill: brand.text,
      originX: 'center',
      opacity: 0.7,
      fontFamily: brand.fontFamily,
    });
  },
};

const communityWelcome: DesignTemplate = {
  key: 'community-welcome',
  category: 'community',
  label: 'Powitanie społeczności',
  description: 'Powitanie nowych obserwujących',
  apply: (canvas, p, brand) => {
    clearCanvas(canvas, brand.background);
    const cx = p.width / 2;

    addTextbox(canvas, '👋', {
      left: cx,
      top: p.height * 0.14,
      width: p.width * 0.5,
      fontSize: p.width * 0.18,
      originX: 'center',
    });

    addTextbox(canvas, 'Witamy!', {
      left: cx,
      top: p.height * 0.36,
      width: p.width * 0.9,
      fontSize: p.width * 0.15,
      fill: brand.primary,
      originX: 'center',
      fontWeight: 'bold',
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, 'Cieszymy się że jesteście\nz nami. Społeczność\nliczy już 1000 osób.', {
      left: cx,
      top: p.height * 0.55,
      width: p.width * 0.85,
      fontSize: p.width * 0.045,
      fill: brand.text,
      originX: 'center',
      lineHeight: 1.4,
      fontFamily: brand.fontFamily,
    });

    addTextbox(canvas, '#dziękujemy #społeczność', {
      left: cx,
      top: p.height * 0.83,
      width: p.width * 0.8,
      fontSize: p.width * 0.035,
      fill: brand.primary,
      originX: 'center',
      fontFamily: brand.fontFamily,
    });
  },
};

export const BUILT_IN_TEMPLATES: DesignTemplate[] = [
  promoModern,
  quoteClassic,
  announcementBold,
  statsHighlight,
  tipNumbered,
  eventDate,
  communityWelcome,
];

export const applyTemplate = (
  template: DesignTemplate,
  canvas: fabric.Canvas,
  platform: PlatformSize,
  brand: BrandStyle
): void => {
  template.apply(canvas, platform, brand);
  canvas.renderAll();
};
