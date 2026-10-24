import { useQuery } from '@tanstack/react-query';
import type { CatalogLanguage } from '@/store/usePreferencesStore';
import {
  fetchSets,
  fetchSetDetail,
  searchCards,
  fetchCardDetail,
} from '@/services/tcgdex';

export function useSetsQuery(lang: CatalogLanguage) {
  return useQuery({
    queryKey: ['tcgdex', 'sets', lang],
    queryFn: () => fetchSets(lang),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useSetDetailQuery(lang: CatalogLanguage, setId: string | null) {
  return useQuery({
    queryKey: ['tcgdex', 'set-detail', lang, setId],
    queryFn: () => {
      if (!setId) throw new Error('setId requerido');
      return fetchSetDetail(lang, setId);
    },
    enabled: Boolean(setId),
    staleTime: 1000 * 60 * 30,
  });
}

export function useCardSearchQuery(lang: CatalogLanguage, query: string) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ['tcgdex', 'card-search', lang, normalized],
    queryFn: () => searchCards(lang, normalized),
    enabled: normalized.length >= 2,
    staleTime: 1000 * 60 * 15,
  });
}

export function useCardDetailQuery(lang: CatalogLanguage, cardId: string | null) {
  return useQuery({
    queryKey: ['tcgdex', 'card-detail', lang, cardId],
    queryFn: () => {
      if (!cardId) throw new Error('cardId requerido');
      return fetchCardDetail(lang, cardId);
    },
    enabled: Boolean(cardId),
    staleTime: 1000 * 60 * 30,
  });
}
