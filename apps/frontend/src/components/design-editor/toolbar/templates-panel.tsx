'use client';

import { FC, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useEditorStore } from '../editor.store';
import {
  BUILT_IN_TEMPLATES,
  applyTemplate,
} from '../templates/built-in-templates';
import {
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  DEFAULT_BRAND,
  BrandStyle,
} from '../templates/template-types';

interface TemplatesPanelProps {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LEN = 3;

export const TemplatesPanel: FC<TemplatesPanelProps> = ({ canvas }) => {
  const t = useT();
  const toaster = useToaster();
  const fetch = useFetch();
  const { platform, pushHistory } = useEditorStore();
  const [category, setCategory] = useState<TemplateCategory>('promo');
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < MIN_SEARCH_LEN) {
      setSearchHits(null);
      searchAbort.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    searchAbort.current?.abort();
    searchAbort.current = ctrl;
    const id = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('/media/search-templates', {
          method: 'POST',
          signal: ctrl.signal,
          body: JSON.stringify({
            query: query.trim(),
            templates: BUILT_IN_TEMPLATES.map((tpl) => ({
              id: tpl.key,
              text: `${tpl.label}. ${tpl.description}. Kategoria: ${tpl.category}.`,
            })),
          }),
        });
        if (!res.ok) {
          setSearchHits([]);
          return;
        }
        const hits = (await res.json()) as { id: string; score: number }[];
        setSearchHits(hits.filter((h) => h.score > 0.2).map((h) => h.id));
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setSearchHits([]);
        }
      } finally {
        if (searchAbort.current === ctrl) searchAbort.current = null;
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [query, fetch]);

  useEffect(() => () => searchAbort.current?.abort(), []);

  const filtered = useMemo(() => {
    if (searchHits) {
      const set = new Set(searchHits);
      return searchHits
        .map((id) => BUILT_IN_TEMPLATES.find((tpl) => tpl.key === id))
        .filter((tpl): tpl is (typeof BUILT_IN_TEMPLATES)[number] => !!tpl && set.has(tpl.key));
    }
    return BUILT_IN_TEMPLATES.filter((tpl) => tpl.category === category);
  }, [category, searchHits]);

  const handleApply = useCallback(
    async (templateKey: string) => {
      if (!canvas.current) return;
      const tpl = BUILT_IN_TEMPLATES.find((t) => t.key === templateKey);
      if (!tpl) return;

      try {
        const brand: BrandStyle = DEFAULT_BRAND;
        applyTemplate(tpl, canvas.current, platform, brand);
        pushHistory(JSON.stringify(canvas.current.toJSON()));
      } catch {
        toaster.show(
          t('template_apply_failed', 'Failed to apply template'),
          'warning'
        );
      }
    },
    [canvas, platform, pushHistory, t, toaster]
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t(
          'template_search_placeholder',
          '🔍 Search templates (e.g. "holiday promo")'
        )}
        className="text-xs px-2 py-1.5 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 focus:outline-none focus:border-forth"
      />
      {!searchHits && (
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={clsx(
                'text-[10px] px-2 py-1 rounded transition-colors',
                category === c.key
                  ? 'bg-forth text-white'
                  : 'bg-newColColor text-textColor/70 hover:text-textColor'
              )}
              title={t(c.labelKey, c.fallback)}
            >
              {c.emoji} {t(c.labelKey, c.fallback)}
            </button>
          ))}
        </div>
      )}
      {searching && (
        <div className="text-[10px] text-textColor/50">
          {t('template_searching', 'Searching…')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {filtered.length === 0 && (
          <div className="text-center text-[11px] text-textColor/50 py-4">
            {t('template_coming_soon', 'More templates coming soon in this category')}
          </div>
        )}
        {filtered.map((tpl) => (
          <button
            key={tpl.key}
            onClick={() => handleApply(tpl.key)}
            className="text-left p-2 rounded bg-newColColor hover:bg-forth hover:text-white text-textColor transition-colors group"
          >
            <div className="text-xs font-semibold">{tpl.label}</div>
            <div className="text-[10px] text-textColor/60 group-hover:text-white/70 mt-0.5">
              {tpl.description}
            </div>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'template_hint',
          'A template overwrites the current canvas. You can undo with Ctrl+Z.'
        )}
      </p>
    </div>
  );
};
