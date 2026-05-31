'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { composeVideo, ClipTooLongError } from './compositor-pipeline';
import { parseSrt, captionAt } from './srt';
import {
  fontFamilyForLabel,
  ensureFontLoaded,
  hexToRgba,
  drawBrandText,
} from './text-overlay';
import { useBrandKit } from './use-brand-kit';

interface VideoCaptionsProps {
  mediaId: string | null;
  /** The local clip bytes — when present we render captions in-browser, branded. */
  source: Blob | null;
  onCaptioned: (newMedia: { id: string; path: string }) => void;
}

export const VideoCaptions: FC<VideoCaptionsProps> = ({ mediaId, source, onCaptioned }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { kit } = useBrandKit();
  const [srt, setSrt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const [language, setLanguage] = useState('pl');

  const handleGenerate = useCallback(async () => {
    if (!mediaId) {
      toaster.show(
        t(
          'video_captions_no_media',
          'Najpierw wczytaj wideo (Wytnij / Z biblioteki), żeby je przepisać.'
        ),
        'warning'
      );
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`/media/${mediaId}/auto-caption`, {
        method: 'POST',
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        toaster.show(
          t('video_captions_failed', 'Generowanie napisów nie powiodło się.'),
          'warning'
        );
        return;
      }
      const data = await res.json();
      setSrt(data?.srt ?? '');
    } finally {
      setIsGenerating(false);
    }
  }, [mediaId, language, fetch, toaster, t]);

  const uploadResult = useCallback(
    async (blob: Blob) => {
      const formData = new FormData();
      formData.append('file', blob, `captioned-${Date.now()}.mp4`);
      const res = await fetch('/media/upload-simple', { method: 'POST', body: formData });
      const data = await res.json();
      if (data?.id && data?.path) onCaptioned({ id: data.id, path: data.path });
      else throw new Error('upload returned no media');
    },
    [fetch, onCaptioned]
  );

  const handleBurn = useCallback(async () => {
    if (!srt.trim() || isBurning) return;
    const segments = parseSrt(srt);
    if (!segments.length) {
      toaster.show(
        t('video_captions_no_segments', 'Nie rozpoznałem segmentów napisów (sprawdź format SRT).'),
        'warning'
      );
      return;
    }
    setIsBurning(true);
    setBurnProgress(0);
    try {
      if (source) {
        // Branded, in-browser render on the shared compositor — captions are a
        // timed overlay, same look as the rest of Postra Clip, no server ffmpeg.
        const fontFamily = fontFamilyForLabel(kit.font);
        const bandColor = hexToRgba(kit.secondaryColor, 0.6);
        await ensureFontLoaded(fontFamily, 48);
        const result = await composeVideo({
          file: source,
          onProgress: (r) => setBurnProgress(Math.round(r * 100)),
          drawOverlay: (ctx, { timestampSec, width, height }) => {
            const cap = captionAt(segments, timestampSec);
            if (cap) {
              drawBrandText(ctx, width, height, {
                text: cap,
                position: 'bottom',
                color: kit.textColor,
                bandColor,
                fontFamily,
                scale: 0.78,
              });
            }
          },
        });
        await uploadResult(result.blob);
      } else if (mediaId) {
        // Fallback: server burn-in when we don't hold the local bytes.
        const res = await fetch(`/media/${mediaId}/burn-captions`, {
          method: 'POST',
          body: JSON.stringify({ srt }),
        });
        if (!res.ok) {
          toaster.show(t('video_burn_failed', 'Wpalenie napisów nie powiodło się.'), 'warning');
          return;
        }
        const data = await res.json();
        if (data?.id && data?.path) onCaptioned({ id: data.id, path: data.path });
      } else {
        toaster.show(
          t('video_captions_no_media', 'Najpierw wczytaj wideo (Wytnij / Z biblioteki), żeby je przepisać.'),
          'warning'
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Postra:captions] burn failed:', err);
      toaster.show(
        err instanceof ClipTooLongError
          ? t('clip_too_long', 'Klip za długi do edycji w przeglądarce (limit 5 min). Użyj krótszego.')
          : t('video_burn_failed', 'Wpalenie napisów nie powiodło się.'),
        'warning'
      );
    } finally {
      setIsBurning(false);
    }
  }, [srt, isBurning, source, mediaId, kit, fetch, uploadResult, onCaptioned, toaster, t]);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-textColor/80">
        {t(
          'video_captions_explainer',
          'Whisper AI przepisuje mowę z wideo na napisy. Edytuj je, a potem wypalimy je w klip w Twoim brandzie.'
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-wide text-textColor/60">
          {t('video_captions_language', 'Język')}
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isGenerating || isBurning}
          className="text-xs px-2 py-1 rounded bg-newColColor border border-newBorder text-textColor"
        >
          <option value="pl">Polski</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="">{t('video_captions_auto', 'Auto-detect')}</option>
        </select>
        <Button
          loading={isGenerating}
          onClick={handleGenerate}
          disabled={!mediaId}
          className="!h-[28px] !text-xs"
        >
          ✨ {t('video_captions_generate', 'Generuj napisy')}
        </Button>
      </div>
      <textarea
        value={srt}
        onChange={(e) => setSrt(e.target.value)}
        placeholder={t(
          'video_captions_placeholder',
          'Po wygenerowaniu pojawią się tutaj napisy w formacie SRT. Edytuj je przed wpaleniem.'
        )}
        rows={12}
        disabled={isGenerating || isBurning}
        className="text-[11px] font-mono p-2 rounded bg-newColColor border border-newBorder text-textColor resize-none focus:outline-none focus:border-forth disabled:opacity-50 leading-relaxed"
      />
      <div className="flex justify-between items-center">
        <div className="text-[10px] text-textColor/50">
          {srt.trim().length > 0
            ? t('video_captions_lines', '{n} znaków SRT').replace('{n}', String(srt.length))
            : t('video_captions_empty', 'Brak napisów')}
        </div>
        <Button
          loading={isBurning}
          onClick={handleBurn}
          disabled={!srt.trim() || (!source && !mediaId)}
          className="!h-[28px] !text-xs"
        >
          🎨 {isBurning && source
            ? `${t('video_captions_burning', 'Wpalam…')} ${burnProgress}%`
            : t('video_captions_burn', 'Wpal w wideo')}
        </Button>
      </div>
      <div className="text-[10px] text-textColor/40 leading-snug">
        {source
          ? t(
              'video_captions_cost_browser',
              'Transkrypcja: ~$0.006/min (OpenAI credits). Napisy wypalane w przeglądarce, w kolorze/foncie Brand Kitu.'
            )
          : t(
              'video_captions_cost',
              'Koszt: ~$0.006/min wideo (płatne z OpenAI credits). Wpalenie zwraca nowy plik MP4.'
            )}
      </div>
    </div>
  );
};
