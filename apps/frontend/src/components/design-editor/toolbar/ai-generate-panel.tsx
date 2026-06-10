'use client';

import { FC, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../editor.store';
import { useCarouselStore, CarouselSlide } from '../carousel.store';
import { renderDesignSpec, PostDesignSpec } from '../utils/canvas-renderer';
import { useHolidays, getUpcomingHolidays } from '../utils/holidays';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/frontend/components/ui/button';
import { useBrandKit } from '@gitroom/frontend/components/video-studio/use-brand-kit';

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
    setTool,
  } = useEditorStore();
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const user = useUser();
  const allowed = !!user?.tier?.image_generator;
  const holidays = useHolidays();
  const upcoming = getUpcomingHolidays(holidays, 4, 90);
  const brandKit = useBrandKit();
  const abortRef = useRef<AbortController | null>(null);
  const [slidesCount, setSlidesCount] = useState(1);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(async () => {
    if (!canvas.current || isGenerating) return;
    if (!aiPrompt.trim()) {
      toaster.show(t('ai_prompt_required', 'Describe what you want to generate'), 'warning');
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setGenerating(true);
    try {
      const isCarousel = slidesCount > 1;
      const res = isCarousel
        ? await fetch('/media/generate-carousel-design', {
            method: 'POST',
            body: JSON.stringify({
              prompt: aiPrompt,
              platform: platform.key,
              slidesCount,
            }),
            signal: ctrl.signal,
          })
        : await fetch('/media/generate-post-design', {
            method: 'POST',
            body: JSON.stringify({ prompt: aiPrompt, platform: platform.key }),
            signal: ctrl.signal,
          });

      if (!res.ok) {
        let serverMessage = '';
        try {
          const body = await res.json();
          serverMessage = typeof body?.message === 'string' ? body.message : '';
        } catch {
          // backend returned non-JSON — ignore, fall through to generic copy
        }

        if (res.status === 402) {
          toaster.show(
            t('ai_no_credits', 'You ran out of AI credits this month. Upgrade your plan or wait for the new cycle.'),
            'warning'
          );
        } else if (res.status === 401 || res.status === 403) {
          toaster.show(
            t('ai_forbidden', 'AI is not available on your plan. Check your subscription settings.'),
            'warning'
          );
        } else if (res.status === 429) {
          toaster.show(
            t('ai_rate_limited', 'Too many requests — wait a few seconds and try again.'),
            'warning'
          );
        } else {
          toaster.show(
            serverMessage ||
              t('ai_generate_failed', 'AI generation failed. Try a different prompt or check your connection.'),
            'warning'
          );
        }
        return;
      }

      const data = await res.json();
      if (ctrl.signal.aborted) return;

      if (isCarousel) {
        const slideSpecs = (data?.slides ?? []) as PostDesignSpec[];
        if (!slideSpecs.length) {
          toaster.show(
            t('ai_generate_failed', 'AI generation failed. Try a different prompt or check your connection.'),
            'warning'
          );
          return;
        }
        const slides: CarouselSlide[] = [];
        for (let i = 0; i < slideSpecs.length; i += 1) {
          await renderDesignSpec(canvas.current, slideSpecs[i], platform);
          slides.push({
            id: `slide-${Date.now().toString(36)}-${i}`,
            canvasJson: JSON.stringify(canvas.current.toJSON()),
          });
        }
        useCarouselStore.getState().replaceAllSlides(slides);
        // The loop leaves the canvas on the LAST slide, but the strip activates
        // slide 1 — reload slide 1 so the canvas matches the highlighted thumbnail
        // (otherwise clicking thumbnail 1 is a no-op and the canvas looks stuck).
        await canvas.current.loadFromJSON(slides[0].canvasJson!);
        canvas.current.renderAll();
        pushHistory(slides[0].canvasJson!);
      } else {
        const spec = data as PostDesignSpec;
        await renderDesignSpec(canvas.current, spec, platform);
        pushHistory(JSON.stringify(canvas.current.toJSON()));
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      toaster.show(
        t('ai_generate_failed', 'AI generation failed. Try a different prompt or check your connection.'),
        'warning'
      );
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setGenerating(false);
    }
  }, [canvas, aiPrompt, platform, isGenerating, fetch, toaster, t, setGenerating, pushHistory, slidesCount]);

  if (!allowed) {
    return (
      <div className="flex flex-col gap-2 text-[11px] text-textColor/60 leading-relaxed">
        <span className="text-[10px] uppercase tracking-wide text-textColor/60">
          {t('ai_generate', 'AI Generate')}
        </span>
        <p>
          {t(
            'ai_tier_required',
            'AI is available on the Pro plan and above.'
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
      {!brandKit.loading && !brandKit.exists && (
        <div className="rounded-md bg-forth/10 border border-forth/30 px-2 py-1.5 flex flex-col gap-1.5">
          <p className="text-[10px] leading-snug text-textColor/80">
            🎨{' '}
            {t(
              'brand_kit_nudge',
              'Set up your Brand Kit once — AI will use your colours, font and logo in every design.'
            )}
          </p>
          <button
            onClick={() => setTool('brand')}
            className="self-start text-[10px] px-2 py-1 rounded bg-forth/20 hover:bg-forth/40 text-textColor transition-colors"
          >
            {t('brand_kit_nudge_cta', 'Set up brand')}
          </button>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-textColor/50">
            🗓 {t('holiday_suggestions', 'Upcoming occasions')}
          </span>
          <div className="flex flex-col gap-1">
            {upcoming.map((entry) => (
              <button
                key={entry.holiday.date}
                onClick={() =>
                  setAiPrompt(
                    `${t('holiday_post_prefix', 'Post for')} ${entry.holiday.localName}`
                  )
                }
                disabled={isGenerating}
                className="text-left text-[11px] px-2 py-1.5 rounded bg-newColColor/60 hover:bg-newColColor border border-newBorder/50 text-textColor/80 hover:text-textColor transition-colors disabled:opacity-50"
              >
                {t('holiday_upcoming', 'In')} {entry.days}{' '}
                {entry.days === 1
                  ? t('holiday_day', 'day')
                  : t('holiday_days', 'days')}
                : <strong>{entry.holiday.localName}</strong>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-textColor/40 leading-snug">
            {t(
              'holiday_or_custom',
              'Or type your own idea below — these are just suggestions.'
            )}
          </p>
        </div>
      )}
      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder={t(
          'ai_prompt_placeholder',
          'e.g. Summer sale -50% at a clothing store'
        )}
        rows={4}
        disabled={isGenerating}
        className="text-xs p-2 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 resize-none focus:outline-none focus:border-forth disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-wide text-textColor/60">
          {t('ai_slides_count', 'Slides')}
        </label>
        <select
          value={slidesCount}
          onChange={(e) => setSlidesCount(Number(e.target.value))}
          disabled={isGenerating}
          className="text-xs px-2 py-1 rounded bg-newColColor border border-newBorder text-textColor focus:outline-none focus:border-forth disabled:opacity-50"
          title={t('ai_slides_hint', 'Choose the number of slides for a carousel (1 = single post, 2-10 = carousel)')}
        >
          <option value={1}>1 ({t('ai_single_post', 'single')})</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5 ({t('ai_recommended', 'recommended')})</option>
          <option value={6}>6</option>
          <option value={7}>7</option>
          <option value={8}>8</option>
          <option value={9}>9</option>
          <option value={10}>10 ({t('ai_max', 'max')})</option>
        </select>
      </div>
      <Button
        loading={isGenerating}
        onClick={generate}
        className="!h-[34px] !text-xs"
      >
        {isGenerating
          ? t('ai_generating', 'Generating…')
          : slidesCount > 1
            ? t('ai_generate_carousel_button', '🎴 Generate carousel ({n})').replace('{n}', String(slidesCount))
            : t('ai_generate_button', '✨ Generate Design')}
      </Button>
      <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 px-2 py-1.5 text-[10px] leading-snug text-textColor/80">
        ⚠️{' '}
        {t(
          'ai_generate_warning',
          'AI creates a new design and replaces the current canvas. To keep your template, generate on an empty canvas or edit manually after generating.'
        )}
      </div>
      <p className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'ai_generate_hint',
          'AI generates the background + text in one step. Takes about 5-10 seconds.'
        )}
      </p>
    </div>
  );
};
