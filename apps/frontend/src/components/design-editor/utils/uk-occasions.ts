'use client';

import type { Holiday } from './holidays';
import {
  addDays,
  buildOccasions,
  easterSunday,
  fixed,
  nthWeekday,
  toIso,
  OccasionDef,
} from './occasion-rules';

// UK marketing / cultural occasions that are NOT statutory bank holidays, so
// the Nager.Date public-holiday API never returns them. Statutory days
// (Christmas, Boxing Day, bank holidays…) come from the Nager GB fetch and win
// on a date collision. localName == name — the UK list is English-only.

const OCCASIONS: OccasionDef[] = [
  { localName: 'Burns Night', name: 'Burns Night', date: fixed(1, 25) },
  { localName: "Valentine's Day", name: "Valentine's Day", date: fixed(2, 14) },
  {
    localName: 'Pancake Day',
    name: 'Pancake Day',
    // Shrove Tuesday — 47 days before Easter Sunday.
    date: (y) => toIso(addDays(easterSunday(y), -47)),
  },
  { localName: "St David's Day", name: "St David's Day", date: fixed(3, 1) },
  {
    localName: "St Patrick's Day",
    name: "St Patrick's Day",
    date: fixed(3, 17),
  },
  {
    localName: "Mother's Day",
    name: "Mother's Day (UK)",
    // Mothering Sunday — 3 weeks before Easter Sunday (NOT the US/PL date).
    date: (y) => toIso(addDays(easterSunday(y), -21)),
  },
  { localName: "April Fools' Day", name: "April Fools' Day", date: fixed(4, 1) },
  { localName: "St George's Day", name: "St George's Day", date: fixed(4, 23) },
  {
    localName: 'Easter Sunday',
    name: 'Easter Sunday',
    // Only Good Friday / Easter Monday are bank holidays — the Sunday itself
    // never comes back from Nager, yet it is the main marketing date.
    date: (y) => toIso(easterSunday(y)),
  },
  {
    localName: "Father's Day",
    name: "Father's Day (UK)",
    // 3rd Sunday of June.
    date: (y) => toIso(nthWeekday(y, 6, 0, 3)),
  },
  // Summer/early-autumn occasions — no UK bank holiday falls between late May
  // and late August, and with nothing curated between Father's Day and
  // Halloween the occasions panel was a July→October desert.
  {
    localName: 'International Friendship Day',
    name: 'International Friendship Day',
    date: fixed(7, 30),
  },
  {
    localName: 'International Beer Day',
    name: 'International Beer Day',
    // First Friday of August.
    date: (y) => toIso(nthWeekday(y, 8, 5, 1)),
  },
  {
    localName: 'International Dog Day',
    name: 'International Dog Day',
    date: fixed(8, 26),
  },
  {
    localName: 'National Burger Day',
    name: 'National Burger Day (UK)',
    date: fixed(8, 27),
  },
  {
    localName: 'Back to School',
    name: 'Back to School',
    // Season marker — most English schools return in the first week of September.
    date: fixed(9, 1),
  },
  {
    localName: 'International Coffee Day',
    name: 'International Coffee Day',
    date: fixed(10, 1),
  },
  {
    localName: 'World Mental Health Day',
    name: 'World Mental Health Day',
    date: fixed(10, 10),
  },
  { localName: 'Halloween', name: 'Halloween', date: fixed(10, 31) },
  { localName: 'Bonfire Night', name: 'Bonfire Night', date: fixed(11, 5) },
  {
    localName: 'Remembrance Day',
    name: 'Remembrance Day',
    date: fixed(11, 11),
  },
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
    localName: 'Small Business Saturday',
    name: 'Small Business Saturday (UK)',
    // First Saturday of December (the UK edition — the US one is in November).
    date: (y) => toIso(nthWeekday(y, 12, 6, 1)),
  },
  {
    localName: "New Year's Eve",
    name: "New Year's Eve",
    date: fixed(12, 31),
  },
];

export const getUkOccasions = (): Holiday[] => buildOccasions(OCCASIONS);
