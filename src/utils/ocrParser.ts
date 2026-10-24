import type { TcgdexCardBrief } from '@/services/tcgdex';

export interface OcrExtractedCardData {
  rawText: string;
  extractedName: string | null;
  cleanSearchName: string | null;
  extractedFraction: string | null;
  localId: string | null;
  printedSetTotal: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const NOISE_HEADER_PATTERNS = [
  /^(b[aá]sico|basic|fase\s*[12]|stage\s*[12]|vstar|vmax|mega|restored)$/i,
  /^(evoluciona\s+de|evolves\s+from|entrenador|trainer|objeto|item|partidario|supporter|estadio|stadium)$/i,
  /^\d+\s*(ps|hp)$/i,
  /^(ps|hp)\s*\d+$/i,
];

/**
 * Normaliza errores frecuentes de OCR en dígitos de cartas (ej. "O25/165" -> "025/165", "l99/165" -> "199/165").
 */
function normalizeOcrDigits(input: string): string {
  return input
    .replace(/([OQo])(?=\d)/g, '0')
    .replace(/(?<=\d)([OQo])/g, '0')
    .replace(/([Il|])(?=\d)/g, '1')
    .replace(/(?<=\d)([Il|])/g, '1');
}

/**
 * Extrae el nombre superior de la carta y la fracción inferior XXX/YYY desde bloques de texto OCR (ML Kit).
 */
export function parseCardOcrText(rawText: string): OcrExtractedCardData {
  const normalizedText = normalizeOcrDigits(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Buscar fracción inferior XXX/YYY (soporta promos/galería como TG15/TG30 o estándar 199/165)
  let extractedFraction: string | null = null;
  let localId: string | null = null;
  let printedSetTotal: string | null = null;

  const fractionRegex = /\b([A-Z]{0,3}\d{1,4})\s*\/\s*([A-Z]{0,3}\d{1,4})\b/i;

  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(fractionRegex);
    if (match) {
      localId = match[1].toUpperCase();
      printedSetTotal = match[2].toUpperCase();
      extractedFraction = `${localId}/${printedSetTotal}`;
      break;
    }
  }

  // 2. Buscar nombre del Pokémon / Carta en las primeras líneas (zona superior)
  let extractedName: string | null = null;

  for (const line of lines) {
    if (fractionRegex.test(line)) continue;

    // Limpiar indicadores de PS/HP en la misma línea (ej. "Charizard ex PS 330")
    const withoutHp = line
      .replace(/\b(ps|hp)\s*\d+\b/gi, '')
      .replace(/\b\d+\s*(ps|hp)\b/gi, '')
      .replace(/\b(b[aá]sico|basic|fase\s*[12]|stage\s*[12])\b/gi, '')
      .trim();

    if (withoutHp.length < 2) continue;
    if (NOISE_HEADER_PATTERNS.some((pat) => pat.test(withoutHp))) continue;
    if (/^\d+$/.test(withoutHp)) continue;

    extractedName = withoutHp;
    break;
  }

  // Nombre limpio sin sufijos de mecánica para mejorar recall en TCGdex
  const cleanSearchName = extractedName
    ? extractedName
        .replace(/\b(ex|gx|vmax|vstar|v|lv\.x|break)\b/gi, '')
        .trim() || extractedName
    : null;

  const confidence: OcrExtractedCardData['confidence'] =
    extractedName && extractedFraction
      ? 'high'
      : extractedName || extractedFraction
        ? 'medium'
        : 'low';

  return {
    rawText,
    extractedName,
    cleanSearchName,
    extractedFraction,
    localId,
    printedSetTotal,
    confidence,
  };
}

/**
 * Construye la consulta ideal para searchCards() de TCGdex a partir de los datos extraídos por OCR.
 */
export function buildTcgdexQueryFromOcr(ocr: OcrExtractedCardData): string {
  if (ocr.cleanSearchName && ocr.extractedFraction) {
    return `${ocr.cleanSearchName} ${ocr.extractedFraction}`;
  }
  if (ocr.extractedName && ocr.extractedFraction) {
    return `${ocr.extractedName} ${ocr.extractedFraction}`;
  }
  if (ocr.extractedFraction) {
    return ocr.extractedFraction;
  }
  return ocr.cleanSearchName ?? ocr.extractedName ?? '';
}

/**
 * Ordena los candidatos de TCGdex priorizando coincidencia exacta de número local (XXX) y nombre.
 */
export function rankOcrCardCandidates(
  candidates: TcgdexCardBrief[],
  ocr: OcrExtractedCardData
): TcgdexCardBrief[] {
  if (candidates.length <= 1) return candidates;

  const targetLocal = ocr.localId?.replace(/^0+/, '').toLowerCase() ?? null;
  const targetName = ocr.cleanSearchName?.toLowerCase() ?? null;

  return [...candidates].sort((a, b) => {
    let scoreA = a.image ? 2 : 0;
    let scoreB = b.image ? 2 : 0;

    if (targetLocal) {
      const aLocal = a.localId.replace(/^0+/, '').toLowerCase();
      const bLocal = b.localId.replace(/^0+/, '').toLowerCase();
      if (aLocal === targetLocal) scoreA += 10;
      if (bLocal === targetLocal) scoreB += 10;
    }

    if (targetName) {
      if (a.name.toLowerCase().includes(targetName)) scoreA += 5;
      if (b.name.toLowerCase().includes(targetName)) scoreB += 5;
    }

    return scoreB - scoreA;
  });
}
