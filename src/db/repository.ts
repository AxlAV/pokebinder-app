import { eq, and, gt, lte, desc, asc, sql } from 'drizzle-orm';
import { compareLocalIds, getSetOfficialCode } from '@/utils/cardIds';
import { db, sqliteDb } from '@/db/client';
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
  /** null/undefined = nombre desconocido: no pisa el nombre real ya guardado en caché. */
  setName?: string | null;
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
  /** Último cambio de inventario (no de la caché del catálogo). */
  lastInventoryUpdate: number;
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
      setName: input.setName ?? input.setId.toUpperCase(),
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
        setName: sql`COALESCE(${input.setName ?? null}, ${cachedCards.setName})`,
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
        language: input.language ?? sql`${cachedCards.language}`,
        updatedAt: now,
      },
    });
}

/**
 * Inserta o actualiza un lote de cartas (por ejemplo al abrir una expansión oficial)
 * dentro de una sola transacción SQLite para evitar contención y acelerar escrituras.
 */
export async function upsertCachedCardsBatch(
  cards: CacheableCardInput[]
): Promise<void> {
  if (cards.length === 0) return;
  await sqliteDb.withTransactionAsync(async () => {
    for (const card of cards) {
      await upsertCachedCard(card);
    }
  });
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
  const rows = await db
    .select()
    .from(cachedCards)
    .where(eq(cachedCards.setId, setId));
  return rows.sort((a, b) => compareLocalIds(a.localId, b.localId));
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
 * El cálculo se hace en SQL (quantity + delta) para que toques rápidos no pierdan copias:
 * leer-sumar-escribir desde JS permitía que dos mutaciones leyeran el mismo valor.
 */
export async function adjustCardVariantQuantity(
  card: CacheableCardInput,
  variant: CardVariant,
  delta: number
): Promise<CardVariantCounts> {
  await upsertCachedCard(card);

  const step = Math.trunc(delta);
  const rowId = buildInventoryId(card.id, variant);
  const now = Date.now();

  await db
    .insert(inventoryItems)
    .values({
      id: rowId,
      cardId: card.id,
      variant,
      quantity: Math.max(0, step),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: inventoryItems.id,
      set: {
        quantity: sql`MAX(0, ${inventoryItems.quantity} + ${step})`,
        // Solo las altas cuentan como "última adición"; restar no cambia la fecha.
        updatedAt: step > 0 ? now : sql`${inventoryItems.updatedAt}`,
      },
    });

  await db
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.id, rowId), lte(inventoryItems.quantity, 0)));

  return getCardVariantCounts(card.id);
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
      inventoryUpdatedAt: inventoryItems.updatedAt,
    })
    .from(inventoryItems)
    .innerJoin(cachedCards, eq(inventoryItems.cardId, cachedCards.id))
    .where(gt(inventoryItems.quantity, 0))
    .orderBy(desc(inventoryItems.updatedAt));

  const byCardId = new Map<string, OwnedCardRecord>();

  for (const row of rows) {
    let entry = byCardId.get(row.card.id);
    if (!entry) {
      // Filas ordenadas por fecha desc: la primera de cada carta es la más reciente.
      entry = {
        card: row.card,
        counts: { normal: 0, reverse: 0, holo: 0, total: 0 },
        lastInventoryUpdate: row.inventoryUpdatedAt,
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

  if (!input.customName?.trim()) {
    const existing = await db
      .select()
      .from(binders)
      .where(and(eq(binders.type, 'set'), eq(binders.setId, input.setId)))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }
  }

  const id = `binder_set_${input.setId}_${now}`;
  const code = getSetOfficialCode(input.setId);
  const countLabel = input.setTotalCount || input.setOfficialCount;
  const newRow: typeof binders.$inferInsert = {
    id,
    name: input.customName?.trim() || input.setName,
    description: `Colección [${code}] • ${input.setId.toUpperCase()} (${countLabel} cartas)`,
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

/**
 * Inserta una carta al final de una carpeta manual. Si ya estaba, conserva su bolsillo
 * (antes se reescribía la posición y la carta saltaba de hoja).
 */
export async function addCardToManualBinder(
  binderId: string,
  card: CacheableCardInput,
  position?: number
): Promise<void> {
  await upsertCachedCard(card);
  const now = Date.now();
  const rowId = buildBinderCardId(binderId, card.id);

  let targetPosition = position;
  if (targetPosition === undefined) {
    const [row] = await db
      .select({ maxPos: sql<number | null>`MAX(${binderCards.position})` })
      .from(binderCards)
      .where(eq(binderCards.binderId, binderId));
    targetPosition = (row?.maxPos ?? -1) + 1;
  }

  await db
    .insert(binderCards)
    .values({
      id: rowId,
      binderId,
      cardId: card.id,
      position: targetPosition,
      addedAt: now,
    })
    .onConflictDoNothing({ target: binderCards.id });

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

/**
 * Obtiene un mapa binderId -> cantidad de cartas asignadas en carpetas manuales.
 */
export async function getManualBinderCountsMap(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      binderId: binderCards.binderId,
      cardId: binderCards.cardId,
    })
    .from(binderCards);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.binderId] = (counts[row.binderId] ?? 0) + 1;
  }
  return counts;
}

