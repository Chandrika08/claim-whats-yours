import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { extractProfile, type Extraction } from '../lib/extract';
import type { Profile } from '../types';

export type ProfileContextValue = {
  text: string;
  profile: Partial<Profile>;
  evidence: Record<string, string>;
  submitted: boolean;
  dismissed: string[];
  setText: (text: string) => void;
  submit: () => void;
  loadSample: (text: string) => void;
  setField: (field: keyof Profile, value: unknown) => void;
  removeField: (field: keyof Profile) => void;
  answerQuestion: (field: keyof Profile, value: string | boolean | number | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [text, setTextState] = useState('');
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const setText = useCallback((value: string) => {
    setTextState(value);
  }, []);

  const runExtraction = useCallback((source: string) => {
    const result: Extraction = extractProfile(source);
    setProfile(result.profile);
    setEvidence(result.evidence);
    setSubmitted(true);
    setDismissed([]);
  }, []);

  const submit = useCallback(() => {
    runExtraction(text);
  }, [runExtraction, text]);

  const loadSample = useCallback(
    (sample: string) => {
      setTextState(sample);
      runExtraction(sample);
    },
    [runExtraction],
  );

  const setField = useCallback((field: keyof Profile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }) as Partial<Profile>);
    setEvidence((prev) => ({ ...prev, [String(field)]: 'edited by you' }));
  }, []);

  const removeField = useCallback((field: keyof Profile) => {
    setProfile((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setEvidence((prev) => {
      const next = { ...prev };
      delete next[String(field)];
      return next;
    });
  }, []);

  const answerQuestion = useCallback(
    (field: keyof Profile, value: string | boolean | number | null) => {
      const key = String(field);
      if (value === null) {
        setDismissed((prev) => (prev.includes(key) ? prev : [...prev, key]));
        return;
      }
      setField(field, value);
      setDismissed((prev) => prev.filter((f) => f !== key));
    },
    [setField],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      text,
      profile,
      evidence,
      submitted,
      dismissed,
      setText,
      submit,
      loadSample,
      setField,
      removeField,
      answerQuestion,
    }),
    [text, profile, evidence, submitted, dismissed, setText, submit, loadSample, setField, removeField, answerQuestion],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (ctx === null) {
    throw new Error('useProfile must be used inside a <ProfileProvider>');
  }
  return ctx;
}
