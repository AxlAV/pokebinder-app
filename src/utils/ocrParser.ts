import { NativeModules } from 'react-native';
import TextRecognition, {
  type TextLine,
} from '@react-native-ml-kit/text-recognition';
import type { TcgdexCardBrief, TcgdexSetBrief } from '@/services/tcgdex';
import {
  inferSetIdFromCardId,
  getSetOfficialCode,
  findSetIdsByCode,
  extractSetCodeFromText,
} from '@/utils/cardIds';

export interface OcrExtractedCardData {
  rawText: string;
  extractedName: string | null;
  cleanSearchName: string | null;
  extractedFraction: string | null;
  localId: string | null;
  printedSetTotal: string | null;
  extractedSetCode: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface SuggestedSetOption {
  setId: string;
  code: string;
  name: string;
  symbol?: string;
  officialCount: number;
  totalCount: number;
  matchReason: 'code' | 'total' | 'candidate';
}

const NOISE_HEADER_PATTERNS = [
  /^(b[aá]sico|basic|fase\s*[12]|stage\s*[12]|vstar|vmax|mega|restored|pok[eé]mon|entrenador|trainer)$/i,
  /^(evoluciona\s+de|evolves\s+from|objeto|item|partidario|supporter|estadio|stadium|herramienta|tool)/i,
  /^(pon\s+a|put\s+|coloca\s+|habilidad|ability|debilidad|weakness|resistencia|resistance|retirada|retreat)/i,
  /^(illus\.|ilustr|©|n\.º|no\.|regla\s+|rule\s+)/i,
  /^\d+\s*(ps|hp)$/i,
  /^(ps|hp)\s*\d+$/i,
];

/**
 * Normaliza errores frecuentes de OCR en dígitos de cartas:
 * ej. "O25/165" -> "025/165", "l99/165" -> "199/165", "025/16S" -> "025/165".
 */
function normalizeOcrDigits(input: string): string {
  return input
    .replace(/([OQo])(?=\d)/g, '0')
    .replace(/(?<=\d)([OQo])/g, '0')
    .replace(/([Il|])(?=\d)/g, '1')
    .replace(/(?<=\d)([Il|])/g, '1')
    .replace(/(?<=\d)S(?=\d|\s*\/|\b)/g, '5')
    .replace(/(?<=\/\s*\d*)S(?=\d|\b)/g, '5');
}

function cleanCandidateTitleLine(rawLine: string): string {
  return rawLine
    .replace(/\b(ps|hp)\s*\d{2,3}\b/gi, '')
    .replace(/\b\d{2,3}\s*(ps|hp)\b/gi, '')
    .replace(/\b(b[aá]sico|basic|fase\s*[12]|stage\s*[12])\b/gi, '')
    .replace(/\b(evoluciona\s+de|evolves\s+from)\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ-]+/gi, '')
    // Quitar PS/HP sueltos al final de la línea (ej. "Charizard ex 330" o "Pikachu 60")
    .replace(/\s+[1-3]?\d0$/g, '')
    .replace(/[|•«»"“”_~]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isValidTitleCandidate(cleaned: string): boolean {
  if (cleaned.length < 3 || cleaned.length > 32) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleaned)) return false;
  if (NOISE_HEADER_PATTERNS.some((pat) => pat.test(cleaned))) return false;
  // Descartar líneas con demasiadas palabras (suelen ser descripciones de ataques)
  if (cleaned.split(/\s+/).length > 4) return false;
  return true;
}

/**
 * Extrae el nombre superior de la carta, la fracción inferior XXX/YYY
 * y el código del cuadradito negro de la colección desde texto OCR o manual.
 */
