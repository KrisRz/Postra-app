'use client';

import React, { useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Card } from '@gitroom/frontend/components/ui/card';
import { Button } from '@gitroom/frontend/components/ui/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// RODO right to erasure + Meta data-deletion. Calls POST /user/delete which
// permanently removes the account and solely-owned organizations (incl. OAuth
// tokens) and clears the session. Requires typing a confirmation word.
const CONFIRM_WORD = 'DELETE';

const DeleteAccountComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  const deleteAccount = async () => {
    if (!confirmed || deleting) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/user/delete', { method: 'POST' });
      if (!res.ok) {
        throw new Error('failed');
      }
      toaster.show(t('account_deleted', 'Your account has been deleted'), 'success');
      window.location.href = '/';
    } catch (e) {
      setDeleting(false);
      toaster.show(
        t('account_delete_failed', 'Could not delete the account. Please try again.'),
        'warning'
      );
    }
  };

  return (
    <Card className="my-[16px] p-[24px] flex flex-col gap-[16px] border border-[rgba(248,113,113,0.4)]">
      <div className="text-[15px] font-[600] text-[#fca5a5]">
        {t('danger_zone', 'Danger zone')}
      </div>
      <div className="text-[13px] text-newTextColor/70 max-w-[560px]">
        {t(
          'delete_account_description',
          'Permanently deleting your account erases your data, connected channels (including access tokens), scheduled posts and media. Organizations where you are the only member will be deleted entirely. This action cannot be undone. Billing records required by law are retained in line with our privacy policy.'
        )}
      </div>
      <div className="flex flex-col gap-[8px] max-w-[420px]">
        <label className="text-[12px] text-newTextColor/55" htmlFor="confirm-delete-account">
          {t('type_to_confirm', 'Type')} <b>{CONFIRM_WORD}</b>{' '}
          {t('type_to_confirm_2', 'to confirm')}
        </label>
        <input
          id="confirm-delete-account"
          type="text"
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={CONFIRM_WORD}
          className="h-[38px] px-[12px] rounded-[10px] bg-white/[0.06] border border-white/[0.12] text-newTextColor text-[13.5px] outline-none focus:border-[rgba(248,113,113,0.5)]"
        />
      </div>
      <div>
        <Button variant="danger" disabled={!confirmed} loading={deleting} onClick={deleteAccount}>
          {deleting
            ? t('deleting', 'Deleting…')
            : t('delete_my_account', 'Delete my account')}
        </Button>
      </div>
    </Card>
  );
};

export default DeleteAccountComponent;
