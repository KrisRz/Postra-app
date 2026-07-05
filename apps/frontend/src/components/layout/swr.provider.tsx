'use client';

import { ReactNode, useCallback, useRef } from 'react';
import { SWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Global SWR error handler. Without this a failed `/user/self` or
 * `/integrations/list` silently renders an empty screen ("No channels yet")
 * and nothing is logged. We always emit a `[Postra:swr]` diagnostic and — at
 * most once every 5s so parallel failures don't spam — surface a toast.
 *
 * Note: a 402/406 response is intercepted globally (layout.context), which
 * makes customFetch reject with a `FetchHandledError` marker — the trial /
 * payment dialog already owns that case, so we ignore it here rather than
 * stacking a generic "something went wrong" toast on top of the dialog. Only
 * real transport/parse failures reach the toast.
 */
export const SwrProvider = ({ children }: { children: ReactNode }) => {
  const toaster = useToaster();
  const t = useT();
  const lastToast = useRef(0);

  const onError = useCallback(
    (error: unknown, key: string) => {
      // Already surfaced globally by the trial/payment dialog — not a load failure.
      if ((error as { name?: string })?.name === 'FetchHandledError') {
        return;
      }
      console.error('[Postra:swr]', key, error);
      if (Date.now() - lastToast.current > 5000) {
        lastToast.current = Date.now();
        toaster.show(
          t(
            'data_load_error',
            'Something went wrong loading data — please refresh the page.'
          ),
          'warning'
        );
      }
    },
    [toaster, t]
  );

  return <SWRConfig value={{ onError }}>{children}</SWRConfig>;
};
