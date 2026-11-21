import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import type { LanguageContextValue } from './LanguageContext';

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
