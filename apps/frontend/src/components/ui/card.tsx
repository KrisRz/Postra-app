'use client';

import { DetailedHTMLProps, FC, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

/**
 * Glass surface card — Postra admin design language (see admin-dashboards.component).
 * Surface only (bg / border / radius / blur). Pass padding & layout via className,
 * so callers stay in control of spacing and there are no Tailwind conflicts.
 *
 *   <Card className="p-[24px] flex flex-col gap-[24px]">…</Card>
 *   <Card interactive className="p-[16px]">…</Card>   // hover lift for clickable cards
 */
export const Card: FC<
  DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    interactive?: boolean;
  }
> = ({ interactive, className, ...props }) => (
  <div
    {...props}
    className={clsx(
      'bg-white/[0.03] border border-white/10 rounded-[16px] backdrop-blur-[8px]',
      interactive &&
        'transition-all duration-150 hover:border-[rgba(56,189,248,0.4)] hover:bg-white/[0.06] hover:-translate-y-[1px]',
      className
    )}
  />
);
