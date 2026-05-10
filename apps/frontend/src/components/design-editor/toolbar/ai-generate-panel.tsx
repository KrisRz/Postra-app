'use client';

import { FC, MutableRefObject, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../editor.store';
import { renderDesignSpec, PostDesignSpec } from '../utils/canvas-renderer';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';

interface Props {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

export const AiGeneratePanel: FC<Props> = ({ canvas }) => {
  const {
    aiPrompt,
    setAiPrompt,
    isGenerating,
    setGenerating,
    platform,
    pushHistory,
  } = useEditorStore();
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const user = useUser();
  const allowed = !!user?.tier?.image_generator;

  const generate = useCallback(async () => {
    if (!canvas.current) return;
    if (!aiPrompt.trim()) {
      toaster.show(t('ai_prompt_required', 'Please describe what you want to generate'), 'warning');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/media/generate-post-design', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt, platform: platform.key }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          toaster.show(t('ai_no_credits', 'No image generation credits left this month. Upgrade your plan.'), 'warning');
        } else {
          toaster.show(t('ai_generate_failed', 'AI generation failed. Try a different prompt.'), 'warning');
        }
        return;
      }

      const spec = (await res.json()) as PostDesignSpec;
      await renderDesignSpec(canvas.current, spec, platform);
      pushHistory(JSON.stringify(canvas.current.toJSON()));
    } catch {
      toaster.show(t('ai_generate_failed', 'AI generation failed. Try a different prompt.'), 'warning');
    } finally {
      setGenerating(false);
    }
  }, [canvas, aiPrompt, platform, fetch, toaster, t, setGenerating, pushHistory]);

  if (!allowed) {
    return (
      <div className="flex flex-col gap-2 text-[11px] text-textColor/60 leading-relaxed">
        <span className="text-[10px] uppercase tracking-wide text-textColor/60">
          {t('ai_generate', 'AI Generate')}
        </span>
        <p>
          {t(
            'ai_tier_required',
            'AI image generation is available on the Team plan and above.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-wide text-textColor/60">
        {t('ai_generate', 'AI Generate')}
      </span>
      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder={t(
          'ai_prompt_placeholder',
          'e.g. Letnia wyprzedaż -50% w sklepie odzieżowym'
        )}
        rows={4}
        disabled={isGenerating}
        className="text-xs p-2 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 resize-none focus:outline-none focus:border-forth disabled:opacity-50"
      />
      <Button
        loading={isGenerating}
        onClick={generate}
        className="!h-[34px] !text-xs"
      >
        {isGenerating
          ? t('ai_generating', 'Generating…')
          : t('ai_generate_button', '✨ Generate Design')}
      </Button>
      <p className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'ai_generate_hint',
          'AI generuje tło + tekst w jednym kroku. Trwa około 5-10 sekund.'
        )}
      </p>
    </div>
  );
};
