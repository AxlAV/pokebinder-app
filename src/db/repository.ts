import { eq, and, gt, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  cachedCards,
  inventoryItems,
  binders,
  binderCards,
  type CardVariant,
  type CachedCardRow,
  type BinderRow,
  type DynamicRuleType,
} from '@/db/schema';
import type { TcgdexCardVariants } from '@/services/tcgdex';
import type { CatalogLanguage } from '@/store/usePreferencesStore';

export interface CacheableCardInput {
  id: string;
  localId: string;
  name: string;
  image?: string | null;
  setId: string;
  setName: string;
  setLogo?: string | null;
  setOfficialCount?: number;
  setTotalCount?: number;
  rarity?: string | null;
  types?: string[];
  variants?: TcgdexCardVariants;
  illustrator?: string | null;
  language?: CatalogLanguage;
}

export interface CardVariantCounts {
  normal: number;
  reverse: number;
  holo: number;
  total: number;
}

export interface OwnedCardRecord {
  card: CachedCardRow;
  counts: CardVariantCounts;
}

export interface InventoryStatsSummary {
  totalPhysicalCopies: number;
  uniqueOwnedCards: number;
  totalBinders: number;
  byVariant: {
    normal: number;
    reverse: number;
    holo: number;
  };
  byRarity: Array<{ rarity: string; count: number }>;
}

function buildInventoryId(cardId: string, variant: CardVariant): string {
  return `${cardId}:${variant}`;
}

function buildBinderCardId(binderId: string, cardId: string): string {
  return `${binderId}:${cardId}`;
}

/**
 * Inserta o actualiza una carta en la caché local (cached_cards).
 */
export async function upsertCachedCard(
  input: CacheableCardInput
): Promise<void> {
  const now = Date.now();
  const typesJson = JSON.stringify(input.types ?? []);
  const variantsJson = JSON.stringify({
    normal: input.variants?.normal ?? true,
    reverse: input.variants?.reverse ?? false,
    holo: input.variants?.holo ?? false,
    firstEdition: input.variants?.firstEdition ?? false,
  });

  await db
    .insert(cachedCards)
    .values({
      id: input.id,
      localId: input.localId,
      name: input.name,
      image: input.image ?? null,
      setId: input.setId,
      setName: input.setName,
      setLogo: input.setLogo ?? null,
      setOfficialCount: input.setOfficialCount ?? 0,
      setTotalCount: input.setTotalCount ?? 0,
      rarity: input.rarity ?? null,
      typesJson,
      variantsJson,
      illustrator: input.illustrator ?? null,
      language: input.language ?? 'es',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cachedCards.id,
      set: {
        localId: input.localId,
        name: input.name,
        image: sql`COALESCE(${input.image ?? null}, ${cachedCards.image})`,
        setId: input.setId,
        setName: input.setName,
        setLogo: sql`COALESCE(${input.setLogo ?? null}, ${cachedCards.setLogo})`,
        setOfficialCount:
          input.setOfficialCount && input.setOfficialCount > 0
            ? input.setOfficialCount
            : sql`${cachedCards.setOfficialCount}`,
        setTotalCount:
          input.setTotalCount && input.setTotalCount > 0
            ? input.setTotalCount
            : sql`${cachedCards.setTotalCount}`,
        rarity: sql`COALESCE(${input.rarity ?? null}, ${cachedCards.rarity})`,
        typesJson:
          input.types && input.types.length > 0
            ? typesJson
            : sql`${cachedCards.typesJson}`,
        variantsJson: input.variants
          ? variantsJson
          : sql`${cachedCards.variantsJson}`,
        illustrator: sql`COALESCE(${input.illustrator ?? null}, ${cachedCards.illustrator})`,
        language: input.language ?? 'es',
        updatedAt: now,
      },
    });
}

/**
 * Inserta o actualiza un lote de cartas (por ejemplo al abrir una expansión oficial).
 */
export async function upsertCachedCardsBatch(
  cards: CacheableCardInput[]
): Promise<void> {
  for (const card of cards) {
    await upsertCachedCard(card);
  }
}

/**
 * Obtiene una carta desde la caché local por su ID.
 */
