import type { CatalogLanguage } from '@/store/usePreferencesStore';
import {
  extractSetCodeFromText,
  findSetIdsByCode,
  inferSetIdFromCardId,
} from '@/utils/cardIds';

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';

export interface TcgdexCardCount {
  total: number;
  official: number;
}

export interface TcgdexSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: TcgdexCardCount;
}

export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgdexSetDetail extends TcgdexSetBrief {
  releaseDate?: string;
  serie?: {
    id: string;
    name: string;
  };
  cards: TcgdexCardBrief[];
}

export interface TcgdexCardVariants {
  normal?: boolean;
  reverse?: boolean;
  holo?: boolean;
  firstEdition?: boolean;
}

export interface TcgdexCardDetail extends TcgdexCardBrief {
  rarity?: string;
  category?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  illustrator?: string;
  variants?: TcgdexCardVariants;
  set: {
    id: string;
    name: string;
    logo?: string;
    symbol?: string;
    cardCount: TcgdexCardCount;
  };
}

/**
 * Construye la URL de imagen de carta desde el asset base de TCGdex.
 */
export function getCardImageUrl(
  baseImage?: string,
  quality: 'low' | 'high' = 'low'
): string | null {
  if (!baseImage) return null;
  return `${baseImage}/${quality}.png`;
}

/**
 * Construye la URL del logo oficial de una expansión.
 */
export function getSetLogoUrl(baseLogo?: string): string | null {
  if (!baseLogo) return null;
  return `${baseLogo}.png`;
}

/**
 * Construye la URL del símbolo de una expansión.
 */
export function getSetSymbolUrl(baseSymbol?: string): string | null {
  if (!baseSymbol) return null;
  return `${baseSymbol}.png`;
}

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * GET JSON con tiempo límite: sin él, una red mala deja la consulta colgada
 * y el esqueleto de carga nunca da paso al estado de error ni al respaldo offline.
 */
