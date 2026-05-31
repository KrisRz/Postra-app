'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

/**
 * The active organisation's Brand Kit, shared across Postra Clip features so a
 * clip's text reads the client's own colours/font — never a hardcoded brand
 * colour. Mirrors the shape returned by `GET /brand-kit`.
 */
export interface BrandKit {
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  font: string;
  tone: string;
}

export const BRAND_KIT_DEFAULTS: BrandKit = {
  logoPath: null,
  primaryColor: '#38bdf8',
  secondaryColor: '#0a0e1a',
  textColor: '#ffffff',
  font: 'Geist',
  tone: 'professional',
};

/**
 * Fetch the active org's Brand Kit once. Falls back to defaults on any failure
 * (no kit set yet, network error) so callers can always render.
 */
export function useBrandKit(): { kit: BrandKit; loading: boolean } {
  const fetch = useFetch();
  const [kit, setKit] = useState<BrandKit>(BRAND_KIT_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/brand-kit');
        if (!res.ok) return;
        const text = await res.text();
        if (!text) return;
        const data = JSON.parse(text);
        if (!cancelled && data) {
          setKit({
            logoPath: data.logoPath ?? null,
            primaryColor: data.primaryColor ?? BRAND_KIT_DEFAULTS.primaryColor,
            secondaryColor: data.secondaryColor ?? BRAND_KIT_DEFAULTS.secondaryColor,
            textColor: data.textColor ?? BRAND_KIT_DEFAULTS.textColor,
            font: data.font ?? BRAND_KIT_DEFAULTS.font,
            tone: data.tone ?? BRAND_KIT_DEFAULTS.tone,
          });
        }
      } catch {
        // Keep defaults — a clip should still render without a saved kit.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetch]);

  return { kit, loading };
}
