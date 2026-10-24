export interface ElementalTypeOption {
  id: string;
  labelEs: string;
  labelEn: string;
  code: string;
}

export const ELEMENTAL_TYPES: ReadonlyArray<ElementalTypeOption> = [
  { id: 'fire', labelEs: 'Fuego', labelEn: 'Fire', code: 'FIR' },
  { id: 'water', labelEs: 'Agua', labelEn: 'Water', code: 'WTR' },
  { id: 'grass', labelEs: 'Planta', labelEn: 'Grass', code: 'GRS' },
  { id: 'lightning', labelEs: 'Rayo', labelEn: 'Lightning', code: 'LTG' },
  { id: 'psychic', labelEs: 'Psíquico', labelEn: 'Psychic', code: 'PSY' },
  { id: 'fighting', labelEs: 'Lucha', labelEn: 'Fighting', code: 'FGT' },
  { id: 'darkness', labelEs: 'Oscura', labelEn: 'Darkness', code: 'DRK' },
  { id: 'metal', labelEs: 'Metálica', labelEn: 'Metal', code: 'MTL' },
  { id: 'dragon', labelEs: 'Dragón', labelEn: 'Dragon', code: 'DRG' },
  { id: 'colorless', labelEs: 'Incolora', labelEn: 'Colorless', code: 'CLR' },
] as const;

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Devuelve los sinónimos ES/EN de un tipo elemental para comparar contra typesJson o TCGdex.
 */
export function getElementalAliases(ruleValue: string): string[] {
  const norm = normalizeText(ruleValue);
  const found = ELEMENTAL_TYPES.find(
    (t) =>
      normalizeText(t.id) === norm ||
      normalizeText(t.labelEs) === norm ||
      normalizeText(t.labelEn) === norm
  );

  if (!found) return [norm];
  return [
    normalizeText(found.id),
    normalizeText(found.labelEs),
    normalizeText(found.labelEn),
  ];
}

/**
 * Comprueba si el JSON de tipos de una carta en caché coincide con el tipo elemental de la regla.
 */
export function matchesElementalType(
  typesJson: string,
  ruleValue: string
): boolean {
  const aliases = getElementalAliases(ruleValue);
  try {
    const parsed = JSON.parse(typesJson) as string[];
    if (!Array.isArray(parsed)) return false;
    return parsed.some((t) => aliases.includes(normalizeText(t)));
  } catch {
    return false;
  }
}

/**
 * Devuelve el nombre del tipo en el idioma solicitado para consultar TCGdex API (?types=...).
 */
export function getTcgdexTypeParam(
  ruleValue: string,
  lang: 'es' | 'en'
): string {
  const norm = normalizeText(ruleValue);
  const found = ELEMENTAL_TYPES.find(
    (t) =>
      normalizeText(t.id) === norm ||
      normalizeText(t.labelEs) === norm ||
      normalizeText(t.labelEn) === norm
  );
  if (!found) return ruleValue.trim();
  return lang === 'es' ? found.labelEs : found.labelEn;
}
