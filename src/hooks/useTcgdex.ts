import { useQuery } from '@tanstack/react-query';
import type { CatalogLanguage } from '@/store/usePreferencesStore';
import {
  fetchSets,
  fetchSetDetail,
  searchCards,
  fetchCardDetail,
  fetchCardsByElementalType,
  type TcgdexSetDetail,
  type TcgdexCardDetail,
} from '@/services/tcgdex';
import { getTcgdexTypeParam } from '@/utils/elementalTypes';
import {
  upsertCachedCard,
  upsertCachedCardsBatch,
  getCachedCardById,
  getCachedCardsBySet,
} from '@/db/repository';

export function useSetsQuery(lang: CatalogLanguage) {
  return useQuery({
    queryKey: ['tcgdex', 'sets', lang],
    queryFn: () => fetchSets(lang),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useSetDetailQuery(
  lang: CatalogLanguage,
  setId: string | null
) {
  return useQuery({
    queryKey: ['tcgdex', 'set-detail', lang, setId],
    queryFn: async (): Promise<TcgdexSetDetail> => {
      if (!setId) throw new Error('setId requerido');
      try {
        const detail = await fetchSetDetail(lang, setId);
        // Persistir lote en caché SQLite en segundo plano para uso offline
        void upsertCachedCardsBatch(
          detail.cards.map((c) => ({
            id: c.id,
            localId: c.localId,
            name: c.name,
            image: c.image ?? null,
            setId: detail.id,
            setName: detail.name,
            setLogo: detail.logo ?? null,
            setOfficialCount: detail.cardCount.official,
            setTotalCount: detail.cardCount.total,
            language: lang,
          }))
        );
        return detail;
      } catch (err) {
        // Fallback offline desde SQLite si ya se había visitado la expansión
        const cached = await getCachedCardsBySet(setId);
        if (cached.length > 0) {
          const first = cached[0];
          return {
            id: first.setId,
            name: first.setName,
            logo: first.setLogo ?? undefined,
            cardCount: {
              official: first.setOfficialCount || cached.length,
              total: first.setTotalCount || cached.length,
            },
            cards: cached.map((row) => ({
              id: row.id,
              localId: row.localId,
              name: row.name,
              image: row.image ?? undefined,
            })),
          };
        }
        throw err;
      }
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

export function useCardsByElementalTypeQuery(
  lang: CatalogLanguage,
  ruleValue: string | null
) {
  return useQuery({
    queryKey: ['tcgdex', 'cards-by-type', lang, ruleValue],
    queryFn: () => {
      if (!ruleValue) return [];
      const typeParam = getTcgdexTypeParam(ruleValue, lang);
      return fetchCardsByElementalType(lang, typeParam);
    },
    enabled: Boolean(ruleValue),
    staleTime: 1000 * 60 * 30,
  });
}

export function useCardDetailQuery(
  lang: CatalogLanguage,
  cardId: string | null
) {
  return useQuery({
    queryKey: ['tcgdex', 'card-detail', lang, cardId],
    queryFn: async (): Promise<TcgdexCardDetail> => {
      if (!cardId) throw new Error('cardId requerido');
      try {
        const detail = await fetchCardDetail(lang, cardId);
        await upsertCachedCard({
          id: detail.id,
          localId: detail.localId,
          name: detail.name,
          image: detail.image ?? null,
          setId: detail.set.id,
          setName: detail.set.name,
          setLogo: detail.set.logo ?? null,
          setOfficialCount: detail.set.cardCount.official,
          setTotalCount: detail.set.cardCount.total,
          rarity: detail.rarity ?? null,
          types: detail.types ?? [],
          variants: detail.variants,
          illustrator: detail.illustrator ?? null,
          language: lang,
        });
        return detail;
      } catch (err) {
        const cached = await getCachedCardById(cardId);
        if (cached) {
          let parsedTypes: string[] = [];
          let parsedVariants = {
            normal: true,
            reverse: false,
            holo: false,
          };
          try {
            parsedTypes = JSON.parse(cached.typesJson) as string[];
            parsedVariants = JSON.parse(cached.variantsJson);
          } catch {
            // Ignorar JSON malformado
          }
          return {
            id: cached.id,
            localId: cached.localId,
            name: cached.name,
            image: cached.image ?? undefined,
            rarity: cached.rarity ?? undefined,
            types: parsedTypes,
            illustrator: cached.illustrator ?? undefined,
            variants: parsedVariants,
            set: {
              id: cached.setId,
              name: cached.setName,
              logo: cached.setLogo ?? undefined,
              cardCount: {
                official: cached.setOfficialCount,
                total: cached.setTotalCount,
              },
            },
          };
        }
        throw err;
      }
    },
    enabled: Boolean(cardId),
    staleTime: 1000 * 60 * 30,
  });
}
