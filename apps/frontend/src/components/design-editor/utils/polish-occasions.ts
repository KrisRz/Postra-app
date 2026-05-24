'use client';

import type { PolishHoliday } from './polish-holidays';

// Polish marketing / cultural occasions that are NOT statutory public holidays,
// so the Nager.Date public-holiday API never returns them. Each entry is a RULE
// (fixed month/day, or a computed date), evaluated for the current + next year.
// Nothing is hardcoded to a specific year — in 2027 this generates 2027 + 2028
// automatically, exactly like the Nager fetch. Zero yearly maintenance.

const pad = (n: number): string => String(n).padStart(2, '0');

// Build a YYYY-MM-DD string from local date parts (no toISOString → no UTC shift).
const toIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (d: Date, days: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Anonymous Gregorian computus — Easter Sunday for a given year.
const easterSunday = (year: number): Date => {
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
const nthWeekday = (
  year: number,
  month: number,
  weekday: number,
  n: number
): Date => {
  const first = new Date(year, month - 1, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + shift + (n - 1) * 7);
};

const fixed =
  (month: number, day: number) =>
  (year: number): string =>
    toIso(new Date(year, month - 1, day));

interface OccasionDef {
  localName: string;
  name: string;
  date: (year: number) => string;
}

const OCCASIONS: OccasionDef[] = [
  { localName: 'Dzień Babci', name: "Grandmother's Day", date: fixed(1, 21) },
  { localName: 'Dzień Dziadka', name: "Grandfather's Day", date: fixed(1, 22) },
  { localName: 'Walentynki', name: "Valentine's Day", date: fixed(2, 14) },
  {
    localName: 'Tłusty Czwartek',
    name: 'Fat Thursday',
    date: (y) => toIso(addDays(easterSunday(y), -52)),
  },
  { localName: 'Dzień Kobiet', name: "Women's Day", date: fixed(3, 8) },
  {
    localName: 'Pierwszy Dzień Wiosny',
    name: 'First Day of Spring',
    date: fixed(3, 21),
  },
  { localName: 'Prima Aprilis', name: "April Fools' Day", date: fixed(4, 1) },
  { localName: 'Dzień Matki', name: "Mother's Day", date: fixed(5, 26) },
  { localName: 'Dzień Dziecka', name: "Children's Day", date: fixed(6, 1) },
  { localName: 'Dzień Ojca', name: "Father's Day", date: fixed(6, 23) },
  { localName: 'Dzień Chłopaka', name: "Boys' Day", date: fixed(9, 30) },
  {
    localName: 'Dzień Edukacji Narodowej',
    name: "Teacher's Day",
    date: fixed(10, 14),
  },
  { localName: 'Halloween', name: 'Halloween', date: fixed(10, 31) },
  { localName: 'Andrzejki', name: "St. Andrew's Eve", date: fixed(11, 29) },
  {
    localName: 'Black Friday',
    name: 'Black Friday',
    // Friday after the 4th Thursday of November.
    date: (y) => toIso(addDays(nthWeekday(y, 11, 4, 4), 1)),
  },
  {
    localName: 'Cyber Monday',
    name: 'Cyber Monday',
    // Monday after Black Friday.
    date: (y) => toIso(addDays(nthWeekday(y, 11, 4, 4), 4)),
  },
  {
    localName: 'Mikołajki',
    name: 'Saint Nicholas Day',
    date: fixed(12, 6),
  },
  { localName: 'Sylwester', name: "New Year's Eve", date: fixed(12, 31) },
];

// Generate every occasion for the current + next year, computed live.
export const getPolishOccasions = (): PolishHoliday[] => {
  const year = new Date().getFullYear();
  const out: PolishHoliday[] = [];
  for (const y of [year, year + 1]) {
    for (const occasion of OCCASIONS) {
      out.push({
        date: occasion.date(y),
        localName: occasion.localName,
        name: occasion.name,
      });
    }
  }
  return out;
};
