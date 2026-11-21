export const commonEn = {
  'common.lang.en': 'English',
  'common.lang.te': 'Telugu',
  'common.lang.hi': 'Hindi',
} as const;

export const commonTe: Record<keyof typeof commonEn, string> = {
  'common.lang.en': 'ఇంగ్లీష్',
  'common.lang.te': 'తెలుగు',
  'common.lang.hi': 'హిందీ',
};

export const commonHi: Record<keyof typeof commonEn, string> = {
  'common.lang.en': 'अंग्रेज़ी',
  'common.lang.te': 'तेलुगु',
  'common.lang.hi': 'हिंदी',
};
