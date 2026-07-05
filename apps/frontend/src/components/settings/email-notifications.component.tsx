'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { readResponseError } from '@gitroom/helpers/utils/response.error';
import useSWR from 'swr';
import { Slider } from '@gitroom/react/form/slider';
import { Card } from '@gitroom/frontend/components/ui/card';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface EmailNotifications {
  sendSuccessEmails: boolean;
  sendFailureEmails: boolean;
  sendStreakEmails: boolean;
}

export const useEmailNotifications = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/user/email-notifications')).json();
  }, []);

  return useSWR<EmailNotifications>('email-notifications', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const EmailNotificationsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading } = useEmailNotifications();

  const [localSettings, setLocalSettings] = useState<EmailNotifications>({
    sendSuccessEmails: true,
    sendFailureEmails: true,
    sendStreakEmails: true,
  });

  // Keep a ref to always have the latest state
  const settingsRef = useRef(localSettings);
  settingsRef.current = localSettings;

  // Sync local state with fetched data
  useEffect(() => {
    if (data) {
      setLocalSettings(data);
    }
  }, [data]);

  const updateSetting = useCallback(
    async (key: keyof EmailNotifications, value: boolean) => {
      // Use ref to get the latest state
      const previousSettings = settingsRef.current;
      const newData = {
        ...previousSettings,
        [key]: value,
      };

      // Update local state immediately (optimistic)
      setLocalSettings(newData);

      try {
        const response = await fetch('/user/email-notifications', {
          method: 'POST',
          body: JSON.stringify(newData),
        });
        if (!response.ok) {
          setLocalSettings(previousSettings); // roll back the toggle
          toaster.show(
            `${t(
              'settings_update_failed',
              'Could not update settings'
            )}: ${await readResponseError(response)}`,
            'warning'
          );
          return;
        }
        toaster.show(t('settings_updated', 'Settings updated'), 'success');
      } catch (e) {
        setLocalSettings(previousSettings); // roll back the toggle
        console.error(
          '[Postra:settings] email-notifications update failed',
          e
        );
        toaster.show(
          t('settings_update_failed', 'Could not update settings'),
          'warning'
        );
      }
    },
    []
  );

  const handleSuccessEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendSuccessEmails', value === 'on');
    },
    [updateSetting]
  );

  const handleFailureEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendFailureEmails', value === 'on');
    },
    [updateSetting]
  );

  const handleStreakEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendStreakEmails', value === 'on');
    },
    [updateSetting]
  );

  if (isLoading) {
    return (
      <Card className="my-[16px] p-[24px]">
        <div className="animate-pulse">
          {t('loading', 'Loading...')}
        </div>
      </Card>
    );
  }

  return (
    <Card className="my-[16px] p-[24px] flex flex-col gap-[24px]">
      <div className="text-[15px] font-[600]">
        {t('email_notifications', 'Email Notifications')}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('success_emails', 'Success Emails')}
          </div>
          <div className="text-[12px] text-newTextColor/55">
            {t(
              'success_emails_description',
              'Receive email notifications when posts are published successfully'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendSuccessEmails ? 'on' : 'off'}
          onChange={handleSuccessEmailsChange}
          fill={true}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('failure_emails', 'Failure Emails')}
          </div>
          <div className="text-[12px] text-newTextColor/55">
            {t(
              'failure_emails_description',
              'Receive email notifications when posts fail to publish'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendFailureEmails ? 'on' : 'off'}
          onChange={handleFailureEmailsChange}
          fill={true}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('streak_emails', 'Streak Reminder Emails')}
          </div>
          <div className="text-[12px] text-newTextColor/55">
            {t(
              'streak_emails_description',
              'Receive email reminders when your posting streak is about to end'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendStreakEmails ? 'on' : 'off'}
          onChange={handleStreakEmailsChange}
          fill={true}
        />
      </div>
    </Card>
  );
};

export default EmailNotificationsComponent;