export function parseCardOcrText(rawText: string): OcrExtractedCardData {
  const normalizedText = normalizeOcrDigits(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Buscar fracción inferior XXX/YYY (soporta estándar 199/165, 025/165 o galería TG15/TG30, GG01/GG70)
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

  // Fallback si solo hay un número suelto tipo "#025" o "025" en una línea aparte
  if (!localId) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const numMatch = lines[i].match(/(?:^|#|\bN\.?º?\s*)([A-Z]{0,2}\d{1,3})$/i);
      if (numMatch) {
        localId = numMatch[1].toUpperCase();
        break;
      }
    }
  }

  // 2. Detectar código oficial del cuadradito negro de la colección (ej. MEW, OBF, PAL, SVI, PRE, TEF)
  const extractedSetCode = extractSetCodeFromText(normalizedText);

  // 3. Buscar nombre del Pokémon / Carta en las primeras líneas (zona superior)
  let extractedName: string | null = null;

  for (const line of lines) {
    // Si la línea tiene tanto el nombre como la fracción (ej. ingreso manual "Pikachu 025/165" o "Pikachu MEW 025/165"),
    // quitar la fracción y el código de set para rescatar el nombre
    const withoutFraction = line.replace(fractionRegex, ' ').trim();
    const withoutSetCode = extractedSetCode
      ? withoutFraction
          .replace(new RegExp(`\\b${extractedSetCode}\\b`, 'i'), ' ')
          .trim()
      : withoutFraction;

    if (!withoutSetCode) continue;
    const cleaned = cleanCandidateTitleLine(withoutSetCode);
    if (!isValidTitleCandidate(cleaned)) continue;

    extractedName = cleaned;
    break;
  }

  // Nombre limpio sin sufijos de mecánica para mejorar recall en TCGdex
  const cleanSearchName = extractedName
    ? extractedName
        .replace(/\b(ex|gx|vmax|vstar|v|lv\.x|break|radiante|radiant)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || extractedName
    : null;

  const confidence: OcrExtractedCardData['confidence'] =
    extractedName && (extractedFraction || extractedSetCode)
      ? 'high'
      : extractedName || extractedFraction || localId
        ? 'medium'
        : 'low';

  return {
    rawText,
    extractedName,
    cleanSearchName,
    extractedFraction,
    localId,
    printedSetTotal,
    extractedSetCode,
    confidence,
  };
}

/**
 * Ejecuta Google ML Kit Text Recognition sobre el URI de una foto capturada o subida de galería.
 * Usa las coordenadas espaciales (frame.top y frame.height) para priorizar el título superior,
 * el número de colección inferior XXX/YYY y el código del cuadradito negro de la colección.
 */
export async function recognizeCardFromImageUri(
  imageUri: string
): Promise<string> {
  if (!NativeModules.TextRecognition) {
    throw new Error(
      'El motor nativo de ML Kit OCR requiere instalar el APK actualizado.'
    );
  }

  const result = await TextRecognition.recognize(imageUri);
  const allLines: TextLine[] = [];

  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      if (line.text?.trim()) {
        allLines.push(line);
      }
    }
  }

  if (allLines.length === 0) {
    return result.text?.trim() ?? '';
  }

  // Ordenar de arriba hacia abajo según la coordenada vertical en la foto
  allLines.sort((a, b) => (a.frame?.top ?? 0) - (b.frame?.top ?? 0));

  const minTop = allLines[0]?.frame?.top ?? 0;
  const maxTop = allLines[allLines.length - 1]?.frame?.top ?? minTop + 1;
  const verticalSpan = Math.max(1, maxTop - minTop);

  const fractionRegex = /\b([A-Z]{0,3}\d{1,4})\s*\/\s*([A-Z]{0,3}\d{1,4})\b/i;

  // Buscar la mejor línea de título en el 42% superior de la carta (priorizando mayor altura de letra)
  const topLines = allLines.filter(
    (l) => ((l.frame?.top ?? minTop) - minTop) / verticalSpan <= 0.42
  );

  let bestTitleLine: string | null = null;
  let bestHeight = -1;

  for (const line of topLines.length > 0 ? topLines : allLines.slice(0, 5)) {
    const normalized = normalizeOcrDigits(line.text);
    if (fractionRegex.test(normalized)) continue;
    const cleaned = cleanCandidateTitleLine(normalized);
    if (!isValidTitleCandidate(cleaned)) continue;

    const h = line.frame?.height ?? 0;
    if (h > bestHeight) {
      bestHeight = h;
      bestTitleLine = cleaned;
    }
  }

  // Buscar la fracción XXX/YYY y el código del cuadradito negro empezando desde abajo
  let detectedFraction: string | null = null;
  const bottomTexts: string[] = [];

  for (let i = allLines.length - 1; i >= 0; i--) {
    const relPos = ((allLines[i].frame?.top ?? minTop) - minTop) / verticalSpan;
    const normalized = normalizeOcrDigits(allLines[i].text);
    if (relPos >= 0.55 || i >= allLines.length - 4) {
      bottomTexts.push(normalized);
    }
    if (!detectedFraction) {
      const match = normalized.match(fractionRegex);
      if (match) {
        detectedFraction = `${match[1].toUpperCase()}/${match[2].toUpperCase()}`;
      }
    }
  }

  const detectedSetCode = extractSetCodeFromText(bottomTexts.join('\n'));

  const summaryLines: string[] = [];
  if (bestTitleLine) summaryLines.push(bestTitleLine);
  if (detectedFraction && detectedSetCode) {
    summaryLines.push(`${detectedSetCode} ${detectedFraction}`);
  } else if (detectedFraction) {
    summaryLines.push(detectedFraction);
  } else if (detectedSetCode) {
    summaryLines.push(detectedSetCode);
  }

  if (summaryLines.length > 0) {
    return summaryLines.join('\n');
  }

  // Si no se aisló un par limpio, devolver las líneas ordenadas de arriba a abajo
  return allLines.map((l) => l.text.trim()).join('\n');
}

/**
 * Construye la consulta ideal para searchCards() de TCGdex a partir de los datos extraídos por OCR.
 */
export function buildTcgdexQueryFromOcr(ocr: OcrExtractedCardData): string {
  const parts: string[] = [];
  if (ocr.cleanSearchName) {
    parts.push(ocr.cleanSearchName);
  } else if (ocr.extractedName) {
    parts.push(ocr.extractedName);
  }

  if (ocr.extractedFraction) {
    parts.push(ocr.extractedFraction);
  } else if (ocr.localId) {
    parts.push(ocr.localId);
  }

  return parts.join(' ').trim();
}

