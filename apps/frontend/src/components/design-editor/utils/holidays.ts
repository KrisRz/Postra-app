'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPolishOccasions } from './polish-occasions';
import { getUkOccasions } from './uk-occasions';

const NAGER_BASE = 'https://date.nager.at/api/v3/PublicHolidays';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface Holiday {
  date: string;
  localName: string;
  name: string;
}

type Country = 'PL' | 'GB';

interface NagerHoliday extends Holiday {
  counties: string[] | null;
}

interface CacheEntry {
  fetchedAt: number;
  holidays: Holiday[];
}

// UI language → occasion calendar. Polish users keep the PL calendar wherever
// they live; every other language gets the UK one (UK-first launch).
const countryForLanguage = (language: string | undefined): Country =>
  language?.toLowerCase().startsWith('pl') ? 'PL' : 'GB';

const occasionsForCountry = (country: Country): Holiday[] =>
  country === 'PL' ? getPolishOccasions() : getUkOccasions();

const fetchYear = async (
  year: number,
  country: Country
): Promise<Holiday[]> => {
  const res = await fetch(`${NAGER_BASE}/${year}/${country}`);
  if (!res.ok) throw new Error(`Holiday fetch failed ${res.status}`);
  const raw: NagerHoliday[] = await res.json();
  return (
    raw
      // GB entries are often nation-scoped (GB-SCT, GB-NIR…) — keep UK-wide
      // days plus England's set so e.g. a Scotland-only 2 Jan doesn't show
      // for the typical (England-based) customer. PL entries are all national.
      .filter((h) => !h.counties || h.counties.includes('GB-ENG'))
      .map((h) => ({
        date: h.date,
        localName: h.localName,
        name: h.name,
      }))
  );
};

const cacheKey = (country: Country) => `postra:holidays:${country}`;

const loadFromCache = (country: Country): Holiday[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(country));
    if (!raw) return null;
    const parsed: CacheEntry = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.holidays;
  } catch {
    return null;
  }
};

const saveToCache = (country: Country, holidays: Holiday[]) => {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), holidays };
    window.localStorage.setItem(cacheKey(country), JSON.stringify(entry));
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
  occasions: Holiday[],
  publicHolidays: Holiday[]
): Holiday[] => {
  const byDate = new Map<string, Holiday>();
  for (const o of occasions) byDate.set(o.date, o);
  for (const h of publicHolidays) byDate.set(h.date, h);
  return [...byDate.values()];
};

// Marketing occasions + public holidays for the user's UI language (PL → Polish
// calendar, anything else → UK). Occasions are computed locally so the list
// shows instantly and survives a Nager outage; public holidays merge in once
// fetched (cached 7 days per country).
export const useHolidays = (): Holiday[] => {
  const { i18n } = useTranslation();
  const country = countryForLanguage(i18n.resolvedLanguage ?? i18n.language);

  const [publicHolidays, setPublicHolidays] = useState<Holiday[] | null>(() =>
    loadFromCache(country)
  );

  useEffect(() => {
    const cached = loadFromCache(country);
    if (cached) {
      setPublicHolidays(cached);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const year = new Date().getFullYear();
        const [current, next] = await Promise.all([
          fetchYear(year, country),
          fetchYear(year + 1, country),
        ]);
        const combined = [...current, ...next];
        if (!cancelled) {
          setPublicHolidays(combined);
          saveToCache(country, combined);
        }
      } catch {
        if (!cancelled) setPublicHolidays([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [country]);

  return useMemo(
    () => mergeHolidays(occasionsForCountry(country), publicHolidays ?? []),
    [country, publicHolidays]
  );
};

export const getUpcomingHoliday = (
  holidays: Holiday[] | null,
  withinDays = 30
): { holiday: Holiday; days: number } | null => {
  if (!holidays || holidays.length === 0) return null;
  const next = holidays
    .map((h) => ({ holiday: h, days: daysUntil(h.date) }))
    .filter((entry) => entry.days >= 0 && entry.days <= withinDays)
    .sort((a, b) => a.days - b.days)[0];
  return next || null;
};

export const getUpcomingHolidays = (
  holidays: Holiday[] | null,
  count = 3,
  withinDays = 120
): { holiday: Holiday; days: number }[] => {
  if (!holidays || holidays.length === 0) return [];
  return holidays
    .map((h) => ({ holiday: h, days: daysUntil(h.date) }))
    .filter((entry) => entry.days >= 0 && entry.days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .slice(0, count);
};
