'use client';

import { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const REGION = 'eu-west-2';
const CW = `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}`;

const links: { name: string; desc: string; href: string }[] = [
  { name: 'CloudWatch', desc: 'RAM, dysk, CPU, RDS, ALB · dashboard postra-dev', href: `${CW}#dashboards/dashboard/postra-dev` },
  { name: 'Alarms', desc: '7 alarms → email (5xx, RAM, disk, RDS, recovery)', href: `${CW}#alarmsV2:` },
  { name: 'Status page', desc: 'status.postra.pl · uptime + response time', href: 'https://status.postra.pl' },
  { name: 'Sentry', desc: 'errors + traces (FE + BE)', href: 'https://sentry.io' },
];

const teaser: string[] = ['Request rate', 'Latency p95', 'Publish success (Temporal)', 'AI cost / day'];

const Section: FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex items-baseline gap-[9px] mt-[26px] mb-[2px]">
    <span className="text-[13px] font-[600] text-newTextColor">{title}</span>
    {hint && <span className="text-[11.5px] text-newTextColor/50">{hint}</span>}
  </div>
);

export const AdminDashboardsComponent: FC = () => {
  const t = useT();

  return (
    <div className="flex flex-col gap-[4px] text-newTextColor">
      <div>
        <h1 className="text-[22px] font-[650] tracking-[-0.2px]">
          {t('admin_dashboards', 'Dashboards')}
        </h1>
        <p className="text-[12.5px] text-newTextColor/55 mt-[3px]">
          {t('admin_dashboards_sub', 'Monitoring & observability — jedno miejsce na wszystkie panele')}
        </p>
      </div>

      {/* Launch cards */}
      <Section title={t('admin_dashboards_open', 'Otwórz panel')} hint={t('admin_dashboards_open_hint', '— linki do pełnych dashboardów')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-[6px] bg-white/[0.03] border border-white/10 rounded-[16px] p-[16px] backdrop-blur-[8px] transition-all duration-150 hover:border-[rgba(56,189,248,0.4)] hover:bg-white/[0.06] hover:-translate-y-[1px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-[600] text-[14px]">{l.name}</span>
              <span className="text-[#38bdf8] text-[12px]">↗</span>
            </div>
            <span className="text-newTextColor/55 text-[12px]">{l.desc}</span>
          </a>
        ))}
      </div>

      {/* Live uptime — embedded status page */}
      <Section title={t('admin_dashboards_uptime', 'Live uptime')} hint={t('admin_dashboards_uptime_hint', '— wbudowany status.postra.pl')} />
      <div className="bg-white/[0.03] border border-white/10 rounded-[16px] overflow-hidden backdrop-blur-[8px]">
        <iframe
          src="https://status.postra.pl"
          title="Postra status"
          className="w-full h-[420px] border-0"
          loading="lazy"
        />
      </div>

      {/* Tier 1 teaser */}
      <Section title={t('admin_dashboards_metrics', 'Metryki aplikacji')} hint={t('admin_dashboards_metrics_hint', '— wbudowane panele Grafana (Tier 1, wkrótce)')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {teaser.map((label) => (
          <div
            key={label}
            className="relative bg-white/[0.03] border border-white/10 rounded-[16px] p-[16px] opacity-55"
          >
            <span className="absolute top-[12px] right-[14px] text-[10px] text-[#a78bfa] bg-[rgba(167,139,250,0.12)] px-[8px] py-[2px] rounded-[6px] font-[600]">
              Tier 1
            </span>
            <div className="text-[12px] text-newTextColor/60">{label}</div>
            <div className="h-[46px] mt-[10px] rounded-[8px] bg-gradient-to-b from-[rgba(56,189,248,0.18)] to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
};
