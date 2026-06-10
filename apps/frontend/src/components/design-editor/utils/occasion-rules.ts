// Shared date rules for marketing-occasion calendars (PL, UK, …).
// Each occasion is a RULE (fixed month/day, or a computed date) evaluated for
// the current + next year — nothing is hardcoded to a specific year, so the
// lists roll over automatically with zero yearly maintenance.

import type { Holiday } from './holidays';

const pad = (n: number): string => String(n).padStart(2, '0');

// Build a YYYY-MM-DD string from local date parts (no toISOString → no UTC shift).
export const toIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, days: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Anonymous Gregorian computus — Easter Sunday for a given year.
export const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// nth weekday of a month, e.g. 4th Thursday of November. month = 1-based,
// weekday = 0 (Sun) .. 6 (Sat).
export const nthWeekday = (
  year: number,
  month: number,
  weekday: number,
  n: number
): Date => {
  const first = new Date(year, month - 1, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + shift + (n - 1) * 7);
};

export const fixed =
  (month: number, day: number) =>
  (year: number): string =>
    toIso(new Date(year, month - 1, day));

export interface OccasionDef {
  localName: string;
  name: string;
  date: (year: number) => string;
}

// Generate every occasion for the current + next year, computed live.
export const buildOccasions = (occasions: OccasionDef[]): Holiday[] => {
  const year = new Date().getFullYear();
  const out: Holiday[] = [];
  for (const y of [year, year + 1]) {
    for (const occasion of occasions) {
      out.push({
        date: occasion.date(y),
        localName: occasion.localName,
        name: occasion.name,
      });
    }
  }
  return out;
};
