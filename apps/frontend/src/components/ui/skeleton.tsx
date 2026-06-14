'use client';

import { FC } from 'react';
import clsx from 'clsx';

export const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={clsx(
      'bg-white/[0.06] rounded-[8px] animate-pulse',
      className
    )}
  />
);

export const CalendarSkeleton: FC = () => (
  <div
    className="flex flex-col flex-1 gap-[12px] p-[20px] rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(10,14,26,0.92))] backdrop-blur-xl"
    aria-label="Loading calendar"
    role="status"
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-[32px] w-[160px]" />
      <div className="flex gap-[8px]">
        <Skeleton className="h-[32px] w-[32px] rounded-full" />
        <Skeleton className="h-[32px] w-[32px] rounded-full" />
        <Skeleton className="h-[32px] w-[100px]" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-[8px] flex-1">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={`head-${i}`} className="h-[28px]" />
      ))}
      {[...Array(28)].map((_, i) => (
        <Skeleton
          key={`cell-${i}`}
          className="h-[80px]"
          />
      ))}
    </div>
  </div>
);

export const AnalyticsSkeleton: FC = () => (
  <div
    className="flex flex-col flex-1 gap-[20px] p-[20px] bg-white/[0.03]"
    aria-label="Loading analytics"
    role="status"
  >
    <div className="flex gap-[12px] flex-wrap">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-[40px] w-[120px] rounded-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-[8px]">
          <Skeleton className="h-[14px] w-[80px]" />
          <Skeleton className="h-[32px] w-[120px]" />
        </div>
      ))}
    </div>
    <Skeleton className="h-[280px] w-full" />
  </div>
);
