import type { CatalogLanguage } from '@/store/usePreferencesStore';

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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar TCGdex`);
  }

  return (await response.json()) as T;
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
 * Parsea una búsqueda libre (ej. "Pikachu", "025/165", "Charizard 199/165")
 * y consulta el endpoint de cartas de TCGdex.
 */
export async function searchCards(
  lang: CatalogLanguage,
  rawQuery: string
): Promise<TcgdexCardBrief[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  // Detectar si incluye fracción tipo XXX/YYY o número aislado
  const fractionMatch = trimmed.match(/(?:^|\s)(\d{1,4})\s*\/\s*(\d{1,4})(?:\s|$)/);
  const namePart = trimmed
    .replace(/(?:^|\s)\d{1,4}\s*\/\s*\d{1,4}(?:\s|$)/, ' ')
    .trim();

  const params = new URLSearchParams();

  if (fractionMatch) {
    const rawNumber = fractionMatch[1];
    params.append('localId', rawNumber);
    if (namePart.length > 0) {
      params.append('name', namePart);
    }
  } else if (/^\d{1,4}$/.test(trimmed)) {
    params.append('localId', trimmed);
  } else {
    params.append('name', trimmed);
  }

  const url = `${TCGDEX_BASE_URL}/${lang}/cards?${params.toString()}`;
  const results = await fetchJson<TcgdexCardBrief[]>(url);

  // Si buscó con ceros a la izquierda (ej. "025/165") y no hubo match exacto, intentar sin ceros
  if (results.length === 0 && fractionMatch) {
    const unpadded = String(parseInt(fractionMatch[1], 10));
    if (unpadded !== fractionMatch[1] && unpadded !== 'NaN') {
      const retryParams = new URLSearchParams();
      retryParams.append('localId', unpadded);
      if (namePart.length > 0) {
        retryParams.append('name', namePart);
      }
      const retryResults = await fetchJson<TcgdexCardBrief[]>(
        `${TCGDEX_BASE_URL}/${lang}/cards?${retryParams.toString()}`
      );
      if (retryResults.length > 0) {
        return [...retryResults].reverse().slice(0, 120);
      }
    }

    // Si la combinación nombre + número no dio resultados (ej. por variación de OCR),
    // intentar primero solo por nombre del Pokémon y luego solo por localId
    if (namePart.length >= 2) {
      const byNameOnly = await fetchJson<TcgdexCardBrief[]>(
        `${TCGDEX_BASE_URL}/${lang}/cards?name=${encodeURIComponent(namePart)}`
      );
      if (byNameOnly.length > 0) {
        return [...byNameOnly].reverse().slice(0, 120);
      }
    }

    const byNumberOnly = await fetchJson<TcgdexCardBrief[]>(
      `${TCGDEX_BASE_URL}/${lang}/cards?localId=${encodeURIComponent(fractionMatch[1])}`
    );
    return [...byNumberOnly].reverse().slice(0, 120);
  }

  // Priorizar cartas más recientes con imagen disponible y limitar lote de renderizado inicial
  const sorted = [...results].reverse().sort((a, b) => {
    if (a.image && !b.image) return -1;
    if (!a.image && b.image) return 1;
    return 0;
  });

  return sorted.slice(0, 120);
}

/**
 * Obtiene el detalle completo de una carta individual por su ID global (ej. "sv03.5-199").
 */
export async function fetchCardDetail(
  lang: CatalogLanguage,
  cardId: string
): Promise<TcgdexCardDetail> {
  return fetchJson<TcgdexCardDetail>(
    `${TCGDEX_BASE_URL}/${lang}/cards/${encodeURIComponent(cardId)}`
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

