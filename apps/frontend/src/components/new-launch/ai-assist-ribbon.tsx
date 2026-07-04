'use client';

import { FC, useCallback, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface Props {
  content: string;
  platform?: string;
  onReplace: (html: string) => void;
}

const MIN_CONTENT_LEN = 10;

const ACTIONS: {
  key: string;
  labelKey: string;
  fallback: string;
  needsPlatform?: boolean;
}[] = [
  { key: 'improve', labelKey: 'ai_edit_improve', fallback: '✨ Improve' },
  { key: 'shorten', labelKey: 'ai_edit_shorten', fallback: 'Shorten' },
  { key: 'expand', labelKey: 'ai_edit_expand', fallback: 'Expand' },
  {
    key: 'adapt',
    labelKey: 'ai_edit_adapt',
    fallback: 'Adapt to platform',
    needsPlatform: true,
  },
  { key: 'fix_tone', labelKey: 'ai_edit_fix_tone', fallback: 'Fix tone' },
];

// The AI returns plain text; the editor stores <p>-per-line HTML, so wrap it.
const toHtml = (text: string) =>
  text
    .split('\n')
    .map((line) => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<p>${escaped || '<br>'}</p>`;
    })
    .join('');

export const AiAssistRibbon: FC<Props> = ({ content, platform, onReplace }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ready = plainText.length >= MIN_CONTENT_LEN;

  const run = useCallback(
    async (action: string) => {
      if (!ready || busy) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(action);

      try {
        const res = await fetch('/media/ai-edit', {
          method: 'POST',
          body: JSON.stringify({ text: plainText, action, platform }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          toaster.show(
            res.status === 402
              ? t('ai_no_credits', 'You ran out of AI credits.')
              : t(
                  'ai_edit_failed',
                  'Could not rewrite the text — try again later.'
                ),
            'warning'
          );
          return;
        }

        const data = (await res.json()) as { text: string };
        if (data?.text) onReplace(toHtml(data.text));
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          toaster.show(
            t('ai_edit_failed', 'Could not rewrite the text — try again later.'),
            'warning'
          );
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setBusy(null);
      }
    },
    [ready, busy, plainText, platform, fetch, t, toaster, onReplace]
  );

  if (!ready) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {ACTIONS.filter((a) => !a.needsPlatform || platform).map((a) => (
        <button
          key={a.key}
          onClick={() => run(a.key)}
          disabled={!!busy}
          className="text-[10px] px-2 py-1 rounded bg-newColColor hover:bg-forth hover:text-white text-textColor/80 transition-colors disabled:opacity-50"
        >
          {busy === a.key
            ? t('ai_edit_running', 'Rewriting…')
            : t(a.labelKey, a.fallback)}
        </button>
      ))}
    </div>
  );
};
