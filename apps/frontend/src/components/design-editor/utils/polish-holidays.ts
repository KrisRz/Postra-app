'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPolishOccasions } from './polish-occasions';

const NAGER_BASE = 'https://date.nager.at/api/v3/PublicHolidays';
const CACHE_KEY = 'postra:pl-holidays';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PolishHoliday {
  date: string;
  localName: string;
  name: string;
}

interface CacheEntry {
  fetchedAt: number;
  holidays: PolishHoliday[];
}

const fetchYear = async (year: number): Promise<PolishHoliday[]> => {
  const res = await fetch(`${NAGER_BASE}/${year}/PL`);
  if (!res.ok) throw new Error(`Holiday fetch failed ${res.status}`);
  const raw: PolishHoliday[] = await res.json();
  return raw.map((h) => ({
    date: h.date,
    localName: h.localName,
    name: h.name,
  }));
};

const loadFromCache = (): PolishHoliday[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheEntry = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.holidays;
  } catch {
    return null;
  }
};

const saveToCache = (holidays: PolishHoliday[]) => {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), holidays };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded or unavailable — non-fatal
  }
};

export const daysUntil = (isoDate: string): number => {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

// Dedupe by date — public holidays (Nager) win over occasions on a collision,
// so the official name is kept if a marketing occasion lands on the same day.
const mergeHolidays = (
  occasions: PolishHoliday[],
  publicHolidays: PolishHoliday[]
): PolishHoliday[] => {
  const byDate = new Map<string, PolishHoliday>();
  for (const o of occasions) byDate.set(o.date, o);
  for (const h of publicHolidays) byDate.set(h.date, h);
  return [...byDate.values()];
};

export const usePolishHolidays = (): PolishHoliday[] => {
  // Only the Nager network result is cached; occasions are computed fresh.
  const [publicHolidays, setPublicHolidays] = useState<PolishHoliday[] | null>(
    () => loadFromCache()
  );

  useEffect(() => {
    if (publicHolidays) return;
    let cancelled = false;
    const load = async () => {
      try {
        const year = new Date().getFullYear();
        const [current, next] = await Promise.all([
          fetchYear(year),
          fetchYear(year + 1),
        ]);
        const combined = [...current, ...next];
        if (!cancelled) {
          setPublicHolidays(combined);
          saveToCache(combined);
        }
      } catch {
        if (!cancelled) setPublicHolidays([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [publicHolidays]);

  // Occasions are always available (no network) — list shows instantly and
  // still works if Nager is down; public holidays merge in once fetched.
  return useMemo(
    () => mergeHolidays(getPolishOccasions(), publicHolidays ?? []),
    [publicHolidays]
  );
};

export const getUpcomingHoliday = (
  holidays: PolishHoliday[] | null,
  withinDays = 30
): { holiday: PolishHoliday; days: number } | null => {
  if (!holidays || holidays.length === 0) return null;
  const next = holidays
    .map((h) => ({ holiday: h, days: daysUntil(h.date) }))
    .filter((entry) => entry.days >= 0 && entry.days <= withinDays)
    .sort((a, b) => a.days - b.days)[0];
  return next || null;
};

export const getUpcomingHolidays = (
  holidays: PolishHoliday[] | null,
  count = 3,
  withinDays = 120
): { holiday: PolishHoliday; days: number }[] => {
  if (!holidays || holidays.length === 0) return [];
  return holidays
    .map((h) => ({ holiday: h, days: daysUntil(h.date) }))
    .filter((entry) => entry.days >= 0 && entry.days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .slice(0, count);
};
