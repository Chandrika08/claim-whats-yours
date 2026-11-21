export type Lang = 'en' | 'te' | 'hi';

export const LANGS: Lang[] = ['en', 'te', 'hi'];

export const LANG_META: Record<Lang, { nativeName: string; shortName: string; htmlLang: string }> = {
  en: { nativeName: 'English', shortName: 'EN', htmlLang: 'en' },
  te: { nativeName: 'తెలుగు', shortName: 'తె', htmlLang: 'te' },
  hi: { nativeName: 'हिंदी', shortName: 'हि', htmlLang: 'hi' },
};

export const DEFAULT_LANG: Lang = 'en';

export const LANG_STORAGE_KEY = 'hakku.lang.v1';
