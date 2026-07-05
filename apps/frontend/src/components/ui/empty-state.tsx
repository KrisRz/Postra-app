'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Shared empty-state block for lists that have loaded with zero items, so a
 * "you have nothing here yet" reads the same across the app instead of each
 * list rolling its own (or rendering blank). Pair it with a loading indicator
 * and only show it once the data has actually resolved.
 */
export const EmptyState: FC<{
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}> = ({ title, description, icon, action, className }) => (
  <div
    role="status"
    className={clsx(
      'flex flex-1 flex-col items-center justify-center gap-[10px] px-[24px] py-[36px] text-center',
      className
    )}
  >
    {icon ? <div className="mb-[2px] text-white/30">{icon}</div> : null}
    <div className="text-[18px] font-[600] text-newTextColor">{title}</div>
    {description ? (
      <div className="max-w-[380px] text-[14px] text-newTextColor/55">
        {description}
      </div>
    ) : null}
    {action ? <div className="mt-[8px]">{action}</div> : null}
  </div>
);
