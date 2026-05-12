'use client';

import { FC, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useEditorStore } from './editor.store';

const WELCOME_KEY = 'postra:studio-welcomed';

const isFirstTime = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !window.localStorage.getItem(WELCOME_KEY);
  } catch {
    return false;
  }
};

const markWelcomed = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WELCOME_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — non-fatal, just shows welcome again next time
  }
};

export const WelcomeModal: FC = () => {
  const t = useT();
  const { setTool } = useEditorStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isFirstTime()) setOpen(true);
  }, []);

  const close = () => {
    markWelcomed();
    setOpen(false);
  };

  const startWithTool = (tool: 'templates' | 'ai') => {
    setTool(tool);
    close();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-newBgColorInner rounded-lg shadow-2xl border border-newBorder p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🎨</div>
          <h2 className="text-xl font-semibold text-textColor mb-1">
            {t('welcome_title', 'Witaj w Studio')}
          </h2>
          <p className="text-sm text-textColor/60">
            {t(
              'welcome_subtitle',
              'Twórz grafiki na social media w sekundy. Od czego chcesz zacząć?'
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => startWithTool('templates')}
            className="text-left p-4 rounded-md bg-newColColor hover:bg-forth hover:text-white text-textColor transition-colors group"
          >
            <div className="text-base font-semibold flex items-center gap-2">
              <span>📐</span>
              <span>{t('welcome_cta_templates', 'Zacznij od szablonu')}</span>
            </div>
            <div className="text-xs text-textColor/60 group-hover:text-white/70 mt-1">
              {t(
                'welcome_desc_templates',
                'Wybierz z gotowych projektów PL i dostosuj'
              )}
            </div>
          </button>

          <button
            onClick={() => startWithTool('ai')}
            className="text-left p-4 rounded-md bg-newColColor hover:bg-forth hover:text-white text-textColor transition-colors group"
          >
            <div className="text-base font-semibold flex items-center gap-2">
              <span>✨</span>
              <span>{t('welcome_cta_ai', 'Wygeneruj AI')}</span>
            </div>
            <div className="text-xs text-textColor/60 group-hover:text-white/70 mt-1">
              {t(
                'welcome_desc_ai',
                'Opisz pomysł, AI stworzy projekt z tłem i tekstem'
              )}
            </div>
          </button>

          <button
            onClick={close}
            className="text-left p-4 rounded-md bg-newColColor/50 hover:bg-newColColor text-textColor transition-colors group"
          >
            <div className="text-base font-semibold flex items-center gap-2">
              <span>◻</span>
              <span>{t('welcome_cta_blank', 'Pusty canvas')}</span>
            </div>
            <div className="text-xs text-textColor/60 mt-1">
              {t('welcome_desc_blank', 'Zacznij od zera, dodaj swoje elementy')}
            </div>
          </button>
        </div>

        <button
          onClick={close}
          className="absolute top-3 right-3 text-textColor/40 hover:text-textColor text-xl leading-none"
          aria-label={t('welcome_close', 'Zamknij')}
        >
          ×
        </button>
      </div>
    </div>
  );
};
