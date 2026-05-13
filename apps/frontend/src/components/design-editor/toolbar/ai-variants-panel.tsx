'use client';

import { FC, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../editor.store';
import { renderSpecToCanvas, toStudioPlatform } from '../utils/spec-canvas-bridge';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { StudioSpec } from '@gitroom/nestjs-libraries/studio/studio-spec';

interface Props {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

interface Variant {
  label: string;
  spec: StudioSpec;
}

interface VariantsResponse {
  variants: Variant[];
  backgroundUrl: string | null;
}

const withBackground = (spec: StudioSpec, backgroundUrl: string | null): StudioSpec => {
  if (!backgroundUrl) return spec;
  return {
    ...spec,
    layers: [
      {
        id: `bg_${spec.platform}_${Math.random().toString(36).slice(2, 7)}`,
        kind: 'image',
        x: spec.width / 2,
        y: spec.height / 2,
        originX: 'center',
        originY: 'center',
        width: spec.width,
        height: spec.height,
        src: backgroundUrl,
      },
      ...spec.layers,
    ],
  };
};

export const AiVariantsPanel: FC<Props> = ({ canvas }) => {
  const { platform, pushHistory } = useEditorStore();
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const user = useUser();
  const allowed = !!user?.tier?.image_generator;
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(async () => {
    if (!canvas.current || busy) return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      toaster.show(t('variants_prompt_required', 'Opisz pomysł na post'), 'warning');
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setVariants([]);

    try {
      const res = await fetch('/media/generate-variants', {
        method: 'POST',
        body: JSON.stringify({
          prompt: trimmed,
          platform: toStudioPlatform(platform),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (res.status === 402) {
          toaster.show(t('ai_no_credits', 'Skończyły się kredyty AI.'), 'warning');
        } else {
          toaster.show(t('variants_failed', 'Nie udało się wygenerować wariantów.'), 'warning');
        }
        return;
      }

      const data = (await res.json()) as VariantsResponse;
      const merged = data.variants.map((v) => ({
        label: v.label,
        spec: withBackground(v.spec, data.backgroundUrl),
      }));
      setVariants(merged);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      toaster.show(t('variants_failed', 'Nie udało się wygenerować wariantów.'), 'warning');
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setBusy(false);
    }
  }, [canvas, busy, prompt, platform, fetch, t, toaster]);

  const apply = useCallback(
    async (variant: Variant) => {
      if (!canvas.current) return;
      await renderSpecToCanvas(canvas.current, variant.spec);
      pushHistory(JSON.stringify(canvas.current.toJSON()));
      toaster.show(
        `${t('variants_applied', 'Zastosowano wariant')}: ${variant.label}`,
        'success'
      );
    },
    [canvas, pushHistory, t, toaster]
  );

  if (!allowed) {
    return (
      <div className="text-[11px] text-textColor/60 leading-relaxed">
        {t('ai_tier_required', 'AI dostępne w planie Pro i wyżej.')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-textColor/60 mb-1">
          {t('variants_title', 'Warianty A/B')}
        </div>
        <p className="text-[11px] text-textColor/60 leading-snug">
          {t(
            'variants_intro',
            'AI wygeneruje 3 wersje tego samego pomysłu z różnymi nagłówkami i układem.'
          )}
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t(
          'variants_placeholder',
          'np. "Letnia wyprzedaż -30%, wszystkie kategorie"'
        )}
        rows={3}
        disabled={busy}
        className="text-xs p-2 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 resize-none focus:outline-none focus:border-forth disabled:opacity-50"
      />

      <Button loading={busy} onClick={generate} className="!h-[32px] !text-xs">
        {busy
          ? t('variants_running', 'Generuję 3 warianty…')
          : t('variants_run', '🎲 Wygeneruj 3 warianty')}
      </Button>

      {variants.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {variants.map((v, i) => (
            <button
              key={i}
              onClick={() => apply(v)}
              className="text-left p-2 rounded bg-newColColor hover:bg-forth hover:text-white text-textColor transition-colors group"
            >
              <div className="text-xs font-semibold">{v.label}</div>
              <div className="text-[10px] text-textColor/60 group-hover:text-white/70 mt-0.5">
                {v.spec.layers
                  .filter((l) => l.kind === 'text')
                  .slice(0, 2)
                  .map((l) => (l as { text?: string }).text)
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'variants_hint',
          'Tło DALL-E jest współdzielone między wariantami — różnią się nagłówkiem, layoutem, akcentami.'
        )}
      </p>
    </div>
  );
};
