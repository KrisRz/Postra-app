'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/frontend/components/ui/button';

interface VideoCaptionsProps {
  mediaId: string | null;
  onCaptioned: (newMedia: { id: string; path: string }) => void;
}

export const VideoCaptions: FC<VideoCaptionsProps> = ({ mediaId, onCaptioned }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [srt, setSrt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [language, setLanguage] = useState('pl');

  const handleGenerate = useCallback(async () => {
    if (!mediaId) {
      toaster.show(
        t(
          'video_captions_no_media',
          'Najpierw wyślij wytniętą wersję wideo (zakładka Wytnij → Użyj w poście).'
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

  const handleBurn = useCallback(async () => {
    if (!mediaId || !srt.trim()) return;
    setIsBurning(true);
    try {
      const res = await fetch(`/media/${mediaId}/burn-captions`, {
        method: 'POST',
        body: JSON.stringify({ srt }),
      });
      if (!res.ok) {
        toaster.show(
          t('video_burn_failed', 'Wpalenie napisów nie powiodło się.'),
          'warning'
        );
        return;
      }
      const data = await res.json();
      if (data?.id && data?.path) {
        onCaptioned({ id: data.id, path: data.path });
      }
    } finally {
      setIsBurning(false);
    }
  }, [mediaId, srt, fetch, onCaptioned, toaster, t]);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-textColor/80">
        {t(
          'video_captions_explainer',
          'Whisper AI generuje napisy z mowy w wideo. Możesz je edytować zanim wpalisz w obraz.'
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
            ? t('video_captions_lines', '{n} znaków SRT').replace(
                '{n}',
                String(srt.length)
              )
            : t('video_captions_empty', 'Brak napisów')}
        </div>
        <Button
          loading={isBurning}
          onClick={handleBurn}
          disabled={!srt.trim() || !mediaId}
          className="!h-[28px] !text-xs"
        >
          🔥 {t('video_captions_burn', 'Wpal w wideo')}
        </Button>
      </div>
      <div className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'video_captions_cost',
          'Koszt: ~$0.006/min wideo (płatne z OpenAI credits). Wpalenie zwraca nowy plik MP4.'
        )}
      </div>
    </div>
  );
};
