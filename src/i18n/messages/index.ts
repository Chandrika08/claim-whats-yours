import type { Lang } from '../types';
import { commonEn, commonHi, commonTe } from './common';
import { navEn, navHi, navTe } from './nav';
import { homeEn, homeHi, homeTe } from './home';
import { resultsEn, resultsHi, resultsTe } from './results';
import { schemeEn, schemeHi, schemeTe } from './scheme';
import { trackerEn, trackerHi, trackerTe } from './tracker';

export const EN_MESSAGES = {
  ...commonEn,
  ...navEn,
  ...homeEn,
  ...resultsEn,
  ...schemeEn,
  ...trackerEn,
} as const;

export type MessageKey = keyof typeof EN_MESSAGES;

export const MESSAGES: Record<Lang, Partial<Record<MessageKey, string>>> = {
  en: EN_MESSAGES,
  te: { ...commonTe, ...navTe, ...homeTe, ...resultsTe, ...schemeTe, ...trackerTe },
  hi: { ...commonHi, ...navHi, ...homeHi, ...resultsHi, ...schemeHi, ...trackerHi },
};
