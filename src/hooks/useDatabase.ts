import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CardVariant } from '@/db/schema';
import {
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
  type CacheableCardInput,
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
};

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
  return useQuery({
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
    mutationFn: ({
      card,
      variant,
      delta,
    }: {
      card: CacheableCardInput;
      variant: CardVariant;
      delta: number;
    }) => adjustCardVariantQuantity(card, variant, delta),
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
    mutationFn: ({
      binderId,
      card,
      position,
    }: {
      binderId: string;
      card: CacheableCardInput;
      position?: number;
    }) => addCardToManualBinder(binderId, card, position),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: DB_KEYS.manualBinderCards(variables.binderId),
      });
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
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
      queryClient.invalidateQueries({ queryKey: DB_KEYS.binders });
    },
  });
}
