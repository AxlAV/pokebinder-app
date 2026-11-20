import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CardVariant } from '@/db/schema';
import { fetchCardDetail } from '@/services/tcgdex';
import {
  getCachedCardById,
  getCardVariantCounts,
  adjustCardVariantQuantity,
  setCardVariantQuantity,
  getSetOwnedCardMap,
  getAllOwnedCardsWithInventory,
  getInventoryStatsSummary,
  listBinders,
  getBinderById,
  createSetBinder,
  createManualBinder,
  createDynamicBinder,
  deleteBinder,
  addCardToManualBinder,
  removeCardFromManualBinder,
  getManualBinderCards,
  getManualBinderCountsMap,
  type CacheableCardInput,
  type CardVariantCounts,
  type CreateSetBinderInput,
  type CreateManualBinderInput,
  type CreateDynamicBinderInput,
} from '@/db/repository';

export const DB_KEYS = {
  all: ['local-db'] as const,
  cardVariants: (cardId: string | null) =>
    ['local-db', 'card-variants', cardId] as const,
  setOwnedMap: (setId: string | null) =>
    ['local-db', 'set-owned-map', setId] as const,
  ownedCards: ['local-db', 'owned-cards'] as const,
  stats: ['local-db', 'stats'] as const,
  binders: ['local-db', 'binders'] as const,
  binderDetail: (binderId: string | null) =>
    ['local-db', 'binder-detail', binderId] as const,
  manualBinderCards: (binderId: string | null) =>
    ['local-db', 'manual-binder-cards', binderId] as const,
  manualBinderCountsMap: ['local-db', 'manual-binder-counts-map'] as const,
};

const ENRICH_TIMEOUT_MS = 4000;

/**
 * Completa rareza, tipos y variantes antes de guardar una carta en inventario.
 * Las cartas que llegan desde listas (escáner, set, buscador) solo traen id/nombre/imagen;
 * sin esto las estadísticas por rareza quedaban "Sin especificar" y los álbumes
 * dinámicos por tipo no las encontraban. Sin red, se guarda la ficha breve igual.
 */
async function enrichCardInput(
  card: CacheableCardInput
): Promise<CacheableCardInput> {
  if (card.variants) return card;

  const cached = await getCachedCardById(card.id);
  if (cached?.rarity) return card;

  try {
    const detail = await fetchCardDetail(
      card.language ?? 'es',
      card.id,
      ENRICH_TIMEOUT_MS
    );
    return {
      ...card,
      localId: detail.localId,
      name: detail.name,
      image: detail.image ?? card.image ?? null,
      setId: detail.set.id,
      setName: detail.set.name,
      setLogo: detail.set.logo ?? card.setLogo ?? null,
      setOfficialCount: detail.set.cardCount.official,
      setTotalCount: detail.set.cardCount.total,
      rarity: detail.rarity ?? null,
      types: detail.types ?? [],
      variants: detail.variants,
      illustrator: detail.illustrator ?? null,
    };
  } catch {
    return card;
  }
}

export function useCardVariantCountsQuery(cardId: string | null) {
  return useQuery({
    queryKey: DB_KEYS.cardVariants(cardId),
    queryFn: () => {
      if (!cardId) {
        return { normal: 0, reverse: 0, holo: 0, total: 0 };
      }
      return getCardVariantCounts(cardId);
    },
    enabled: Boolean(cardId),
  });
}

export function useSetOwnedMapQuery(setId: string | null) {
  return useQuery<Record<string, CardVariantCounts>>({
    queryKey: DB_KEYS.setOwnedMap(setId),
    queryFn: () => {
      if (!setId) return {};
      return getSetOwnedCardMap(setId);
    },
    enabled: Boolean(setId),
  });
}

export function useOwnedCardsQuery() {
  return useQuery({
    queryKey: DB_KEYS.ownedCards,
    queryFn: () => getAllOwnedCardsWithInventory(),
  });
}

export function useInventoryStatsQuery() {
  return useQuery({
    queryKey: DB_KEYS.stats,
    queryFn: () => getInventoryStatsSummary(),
  });
}

export function useAdjustCardVariantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      card,
      variant,
      delta,
    }: {
      card: CacheableCardInput;
      variant: CardVariant;
      delta: number;
    }) => adjustCardVariantQuantity(await enrichCardInput(card), variant, delta),
    // Invalida todo lo local: la carta pudo cambiar de metadatos (set, tipos) al enriquecerse
    // y esas lecturas a SQLite son baratas.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.all });
    },
  });
}

export function useSetCardVariantQuantityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      card,
      variant,
      quantity,
    }: {
      card: CacheableCardInput;
      variant: CardVariant;
      quantity: number;
    }) => setCardVariantQuantity(card, variant, quantity),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: DB_KEYS.cardVariants(variables.card.id),
      });
      queryClient.invalidateQueries({
        queryKey: DB_KEYS.setOwnedMap(variables.card.setId),
      });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.ownedCards });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.stats });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
    },
  });
}

export function useBindersQuery() {
  return useQuery({
    queryKey: DB_KEYS.binders,
    queryFn: () => listBinders(),
  });
}

export function useBinderDetailQuery(binderId: string | null) {
  return useQuery({
    queryKey: DB_KEYS.binderDetail(binderId),
    queryFn: () => {
      if (!binderId) return null;
      return getBinderById(binderId);
    },
    enabled: Boolean(binderId),
  });
}

export function useManualBinderCardsQuery(binderId: string | null) {
  return useQuery({
    queryKey: DB_KEYS.manualBinderCards(binderId),
    queryFn: () => {
      if (!binderId) return [];
      return getManualBinderCards(binderId);
    },
    enabled: Boolean(binderId),
  });
}

export function useManualBinderCountsMapQuery() {
  return useQuery<Record<string, number>>({
    queryKey: DB_KEYS.manualBinderCountsMap,
    queryFn: () => getManualBinderCountsMap(),
  });
}

export function useCreateSetBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSetBinderInput) => createSetBinder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.stats });
    },
  });
}

export function useCreateManualBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualBinderInput) => createManualBinder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.stats });
    },
  });
}

export function useCreateDynamicBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDynamicBinderInput) => createDynamicBinder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.stats });
    },
  });
}

export function useDeleteBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (binderId: string) => deleteBinder(binderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.stats });
    },
  });
}

export function useAddCardToManualBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      binderId,
      card,
      position,
    }: {
      binderId: string;
      card: CacheableCardInput;
      position?: number;
    }) => addCardToManualBinder(binderId, await enrichCardInput(card), position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DB_KEYS.all });
    },
  });
}

export function useRemoveCardFromManualBinderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      binderId,
      cardId,
    }: {
      binderId: string;
      cardId: string;
    }) => removeCardFromManualBinder(binderId, cardId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: DB_KEYS.manualBinderCards(variables.binderId),
      });
      queryClient.invalidateQueries({
        queryKey: DB_KEYS.manualBinderCountsMap,
      });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
    },
  });
}