async function fetchJson<T>(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al consultar TCGdex`);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('TCGdex no respondió a tiempo. Revisa tu conexión.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtiene el listado completo de expansiones (sets) en el idioma indicado.
 * Se invierte el orden para mostrar primero las expansiones más recientes.
 */
export async function fetchSets(lang: CatalogLanguage): Promise<TcgdexSetBrief[]> {
  const sets = await fetchJson<TcgdexSetBrief[]>(`${TCGDEX_BASE_URL}/${lang}/sets`);
  return [...sets].reverse();
}

/**
 * Obtiene el detalle de una expansión específica junto con todas sus cartas.
 */
export async function fetchSetDetail(
  lang: CatalogLanguage,
  setId: string
): Promise<TcgdexSetDetail> {
  return fetchJson<TcgdexSetDetail>(
    `${TCGDEX_BASE_URL}/${lang}/sets/${encodeURIComponent(setId)}`
  );
}

/**
 * Parsea una búsqueda libre (ej. "Pikachu", "025/165", "Charizard MEW 199/165")
 * y consulta el endpoint de cartas de TCGdex.
 */
export async function searchCards(
  lang: CatalogLanguage,
  rawQuery: string
): Promise<TcgdexCardBrief[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  // Detectar fracción XXX/YYY, incluidas las de subsets de galería (TG15/TG30, GG01/GG70)
  const fractionPattern = /(?:^|\s)([A-Z]{0,3}\d{1,4})\s*\/\s*([A-Z]{0,3}\d{1,4})(?:\s|$)/i;
  const fractionMatch = trimmed.match(fractionPattern);
  const rawLocalId = fractionMatch ? fractionMatch[1].toUpperCase() : null;

  // Detectar si incluye un código de colección del cuadradito negro (ej. "MEW", "OBF", "SVI")
  const detectedSetCode = extractSetCodeFromText(trimmed);
  const matchingSetIds = new Set(
    detectedSetCode ? findSetIdsByCode(detectedSetCode) : []
  );

  let namePart = trimmed.replace(fractionPattern, ' ').trim();
  if (detectedSetCode) {
    const withoutCode = namePart
      .replace(new RegExp(`(?:^|\\s)${detectedSetCode}(?:\\s|$)`, 'i'), ' ')
      .trim();
    if (withoutCode.length > 0 || rawLocalId) {
      namePart = withoutCode;
    }
  }

  const prioritizeResults = (list: TcgdexCardBrief[]): TcgdexCardBrief[] => {
    const targetLocal = rawLocalId?.replace(/^0+/, '').toLowerCase() ?? null;
    return [...list]
      .reverse()
      .sort((a, b) => {
        let scoreA = a.image ? 2 : 0;
        let scoreB = b.image ? 2 : 0;

        if (matchingSetIds.size > 0) {
          const setA = inferSetIdFromCardId(a.id, a.localId);
          const setB = inferSetIdFromCardId(b.id, b.localId);
          if (matchingSetIds.has(setA)) scoreA += 20;
          if (matchingSetIds.has(setB)) scoreB += 20;
        }

        if (targetLocal) {
          const locA = a.localId.replace(/^0+/, '').toLowerCase();
          const locB = b.localId.replace(/^0+/, '').toLowerCase();
          if (locA === targetLocal) scoreA += 15;
          if (locB === targetLocal) scoreB += 15;
        }

        return scoreB - scoreA;
      })
      .slice(0, 120);
  };

  const params = new URLSearchParams();

  if (rawLocalId) {
    params.append('localId', rawLocalId);
    if (namePart.length > 0) {
      params.append('name', namePart);
    }
  } else if (/^[A-Z]{0,2}\d{1,4}$/i.test(namePart)) {
    params.append('localId', namePart.toUpperCase());
  } else {
    params.append('name', namePart);
  }

  const url = `${TCGDEX_BASE_URL}/${lang}/cards?${params.toString()}`;
  const results = await fetchJson<TcgdexCardBrief[]>(url);

  // Si buscó con ceros a la izquierda (ej. "025/165") y no hubo match exacto, intentar sin ceros
  if (results.length === 0 && rawLocalId) {
    const unpadded = rawLocalId.replace(/^0+/, '');
    if (unpadded && unpadded !== rawLocalId) {
      const retryParams = new URLSearchParams();
      retryParams.append('localId', unpadded);
      if (namePart.length > 0) {
        retryParams.append('name', namePart);
      }
      const retryResults = await fetchJson<TcgdexCardBrief[]>(
        `${TCGDEX_BASE_URL}/${lang}/cards?${retryParams.toString()}`
      );
      if (retryResults.length > 0) {
        return prioritizeResults(retryResults);
      }
    }

    // Si la combinación nombre + número no dio resultados (ej. por variación de OCR en el nombre),
    // intentar por nombre del Pokémon y también por localId (con y sin ceros)
    if (namePart.length >= 2) {
      const byNameOnly = await fetchJson<TcgdexCardBrief[]>(
        `${TCGDEX_BASE_URL}/${lang}/cards?name=${encodeURIComponent(namePart)}`
      );
      if (byNameOnly.length > 0) {
        return prioritizeResults(byNameOnly);
      }
    }

    const byNumberPadded = await fetchJson<TcgdexCardBrief[]>(
      `${TCGDEX_BASE_URL}/${lang}/cards?localId=${encodeURIComponent(rawLocalId)}`
    );
    if (byNumberPadded.length > 0) {
      return prioritizeResults(byNumberPadded);
    }

    if (unpadded && unpadded !== rawLocalId) {
      const byNumberUnpadded = await fetchJson<TcgdexCardBrief[]>(
        `${TCGDEX_BASE_URL}/${lang}/cards?localId=${encodeURIComponent(unpadded)}`
      );
      return prioritizeResults(byNumberUnpadded);
    }

    return [];
  }

  return prioritizeResults(results);
}

/**
 * Obtiene el detalle completo de una carta individual por su ID global (ej. "sv03.5-199").
 */
export async function fetchCardDetail(
  lang: CatalogLanguage,
  cardId: string,
  timeoutMs?: number
): Promise<TcgdexCardDetail> {
  return fetchJson<TcgdexCardDetail>(
    `${TCGDEX_BASE_URL}/${lang}/cards/${encodeURIComponent(cardId)}`,
    timeoutMs
  );
}

/**
 * Obtiene las cartas que pertenecen a un tipo elemental desde TCGdex API.
 */
export async function fetchCardsByElementalType(
  lang: CatalogLanguage,
  typeName: string
): Promise<TcgdexCardBrief[]> {
  const trimmed = typeName.trim();
  if (!trimmed) return [];
  const results = await fetchJson<TcgdexCardBrief[]>(
    `${TCGDEX_BASE_URL}/${lang}/cards?types=${encodeURIComponent(trimmed)}`
  );
  return [...results].reverse();
}

