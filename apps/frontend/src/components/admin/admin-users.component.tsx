'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Button } from '@gitroom/react/form/button';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { ImportDebugPostModal } from '@gitroom/frontend/components/launches/import-debug-post.modal';

const Subscription = () => {
  const fetch = useFetch();
  const t = useT();

  const addSubscription: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback(async (e) => {
      const value = e.target.value;
      if (
        await deleteDialog(
          'Are you sure you want to add a user subscription?',
          'Add'
        )
      ) {
        await fetch('/billing/add-subscription', {
          method: 'POST',
          body: JSON.stringify({ subscription: value }),
        });
        window.location.reload();
      }
    }, []);

  return (
    <Select
      onChange={addSubscription}
      hideErrors={true}
      disableForm={true}
      name="sub"
      label=""
      value=""
    >
      <option>
        {t('add_free_subscription', '-- ADD FREE SUBSCRIPTION --')}
      </option>
      {Object.keys(pricing)
        .filter((f) => !f.includes('FREE'))
        .map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
    </Select>
  );
};

export const AdminUsersComponent = () => {
  const fetch = useFetch();
  const [name, setName] = useState('');
  const { isSecured, billingEnabled } = useVariables();
  const user = useUser();
  const t = useT();
  const { openModal } = useModals();

  const load = useCallback(async () => {
    if (!name) return [];
    return (await fetch(`/user/impersonate?name=${name}`)).json();
  }, [name]);

  const stopImpersonating = useCallback(async () => {
    if (!isSecured) {
      setCookie('impersonate', '', -10);
    } else {
      await fetch(`/user/impersonate`, {
        method: 'POST',
        body: JSON.stringify({ id: '' }),
      });
    }
    window.location.reload();
  }, []);

  const setUser = useCallback(
    (userId: string) => async () => {
      await fetch(`/user/impersonate`, {
        method: 'POST',
        body: JSON.stringify({ id: userId }),
      });
      window.location.reload();
    },
    []
  );

  const handleImportDebugPost = useCallback(() => {
    openModal({
      title: t('import_debug_post', 'Import Debug Post'),
      maxSize: 800,
      children: (close) => <ImportDebugPostModal close={close} />,
    });
  }, []);

  const { data } = useSWR(`/impersonate-${name}`, load, {
    refreshWhenHidden: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    revalidateIfStale: false,
    refreshInterval: 0,
  });

  const mapData = useMemo(() => {
    return data?.map((curr: any) => ({
      id: curr.id,
      name: curr.user.name,
      email: curr.user.email,
    }));
  }, [data]);

  return (
    <div className="flex flex-col gap-[20px]">
      <h2 className="text-[20px] font-[600]">
        {t('admin_users', 'Users')}
      </h2>

      {user?.impersonate && (
        <div className="flex items-center gap-[12px] p-[12px] rounded-[8px] bg-forth/20 border border-forth/30">
          <span className="text-[14px]">
            {t('currently_impersonating', 'Currently Impersonating')}
          </span>
          <Button onClick={stopImpersonating} className="!bg-red-600 rounded-[8px] text-[12px]">
            {t('stop_impersonating', 'Stop')}
          </Button>
          {user?.tier?.current === 'FREE' && <Subscription />}
        </div>
      )}

      <div className="flex items-center gap-[12px]">
        <div className="flex-1 max-w-[500px]">
          <Input
            autoComplete="off"
            placeholder={t('search_user_placeholder', 'Search by name or email...')}
            name="impersonate"
            disableForm={true}
            label=""
            removeError={true}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button onClick={handleImportDebugPost} className="rounded-[8px] text-[12px]">
          {t('import_debug_post', 'Import Debug Post')}
        </Button>
      </div>

      {!!mapData?.length && (
        <div className="rounded-[8px] border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/10 bg-white/[0.03]">
                <th className="p-[12px] text-[13px] font-[500] text-newTextColor/60">ID</th>
                <th className="p-[12px] text-[13px] font-[500] text-newTextColor/60">
                  {t('name', 'Name')}
                </th>
                <th className="p-[12px] text-[13px] font-[500] text-newTextColor/60">
                  {t('email', 'Email')}
                </th>
                <th className="p-[12px] text-[13px] font-[500] text-newTextColor/60" />
              </tr>
            </thead>
            <tbody>
              {mapData.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="p-[12px] text-[13px] font-mono text-newTextColor/50">
                    ...{u.id.split('-').at(-1)}
                  </td>
                  <td className="p-[12px] text-[13px]">{u.name}</td>
                  <td className="p-[12px] text-[13px]">{u.email}</td>
                  <td className="p-[12px]">
                    <Button
                      onClick={setUser(u.id)}
                      className="rounded-[8px] text-[12px]"
                    >
                      {t('impersonate', 'Impersonate')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {name && !mapData?.length && (
        <div className="text-[14px] text-newTextColor/40 py-[20px] text-center">
          {t('no_users_found', 'No users found')}
        </div>
      )}
    </div>
  );
};
