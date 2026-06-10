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

// Polish marketing / cultural occasions that are NOT statutory public holidays,
// so the Nager.Date public-holiday API never returns them.

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

export const getPolishOccasions = (): Holiday[] => buildOccasions(OCCASIONS);
