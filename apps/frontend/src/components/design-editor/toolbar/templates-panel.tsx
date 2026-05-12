'use client';

import { FC, MutableRefObject, useCallback, useMemo, useState } from 'react';
import * as fabric from 'fabric';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
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

export const TemplatesPanel: FC<TemplatesPanelProps> = ({ canvas }) => {
  const t = useT();
  const toaster = useToaster();
  const { platform, pushHistory } = useEditorStore();
  const [category, setCategory] = useState<TemplateCategory>('promo');

  const filtered = useMemo(
    () => BUILT_IN_TEMPLATES.filter((tpl) => tpl.category === category),
    [category]
  );

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
          t('template_apply_failed', 'Nie udało się zastosować szablonu'),
          'warning'
        );
      }
    },
    [canvas, platform, pushHistory, t, toaster]
  );

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
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

      <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-center text-[11px] text-textColor/50 py-4">
            {t('template_coming_soon', 'Wkrótce więcej szablonów w tej kategorii')}
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
          'Szablon nadpisuje aktualny canvas. Możesz cofnąć przez Ctrl+Z.'
        )}
      </p>
    </div>
  );
};
