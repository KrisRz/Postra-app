'use client';

import { ReactNode, useCallback, useRef } from 'react';
import { FetchWrapperComponent } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useReturnUrl } from '@gitroom/frontend/app/(app)/auth/return.url.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export default function LayoutContext(params: { children: ReactNode }) {
  if (params?.children) {
    // eslint-disable-next-line react/no-children-prop
    return <LayoutContextInner children={params.children} />;
  }
  return <></>;
}
export function setCookie(cname: string, cvalue: string, exdays: number) {
  if (typeof document === 'undefined') {
    return;
  }
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}
function LayoutContextInner(params: { children: ReactNode }) {
  const returnUrl = useReturnUrl();
  const { backendUrl, isGeneral, isSecured } = useVariables();
  const toaster = useToaster();
  const t = useT();
  // parallel requests can all hit 429 at once — show the toast at most once per 5s
  const last429 = useRef(0);
  const afterRequest = useCallback(
    async (url: string, options: RequestInit, response: Response) => {
      if (
        typeof window !== 'undefined' &&
        (window.location.href.includes('/p/') ||
          window.location.pathname.startsWith('/provider/'))
      ) {
        return true;
      }
      const headerAuth =
        response?.headers?.get('auth') || response?.headers?.get('Auth');
      const showOrg =
        response?.headers?.get('showorg') || response?.headers?.get('Showorg');
      const impersonate =
        response?.headers?.get('impersonate') ||
        response?.headers?.get('Impersonate');
      const logout =
        response?.headers?.get('logout') || response?.headers?.get('Logout');
      if (headerAuth) {
        setCookie('auth', headerAuth, 365);
      }
      if (showOrg) {
        setCookie('showorg', showOrg, 365);
      }
      if (impersonate) {
        setCookie('impersonate', impersonate, 365);
      }
      if (logout && !isSecured) {
        setCookie('auth', '', -10);
        setCookie('showorg', '', -10);
        setCookie('impersonate', '', -10);
        window.location.href = '/';
        return true;
      }
      const reloadOrOnboarding =
        response?.headers?.get('reload') ||
        response?.headers?.get('onboarding');
      if (reloadOrOnboarding) {
        const getAndClear = returnUrl.getAndClear();
        if (getAndClear) {
          window.location.href = getAndClear;
          return true;
        }
      }
      if (response?.headers?.get('onboarding')) {
        window.location.href = isGeneral
          ? '/launches?onboarding=true'
          : '/analytics?onboarding=true';
        return true;
      }

      if (response?.headers?.get('reload')) {
        window.location.reload();
        return true;
      }

      if (response.status === 401 || response?.headers?.get('logout')) {
        if (!isSecured) {
          setCookie('auth', '', -10);
          setCookie('showorg', '', -10);
          setCookie('impersonate', '', -10);
        }
        window.location.href = '/';
      }
      if (response.status === 406) {
        if (
          await deleteDialog(
            'You are currently on a trial. To use this feature, you need to end it.',
            'End the trial and charge now',
            'Trial'
          )
        ) {
          window.open('/billing?finishTrial=true', '_blank');
          return false;
        }
        return false;
      }

      if (response.status === 402) {
        if (
          await deleteDialog(
            (
              await response.json()
            ).message,
            'Go to billing',
            'Payment required'
          )
        ) {
          window.open('/billing', '_blank');
          return false;
        }
        return true;
      }

      if (response.status === 429) {
        if (Date.now() - last429.current > 5000) {
          last429.current = Date.now();
          toaster.show(
            t(
              'too_many_requests',
              'Too many requests — please wait a moment and try again.'
            ),
            'warning'
          );
        }
        return true;
      }
      return true;
    },
    []
  );
  return (
    <FetchWrapperComponent baseUrl={backendUrl} afterRequest={afterRequest}>
      {params?.children || <></>}
    </FetchWrapperComponent>
  );
}
