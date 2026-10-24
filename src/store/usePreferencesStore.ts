import { create } from 'zustand';

export type CatalogLanguage = 'es' | 'en';

interface PreferencesState {
  language: CatalogLanguage;
  setLanguage: (language: CatalogLanguage) => void;
  toggleLanguage: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'es',
  setLanguage: (language) => set({ language }),
  toggleLanguage: () =>
    set((state) => ({ language: state.language === 'es' ? 'en' : 'es' })),
}));
