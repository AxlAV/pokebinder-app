import type { CardVariant } from '@/db/schema';
import type { TcgdexCardVariants } from '@/services/tcgdex';
import type { CardVariantCounts } from '@/db/repository';

export interface ResolvedCardVariantsInfo {
  /** Variantes válidas para esta carta según TCGdex y reglas oficiales de PTCG. */
  availableVariants: CardVariant[];
  /** true cuando la carta es Full Art, Secret Rare, Ilustración o ex/V (acabado único Holo). */
  isSingleVariantSpecial: boolean;
  /** Variante por defecto recomendada para esta carta. */
  defaultVariant: CardVariant;
  /** Etiqueta descriptiva cuando es de acabado único (ej. "FULL ART // HOLO FOIL"). */
  specialBadgeLabel: string | null;
}

const SPECIAL_SINGLE_VARIANT_NAME_REGEX =
  /\b(ex|gx|vmax|vstar|v-astro|v-union|v|radiante|radiant|break|lv\.x)\b/i;

const SPECIAL_SINGLE_VARIANT_RARITY_REGEX =
  /(ilustraci[oó]n|illustration|secreta|secret|ultra|h[ií]per|hyper|doble|double|full\s*art|radiante|radiant|shiny|variocolor|ace\s*spec|as\s*t[aá]ctico|amazing|incre[ií]ble)/i;

const GALLERY_LOCAL_ID_REGEX = /^(TG|GG|SV|RC|SH)\d+/i;

/**
 * Determina qué variantes físicas (Normal, Reverse Holo, Holo) existen realmente para una carta.
 * - En cartas Full Art, Secret Rare (XXX > YYY), Ilustración, Galería (TG/GG) o ex/V/VMAX/VSTAR,
 *   devuelve únicamente `['holo']` para no pedir al usuario elegir entre Normal/Reverse/Holo.
 * - En cartas regulares, usa `variants` de TCGdex (ej. Común -> Normal + Reverse; Rara SV -> Reverse + Holo).
 */
export function resolveCardVariants(params: {
  cardName?: string | null;
  localId?: string | null;
  setOfficialCount?: number | null;
  rarity?: string | null;
  tcgdexVariants?: TcgdexCardVariants | null;
  existingCounts?: CardVariantCounts | null;
}): ResolvedCardVariantsInfo {
  const {
    cardName,
    localId,
    setOfficialCount,
    rarity,
    tcgdexVariants,
    existingCounts,
  } = params;

  const numLocal = localId
    ? parseInt(localId.replace(/^\D+/, ''), 10)
    : NaN;
  const isBeyondOfficialSet =
    Boolean(setOfficialCount && setOfficialCount > 0) &&
    !Number.isNaN(numLocal) &&
    numLocal > (setOfficialCount ?? 0);

  const isGallerySubset = Boolean(
    localId && GALLERY_LOCAL_ID_REGEX.test(localId.trim())
  );
  const isSpecialByName = Boolean(
    cardName && SPECIAL_SINGLE_VARIANT_NAME_REGEX.test(cardName)
  );
  const isSpecialByRarity = Boolean(
    rarity && SPECIAL_SINGLE_VARIANT_RARITY_REGEX.test(rarity)
  );

  // Detectar si TCGdex explícitamente declara que solo existe Holo (sin Normal ni Reverse)
  const isTcgdexHoloOnly = Boolean(
    tcgdexVariants &&
      tcgdexVariants.holo === true &&
      !tcgdexVariants.normal &&
      !tcgdexVariants.reverse
  );

  if (
    isBeyondOfficialSet ||
    isGallerySubset ||
    isSpecialByName ||
    isSpecialByRarity ||
    isTcgdexHoloOnly
  ) {
    let badge = 'FULL ART // HOLO FOIL';
    if (isBeyondOfficialSet) {
      badge = rarity ? `${rarity.toUpperCase()} // FULL ART` : 'SECRETA // FULL ART';
    } else if (isGallerySubset) {
      badge = 'GALERÍA // FULL ART HOLO';
    } else if (isSpecialByRarity && rarity) {
      badge = `${rarity.toUpperCase()} // HOLO FOIL`;
    } else if (isSpecialByName) {
      badge = 'ULTRA RARA // HOLO FOIL';
    }

    return {
      availableVariants: ['holo'],
      isSingleVariantSpecial: true,
      defaultVariant: 'holo',
      specialBadgeLabel: badge,
    };
  }

  // Si tenemos el objeto variants de TCGdex para una carta estándar
  if (tcgdexVariants) {
    const list: CardVariant[] = [];
    if (tcgdexVariants.normal || (existingCounts?.normal ?? 0) > 0) {
      list.push('normal');
    }
    if (tcgdexVariants.reverse || (existingCounts?.reverse ?? 0) > 0) {
      list.push('reverse');
    }
    if (tcgdexVariants.holo || (existingCounts?.holo ?? 0) > 0) {
      list.push('holo');
    }

    if (list.length === 1) {
      const only = list[0];
      return {
        availableVariants: list,
        isSingleVariantSpecial: true,
        defaultVariant: only,
        specialBadgeLabel:
          only === 'holo'
            ? 'ACABADO ÚNICO // HOLO FOIL'
            : only === 'reverse'
              ? 'ACABADO ÚNICO // REVERSE HOLO'
              : 'ACABADO ÚNICO // NORMAL',
      };
    }

    if (list.length > 1) {
      return {
        availableVariants: list,
        isSingleVariantSpecial: false,
        defaultVariant: list[0],
        specialBadgeLabel: null,
      };
    }
  }

  // Fallback offline cuando aún no se descargó el detalle de una carta común/rara estándar
  return {
    availableVariants: ['normal', 'reverse', 'holo'],
    isSingleVariantSpecial: false,
    defaultVariant: 'normal',
    specialBadgeLabel: null,
  };
}
