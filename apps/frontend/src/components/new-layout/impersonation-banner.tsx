'use client';

import { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Global "you are impersonating" strip. Without it the only Stop button lived
// two clicks away in Admin -> Users, which reads like being logged into the
// user's account with no way back.
export const ImpersonationBanner: FC<{ email?: string }> = ({ email }) => {
  const fetch = useFetch();
  const t = useT();

  const stop = useCallback(async () => {
    await fetch('/user/impersonate', {
      method: 'POST',
      body: JSON.stringify({ id: '' }),
    });
    window.location.href = '/admin/users';
  }, []);

  return (
    <div className="sticky top-0 z-[200] flex items-center justify-center gap-[12px] bg-amber-400 text-black text-[13px] font-[600] px-[16px] py-[8px] rounded-[10px] mb-[8px]">
      <span>
        {t('impersonating_as', 'Impersonating')}
        {email ? ` ${email}` : ''} — {t('impersonating_note', 'actions are real')}
      </span>
      <button
        type="button"
        onClick={stop}
        className="px-[12px] py-[3px] rounded-[6px] bg-black text-white text-[12px] cursor-pointer hover:opacity-80 transition-opacity"
      >
        {t('stop_impersonating', 'Stop')}
      </button>
    </div>
  );
};
