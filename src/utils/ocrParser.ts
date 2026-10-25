import { NativeModules } from 'react-native';
import TextRecognition, {
  type TextLine,
} from '@react-native-ml-kit/text-recognition';
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
  /^(b[aá]sico|basic|fase\s*[12]|stage\s*[12]|vstar|vmax|mega|restored|pok[eé]mon)$/i,
  /^(evoluciona\s+de|evolves\s+from|entrenador|trainer|objeto|item|partidario|supporter|estadio|stadium|herramienta|tool)/i,
  /^(pon\s+a|put\s+|coloca\s+|habilidad|ability|debilidad|weakness|resistencia|resistance|retirada|retreat)/i,
  /^(illus\.|ilustr|©|n\.º|no\.)/i,
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

function cleanCandidateTitleLine(rawLine: string): string {
  return rawLine
    .replace(/\b(ps|hp)\s*\d{2,3}\b/gi, '')
    .replace(/\b\d{2,3}\s*(ps|hp)\b/gi, '')
    .replace(/\b(b[aá]sico|basic|fase\s*[12]|stage\s*[12])\b/gi, '')
    .replace(/[|•«»"“”]/g, '')
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
 * Extrae el nombre superior de la carta y la fracción inferior XXX/YYY desde bloques de texto OCR (ML Kit).
 */
export function parseCardOcrText(rawText: string): OcrExtractedCardData {
  const normalizedText = normalizeOcrDigits(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Buscar fracción inferior XXX/YYY (soporta estándar 199/165, 025/165 o galería TG15/TG30)
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
    const cleaned = cleanCandidateTitleLine(line);
    if (!isValidTitleCandidate(cleaned)) continue;

    extractedName = cleaned;
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
 * Ejecuta Google ML Kit Text Recognition sobre el URI de una foto capturada o subida de galería.
 * Usa las coordenadas espaciales (frame.top y frame.height) para priorizar el título superior
 * y el número de colección inferior XXX/YYY.
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

  // Buscar la mejor línea de título en el 40% superior de la carta (priorizando mayor altura de letra)
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

  // Buscar la fracción XXX/YYY empezando desde abajo
  let detectedFraction: string | null = null;
  for (let i = allLines.length - 1; i >= 0; i--) {
    const normalized = normalizeOcrDigits(allLines[i].text);
    const match = normalized.match(fractionRegex);
    if (match) {
      detectedFraction = `${match[1].toUpperCase()}/${match[2].toUpperCase()}`;
      break;
    }
  }

  const summaryLines: string[] = [];
  if (bestTitleLine) summaryLines.push(bestTitleLine);
  if (detectedFraction) summaryLines.push(detectedFraction);

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
