'use client';

import { FC, MutableRefObject, useCallback, useRef, useState } from 'react';
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

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const MagicLayersPanel: FC<Props> = ({ canvas }) => {
  const { platform, pushHistory } = useEditorStore();
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const user = useUser();
  const allowed = !!user?.tier?.image_generator;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const decompose = useCallback(
    async (file: File) => {
      if (!canvas.current) return;
      if (file.size > MAX_IMAGE_BYTES) {
        toaster.show(
          t('magic_too_big', 'Obraz jest za duży. Maks 4 MB.'),
          'warning'
        );
        return;
      }

      setBusy(true);
      try {
        const imageDataUrl = await readAsDataUrl(file);

        const res = await fetch('/media/decompose-image', {
          method: 'POST',
          body: JSON.stringify({
            imageDataUrl,
            platform: toStudioPlatform(platform),
          }),
        });

        if (!res.ok) {
          if (res.status === 402) {
            toaster.show(
              t('ai_no_credits', 'Skończyły się kredyty AI.'),
              'warning'
            );
          } else {
            toaster.show(
              t('magic_failed', 'Nie udało się rozłożyć obrazu na warstwy.'),
              'warning'
            );
          }
          return;
        }

        const spec = (await res.json()) as StudioSpec;
        await renderSpecToCanvas(canvas.current, spec);
        pushHistory(JSON.stringify(canvas.current.toJSON()));
        toaster.show(
          t('magic_done', 'Gotowe — edytuj poszczególne warstwy w panelu Warstwy.'),
          'success'
        );
      } catch {
        toaster.show(
          t('magic_failed', 'Nie udało się rozłożyć obrazu na warstwy.'),
          'warning'
        );
      } finally {
        setBusy(false);
      }
    },
    [canvas, platform, fetch, pushHistory, t, toaster]
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
          {t('magic_title', 'Magic Layers')}
        </div>
        <p className="text-[11px] text-textColor/60 leading-snug">
          {t(
            'magic_intro',
            'Wrzuć płaską grafikę. AI rozłoży ją na edytowalne warstwy tekstu, kształtów i tła.'
          )}
        </p>
      </div>

      <Button
        loading={busy}
        onClick={() => fileRef.current?.click()}
        className="!h-[32px] !text-xs"
      >
        {busy
          ? t('magic_running', 'Analizuję obraz…')
          : t('magic_upload', '🧩 Wybierz obraz')}
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) decompose(file);
          e.target.value = '';
        }}
      />

      <p className="text-[10px] text-textColor/40 leading-snug">
        {t(
          'magic_hint',
          'Działa najlepiej na grafikach z dużym tekstem (plakaty, cover-y, statystyki). Maks 4 MB.'
        )}
      </p>
    </div>
  );
};
