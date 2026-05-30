'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface AiUsageByType {
  type: string;
  totalCredits: number;
  count: number;
}

interface AiUsageTopOrg {
  orgId: string;
  orgName: string;
  totalCredits: number;
}

interface AiUsageResponse {
  from: string;
  to: string;
  byType: AiUsageByType[];
  topOrgs: AiUsageTopOrg[];
}

export const AdminAiUsageComponent = () => {
  const fetch = useFetch();
  const t = useT();

  const fetcher = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load AI usage');
      return res.json();
    },
    [fetch]
  );

  const { data, isLoading, error } = useSWR<AiUsageResponse>(
    '/admin/ai-usage',
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px] text-newTextColor opacity-60">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-red-400 p-[20px]">Failed to load AI usage data.</div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px] text-newTextColor">
      <div>
        <h1 className="text-[22px] font-[600]">{t('AI Usage')}</h1>
        <p className="text-[13px] opacity-60 mt-[4px]">
          {new Date(data.from).toLocaleDateString()} —{' '}
          {new Date(data.to).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {data.byType.map((entry) => (
          <div
            key={entry.type}
            className="bg-white/[0.03] border border-white/10 rounded-[12px] p-[16px]"
          >
            <div className="text-[12px] opacity-60 capitalize">{entry.type}</div>
            <div className="text-[28px] font-[600] mt-[4px]">
              {entry.totalCredits.toLocaleString()}
            </div>
            <div className="text-[12px] opacity-50 mt-[2px]">
              {entry.count.toLocaleString()} calls
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-[12px] overflow-hidden">
        <div className="px-[16px] py-[12px] border-b border-white/10 text-[14px] font-[500]">
          {t('Top Organizations by Usage')}
        </div>
        <div className="grid grid-cols-[1fr_140px] gap-[12px] px-[16px] py-[8px] text-[11px] uppercase opacity-50 border-b border-white/10">
          <div>Organization</div>
          <div className="text-right">Credits</div>
        </div>
        {data.topOrgs.length === 0 ? (
          <div className="px-[16px] py-[12px] text-[13px] opacity-50">
            No data available.
          </div>
        ) : (
          data.topOrgs.map((org) => (
            <div
              key={org.orgId}
              className="grid grid-cols-[1fr_140px] gap-[12px] px-[16px] py-[10px] text-[13px] border-b border-white/10 last:border-b-0"
            >
              <div>{org.orgName}</div>
              <div className="text-right">{org.totalCredits.toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
