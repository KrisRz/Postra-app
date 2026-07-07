'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import dynamic from 'next/dynamic';
import EmailNotificationsComponent from '@gitroom/frontend/components/settings/email-notifications.component';
import ShortlinkPreferenceComponent from '@gitroom/frontend/components/settings/shortlink-preference.component';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import LanguagePreferenceComponent from '@gitroom/frontend/components/settings/language-preference.component';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);

export const GlobalSettings = () => {
  const t = useT();
  return (
    <div className="flex flex-col">
      <h3 className="text-[22px] font-[650] tracking-[-0.2px] text-newTextColor">
        {t('global_settings', 'Global Settings')}
      </h3>
      <p className="text-[12.5px] text-newTextColor/55 mt-[3px]">
        {t('global_settings_sub', 'Account, notification and link preferences')}
      </p>
      <LanguagePreferenceComponent />
      <MetricComponent />
      <EmailNotificationsComponent />
      <ShortlinkPreferenceComponent />
      <DeleteAccountComponent />
    </div>
  );
};
