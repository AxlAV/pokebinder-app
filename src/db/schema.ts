import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export type CardVariant = 'normal' | 'reverse' | 'holo';
export type BinderType = 'set' | 'manual' | 'dynamic';
export type DynamicRuleType = 'pokemon' | 'element';

export const VARIANT_CODES: Record<CardVariant, 'NRM' | 'REV' | 'HLO'> = {
  normal: 'NRM',
  reverse: 'REV',
  holo: 'HLO',
};

/**
 * Tabla 1: Caché local de catálogo de cartas (offline-first).
 * Guarda los metadatos de TCGdex para que el inventario y los álbumes funcionen sin conexión.
 */
export const cachedCards = sqliteTable(
  'cached_cards',
  {
    id: text('id').primaryKey(),
    localId: text('local_id').notNull(),
    name: text('name').notNull(),
    image: text('image'),
    setId: text('set_id').notNull(),
    setName: text('set_name').notNull(),
    setLogo: text('set_logo'),
    setOfficialCount: integer('set_official_count').notNull().default(0),
    setTotalCount: integer('set_total_count').notNull().default(0),
    rarity: text('rarity'),
    typesJson: text('types_json').notNull().default('[]'),
    variantsJson: text('variants_json')
      .notNull()
      .default('{"normal":true,"reverse":false,"holo":false}'),
    illustrator: text('illustrator'),
    language: text('language').notNull().default('es'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_cached_cards_set_id').on(table.setId),
    index('idx_cached_cards_name').on(table.name),
  ]
);

/**
 * Tabla 2: Inventario físico del usuario por variante (Normal, Reverse Holo, Holo).
 * Clave primaria compuesta: `${cardId}:${variant}`.
 */
export const inventoryItems = sqliteTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cachedCards.id, { onDelete: 'cascade' }),
    variant: text('variant', { enum: ['normal', 'reverse', 'holo'] }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_inventory_card_id').on(table.cardId),
    index('idx_inventory_variant').on(table.variant),
  ]
);

/**
 * Tabla 3: Álbumes virtuales (por set oficial, manuales o dinámicos por regla).
 */
export const binders = sqliteTable('binders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['set', 'manual', 'dynamic'] }).notNull(),
  setId: text('set_id'),
  setName: text('set_name'),
  setLogo: text('set_logo'),
  setOfficialCount: integer('set_official_count'),
  setTotalCount: integer('set_total_count'),
  ruleType: text('rule_type', { enum: ['pokemon', 'element'] }),
  ruleValue: text('rule_value'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Tabla 4: Relación de cartas asignadas a álbumes manuales.
 */
export const binderCards = sqliteTable(
  'binder_cards',
  {
    id: text('id').primaryKey(),
    binderId: text('binder_id')
      .notNull()
      .references(() => binders.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cachedCards.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    addedAt: integer('added_at').notNull(),
  },
  (table) => [
    index('idx_binder_cards_binder_id').on(table.binderId),
    index('idx_binder_cards_card_id').on(table.cardId),
  ]
);

export type CachedCardRow = typeof cachedCards.$inferSelect;
export type NewCachedCardRow = typeof cachedCards.$inferInsert;
export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type BinderRow = typeof binders.$inferSelect;
export type NewBinderRow = typeof binders.$inferInsert;
export type BinderCardRow = typeof binderCards.$inferSelect;
