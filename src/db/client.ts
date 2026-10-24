import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

const DATABASE_NAME = 'pokebinder.db';

/**
 * Instancia síncrona moderna de expo-sqlite (SDK 51+).
 */
export const sqliteDb = openDatabaseSync(DATABASE_NAME);

/**
 * Instancia tipada de Drizzle ORM conectada al motor SQLite local.
 */
export const db = drizzle(sqliteDb, { schema });

let isMigrated = false;

/**
 * Ejecuta las migraciones DDL idempotentes al iniciar la app.
 * Activa claves foráneas y modo WAL para lecturas/escrituras rápidas offline.
 */
export function runDatabaseMigrations(): void {
  if (isMigrated) return;

  sqliteDb.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS cached_cards (
      id TEXT PRIMARY KEY NOT NULL,
      local_id TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      set_id TEXT NOT NULL,
      set_name TEXT NOT NULL,
      set_logo TEXT,
      set_official_count INTEGER NOT NULL DEFAULT 0,
      set_total_count INTEGER NOT NULL DEFAULT 0,
      rarity TEXT,
      types_json TEXT NOT NULL DEFAULT '[]',
      variants_json TEXT NOT NULL DEFAULT '{"normal":true,"reverse":false,"holo":false}',
      illustrator TEXT,
      language TEXT NOT NULL DEFAULT 'es',
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cached_cards_set_id ON cached_cards(set_id);
    CREATE INDEX IF NOT EXISTS idx_cached_cards_name ON cached_cards(name);

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY NOT NULL,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL CHECK(variant IN ('normal', 'reverse', 'holo')),
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cached_cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_card_id ON inventory_items(card_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_items(variant);

    CREATE TABLE IF NOT EXISTS binders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('set', 'manual', 'dynamic')),
      set_id TEXT,
      set_name TEXT,
      set_logo TEXT,
      set_official_count INTEGER,
      set_total_count INTEGER,
      rule_type TEXT CHECK(rule_type IN ('pokemon', 'element') OR rule_type IS NULL),
      rule_value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS binder_cards (
      id TEXT PRIMARY KEY NOT NULL,
      binder_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cached_cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_binder_cards_binder_id ON binder_cards(binder_id);
    CREATE INDEX IF NOT EXISTS idx_binder_cards_card_id ON binder_cards(card_id);
  `);

  isMigrated = true;
}
