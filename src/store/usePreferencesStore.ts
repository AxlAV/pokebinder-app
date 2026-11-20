import { create } from 'zustand';
import { sqliteDb } from '@/db/client';

export type CatalogLanguage = 'es' | 'en';

interface PreferencesState {
  language: CatalogLanguage;
  setLanguage: (language: CatalogLanguage) => void;
  toggleLanguage: () => void;
}

function readPersistedLanguage(): CatalogLanguage {
  try {
    const row = sqliteDb.getFirstSync<{ user_version: number }>(
      'PRAGMA user_version;'
    );
    if (row?.user_version === 2) return 'en';
  } catch {
    // Fallback seguro si aún no abrió SQLite
  }
  return 'es';
}

function writePersistedLanguage(lang: CatalogLanguage): void {
  try {
    const code = lang === 'en' ? 2 : 1;
    sqliteDb.execSync(`PRAGMA user_version = ${code};`);
  } catch {
    // Ignorar error de escritura de preferencia
  }
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: readPersistedLanguage(),
  setLanguage: (language) => {
    writePersistedLanguage(language);
    set({ language });
  },
  toggleLanguage: () =>
    set((state) => {
      const next: CatalogLanguage = state.language === 'es' ? 'en' : 'es';
      writePersistedLanguage(next);
      return { language: next };
    }),
}));
