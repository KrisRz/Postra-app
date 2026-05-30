'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const tabs = [
  { key: 'stats', path: '/admin/stats' },
  { key: 'growth', path: '/admin/growth' },
  { key: 'organizations', path: '/admin/organizations' },
  { key: 'subscriptions', path: '/admin/subscriptions' },
  { key: 'ai-usage', path: '/admin/ai-usage' },
  { key: 'health', path: '/admin/health' },
  { key: 'errors', path: '/admin/errors' },
  { key: 'users', path: '/admin/users' },
  { key: 'announcements', path: '/admin/announcements' },
] as const;

const tabLabels: Record<string, [string, string]> = {
  stats: ['admin_stats', 'Stats'],
  growth: ['admin_growth_tab', 'Growth'],
  organizations: ['admin_organizations', 'Organizations'],
  subscriptions: ['admin_subscriptions', 'Subscriptions'],
  'ai-usage': ['admin_ai_usage', 'AI Usage'],
  health: ['admin_health', 'System Health'],
  errors: ['admin_errors', 'Errors'],
  users: ['admin_users', 'Users'],
  announcements: ['admin_announcements', 'Announcements'],
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const user = useUser();
  const pathname = usePathname();
  const t = useT();

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center text-newTextColor/60">
        {t('no_access', 'You do not have access to this page.')}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <nav className="flex gap-[2px] px-[20px] pt-[16px] pb-[4px]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          const [i18nKey, fallback] = tabLabels[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={clsx(
                'px-[16px] py-[8px] rounded-[8px] text-[13px] font-[500] transition-all duration-150',
                isActive
                  ? 'bg-white/10 text-newTextColor border border-white/15'
                  : 'text-newTextColor/50 hover:text-newTextColor/80 hover:bg-white/[0.04] border border-transparent'
              )}
            >
              {t(i18nKey, fallback)}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