export async function getCachedCardById(
  cardId: string
): Promise<CachedCardRow | null> {
  const rows = await db
    .select()
    .from(cachedCards)
    .where(eq(cachedCards.id, cardId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Obtiene todas las cartas en caché pertenecientes a un set oficial.
 */
export async function getCachedCardsBySet(
  setId: string
): Promise<CachedCardRow[]> {
  return db
    .select()
    .from(cachedCards)
    .where(eq(cachedCards.setId, setId))
    .orderBy(asc(cachedCards.localId));
}

/**
 * Obtiene las cantidades actuales de una carta por variante (NRM, REV, HLO).
 */
export async function getCardVariantCounts(
  cardId: string
): Promise<CardVariantCounts> {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.cardId, cardId));

  const counts: CardVariantCounts = {
    normal: 0,
    reverse: 0,
    holo: 0,
    total: 0,
  };

  for (const row of rows) {
    if (row.quantity > 0) {
      counts[row.variant] = row.quantity;
      counts.total += row.quantity;
    }
  }

  return counts;
}

/**
 * Fija la cantidad exacta de una variante para una carta (asegurando antes su caché local).
 * Si quantity <= 0, elimina la fila de inventario para mantener limpio el índice.
 */
export async function setCardVariantQuantity(
  card: CacheableCardInput,
  variant: CardVariant,
  quantity: number
): Promise<CardVariantCounts> {
  await upsertCachedCard(card);

  const normalizedQty = Math.max(0, Math.floor(quantity));
  const rowId = buildInventoryId(card.id, variant);
  const now = Date.now();

  if (normalizedQty === 0) {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, rowId));
  } else {
    await db
      .insert(inventoryItems)
      .values({
        id: rowId,
        cardId: card.id,
        variant,
        quantity: normalizedQty,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: inventoryItems.id,
        set: {
          quantity: normalizedQty,
          updatedAt: now,
        },
      });
  }

  return getCardVariantCounts(card.id);
}

/**
 * Incrementa o decrementa (+1 / -1) la cantidad de una variante física (NRM, REV, HLO).
 */
export async function adjustCardVariantQuantity(
  card: CacheableCardInput,
  variant: CardVariant,
  delta: number
): Promise<CardVariantCounts> {
  const current = await getCardVariantCounts(card.id);
  const nextQuantity = Math.max(0, current[variant] + delta);
  return setCardVariantQuantity(card, variant, nextQuantity);
}

/**
 * Obtiene un mapa cardId -> CardVariantCounts para todas las cartas poseídas de un set.
 */
export async function getSetOwnedCardMap(
  setId: string
): Promise<Record<string, CardVariantCounts>> {
  const rows = await db
    .select({
      cardId: inventoryItems.cardId,
      variant: inventoryItems.variant,
      quantity: inventoryItems.quantity,
    })
    .from(inventoryItems)
    .innerJoin(cachedCards, eq(inventoryItems.cardId, cachedCards.id))
    .where(
      and(eq(cachedCards.setId, setId), gt(inventoryItems.quantity, 0))
    );

  const map: Record<string, CardVariantCounts> = {};
  for (const row of rows) {
    if (!map[row.cardId]) {
      map[row.cardId] = { normal: 0, reverse: 0, holo: 0, total: 0 };
    }
    map[row.cardId][row.variant] = row.quantity;
    map[row.cardId].total += row.quantity;
  }

  return map;
}

/**
 * Lista todas las cartas en inventario (con cantidad > 0) junto con su ficha de caché.
 */
export async function getAllOwnedCardsWithInventory(): Promise<
  OwnedCardRecord[]
> {
  const rows = await db
    .select({
      card: cachedCards,
      variant: inventoryItems.variant,
      quantity: inventoryItems.quantity,
    })
    .from(inventoryItems)
    .innerJoin(cachedCards, eq(inventoryItems.cardId, cachedCards.id))
    .where(gt(inventoryItems.quantity, 0))
    .orderBy(desc(inventoryItems.updatedAt));

  const byCardId = new Map<string, OwnedCardRecord>();

  for (const row of rows) {
    let entry = byCardId.get(row.card.id);
    if (!entry) {
      entry = {
        card: row.card,
        counts: { normal: 0, reverse: 0, holo: 0, total: 0 },
      };
      byCardId.set(row.card.id, entry);
    }
    entry.counts[row.variant] = row.quantity;
    entry.counts.total += row.quantity;
  }

  return Array.from(byCardId.values());
}

/**
 * Calcula el resumen global de inventario (copias físicas, cartas únicas, variantes y rarezas).
 */