/**
 * Ordena los candidatos de TCGdex priorizando:
 * 1) La colección seleccionada con 1 clic en el cuadradito negro (preferredSetId).
 * 2) El código del cuadradito negro detectado por OCR (extractedSetCode, ej. MEW, OBF).
 * 3) El número local exacto (XXX) y el total oficial impreso del set (YYY).
 * 4) El nombre del Pokémon.
 */
export function rankOcrCardCandidates(
  candidates: TcgdexCardBrief[],
  ocr: OcrExtractedCardData,
  setOfficialCounts: Record<string, number> = {},
  preferredSetId: string | null = null
): TcgdexCardBrief[] {
  if (candidates.length === 0) return candidates;

  const targetLocal = ocr.localId?.replace(/^0+/, '').toLowerCase() ?? null;
  const targetName = ocr.cleanSearchName?.toLowerCase() ?? null;
  const printedTotal = ocr.printedSetTotal
    ? parseInt(ocr.printedSetTotal.replace(/^\D+/, ''), 10)
    : NaN;
  const codeSetIds = new Set(
    ocr.extractedSetCode ? findSetIdsByCode(ocr.extractedSetCode) : []
  );

  const score = (card: TcgdexCardBrief): number => {
    let total = card.image ? 2 : 0;
    const setId = inferSetIdFromCardId(card.id, card.localId);

    if (preferredSetId && setId.toLowerCase() === preferredSetId.toLowerCase()) {
      total += 100;
    }

    if (
      codeSetIds.has(setId) ||
      (ocr.extractedSetCode &&
        getSetOfficialCode(setId).toUpperCase() ===
          ocr.extractedSetCode.toUpperCase())
    ) {
      total += 25;
    }

    if (targetLocal) {
      const local = card.localId.replace(/^0+/, '').toLowerCase();
      if (local === targetLocal) {
        total += 15;
      } else if (local.endsWith(targetLocal) || targetLocal.endsWith(local)) {
        total += 4;
      }
    }

    if (!Number.isNaN(printedTotal)) {
      const official = setOfficialCounts[setId];
      if (official === printedTotal) {
        total += 14;
      } else if (official && Math.abs(official - printedTotal) <= 2) {
        total += 4;
      }
    }

    if (targetName) {
      const lowerName = card.name.toLowerCase();
      if (lowerName === targetName) {
        total += 10;
      } else if (lowerName.includes(targetName)) {
        total += 6;
      }
    }

    return total;
  };

  return candidates
    .map((card) => ({ card, score: score(card) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.card);
}

/**
 * Deduce las colecciones más probables para mostrar sus "cuadraditos negros" en 1 clic
 * cuando el usuario escanea o escribe una carta.
 */
export function inferSuggestedSetsForOcr(
  candidates: TcgdexCardBrief[],
  ocr: OcrExtractedCardData,
  allSets: TcgdexSetBrief[]
): SuggestedSetOption[] {
  const setsById = new Map<string, TcgdexSetBrief>();
  for (const s of allSets) {
    setsById.set(s.id, s);
  }

  const suggestions = new Map<string, SuggestedSetOption>();

  const addSetOption = (
    setId: string,
    reason: SuggestedSetOption['matchReason']
  ) => {
    if (!setId || suggestions.has(setId)) return;
    const setMeta = setsById.get(setId);
    suggestions.set(setId, {
      setId,
      code: getSetOfficialCode(setId),
      name: setMeta?.name ?? setId.toUpperCase(),
      symbol: setMeta?.symbol,
      officialCount: setMeta?.cardCount.official ?? 0,
      totalCount: setMeta?.cardCount.total ?? 0,
      matchReason: reason,
    });
  };

  // 1. Si el OCR detectó el código del cuadradito negro (ej. MEW, OBF, PAL)
  if (ocr.extractedSetCode) {
    for (const sId of findSetIdsByCode(ocr.extractedSetCode)) {
      addSetOption(sId, 'code');
    }
  }

  // 2. Si el OCR detectó el denominador impreso XXX/YYY (ej. /165 -> 151 [MEW])
  const printedTotal = ocr.printedSetTotal
    ? parseInt(ocr.printedSetTotal.replace(/^\D+/, ''), 10)
    : NaN;
  if (!Number.isNaN(printedTotal) && printedTotal > 0) {
    for (const s of allSets) {
      if (
        s.cardCount.official === printedTotal ||
        s.cardCount.total === printedTotal
      ) {
        addSetOption(s.id, 'total');
      }
    }
  }

  // 3. Colecciones de las cartas candidatas encontradas en TCGdex
  for (const card of candidates) {
    const setId = inferSetIdFromCardId(card.id, card.localId);
    addSetOption(setId, 'candidate');
    if (suggestions.size >= 8) break;
  }

  return Array.from(suggestions.values()).slice(0, 8);
}