export async function getInventoryStatsSummary(): Promise<InventoryStatsSummary> {
  const ownedRecords = await getAllOwnedCardsWithInventory();
  const allBinders = await db.select().from(binders);

  let totalPhysicalCopies = 0;
  const byVariant = { normal: 0, reverse: 0, holo: 0 };
  const rarityCounts = new Map<string, number>();

  for (const { card, counts } of ownedRecords) {
    totalPhysicalCopies += counts.total;
    byVariant.normal += counts.normal;
    byVariant.reverse += counts.reverse;
    byVariant.holo += counts.holo;

    const rarityKey = card.rarity?.trim() || 'Sin especificar';
    rarityCounts.set(rarityKey, (rarityCounts.get(rarityKey) ?? 0) + counts.total);
  }

  const byRarity = Array.from(rarityCounts.entries())
    .map(([rarity, count]) => ({ rarity, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPhysicalCopies,
    uniqueOwnedCards: ownedRecords.length,
    totalBinders: allBinders.length,
    byVariant,
    byRarity,
  };
}

/**
 * Operaciones CRUD para Álbumes (binders y binder_cards).
 */
export async function listBinders(): Promise<BinderRow[]> {
  return db.select().from(binders).orderBy(desc(binders.updatedAt));
}

export async function getBinderById(
  binderId: string
): Promise<BinderRow | null> {
  const rows = await db
    .select()
    .from(binders)
    .where(eq(binders.id, binderId))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateSetBinderInput {
  setId: string;
  setName: string;
  setLogo?: string | null;
  setOfficialCount: number;
  setTotalCount: number;
  customName?: string;
}

export async function createSetBinder(
  input: CreateSetBinderInput
): Promise<BinderRow> {
  const now = Date.now();
  const id = `binder_set_${input.setId}_${now}`;
  const newRow: typeof binders.$inferInsert = {
    id,
    name: input.customName?.trim() || input.setName,
    description: `Set oficial ${input.setId.toUpperCase()} (${input.setOfficialCount} cartas)`,
    type: 'set',
    setId: input.setId,
    setName: input.setName,
    setLogo: input.setLogo ?? null,
    setOfficialCount: input.setOfficialCount,
    setTotalCount: input.setTotalCount,
    ruleType: null,
    ruleValue: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(binders).values(newRow);
  return newRow as BinderRow;
}

export interface CreateManualBinderInput {
  name: string;
  description?: string;
}

export async function createManualBinder(
  input: CreateManualBinderInput
): Promise<BinderRow> {
  const now = Date.now();
  const id = `binder_manual_${now}`;
  const newRow: typeof binders.$inferInsert = {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || 'Carpeta manual de 9 bolsillos',
    type: 'manual',
    setId: null,
    setName: null,
    setLogo: null,
    setOfficialCount: null,
    setTotalCount: null,
    ruleType: null,
    ruleValue: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(binders).values(newRow);
  return newRow as BinderRow;
}

export interface CreateDynamicBinderInput {
  name: string;
  description?: string;
  ruleType: DynamicRuleType;
  ruleValue: string;
}

export async function createDynamicBinder(
  input: CreateDynamicBinderInput
): Promise<BinderRow> {
  const now = Date.now();
  const id = `binder_dyn_${now}`;
  const newRow: typeof binders.$inferInsert = {
    id,
    name: input.name.trim(),
    description:
      input.description?.trim() ||
      `Álbum dinámico (${input.ruleType === 'pokemon' ? 'Pokémon' : 'Tipo'}: ${input.ruleValue})`,
    type: 'dynamic',
    setId: null,
    setName: null,
    setLogo: null,
    setOfficialCount: null,
    setTotalCount: null,
    ruleType: input.ruleType,
    ruleValue: input.ruleValue.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(binders).values(newRow);
  return newRow as BinderRow;
}

export async function deleteBinder(binderId: string): Promise<void> {
  await db.delete(binders).where(eq(binders.id, binderId));
}

export async function addCardToManualBinder(
  binderId: string,
  card: CacheableCardInput,
  position = 0
): Promise<void> {
  await upsertCachedCard(card);
  const now = Date.now();
  const rowId = buildBinderCardId(binderId, card.id);

  await db
    .insert(binderCards)
    .values({
      id: rowId,
      binderId,
      cardId: card.id,
      position,
      addedAt: now,
    })
    .onConflictDoUpdate({
      target: binderCards.id,
      set: {
        position,
        addedAt: now,
      },
    });

  await db
    .update(binders)
    .set({ updatedAt: now })
    .where(eq(binders.id, binderId));
}

export async function removeCardFromManualBinder(
  binderId: string,
  cardId: string
): Promise<void> {
  const rowId = buildBinderCardId(binderId, cardId);
  await db.delete(binderCards).where(eq(binderCards.id, rowId));
  await db
    .update(binders)
    .set({ updatedAt: Date.now() })
    .where(eq(binders.id, binderId));
}

export async function getManualBinderCards(
  binderId: string
): Promise<CachedCardRow[]> {
  const rows = await db
    .select({
      card: cachedCards,
    })
    .from(binderCards)
    .innerJoin(cachedCards, eq(binderCards.cardId, cachedCards.id))
    .where(eq(binderCards.binderId, binderId))
    .orderBy(asc(binderCards.position), asc(binderCards.addedAt));

  return rows.map((r) => r.card);
}
