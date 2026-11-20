/**
 * Mapa de setId de TCGdex -> código oficial de expansión (el código impreso en el
 * cuadradito negro inferior izquierdo de las cartas modernas o abreviatura oficial PTCG).
 */
export const SET_OFFICIAL_CODES: Readonly<Record<string, string>> = {
  base1: 'BS',
  base2: 'JU',
  basep: 'PR',
  base3: 'FO',
  base4: 'B2',
  base5: 'RO',
  gym1: 'G1',
  gym2: 'G2',
  neo1: 'N1',
  neo2: 'N2',
  si1: 'SI',
  neo3: 'N3',
  neo4: 'N4',
  lc: 'LC',
  ecard1: 'EX',
  ecard2: 'AQ',
  ecard3: 'SK',
  ex1: 'RS',
  ex2: 'SS',
  np: 'NP',
  ex3: 'DR',
  ex4: 'MA',
  ex5: 'HL',
  'tk-ex-latio': 'TK1O',
  'tk-ex-latia': 'TK1A',
  ex6: 'RG',
  pop1: 'P1',
  ex7: 'TR',
  ex8: 'DX',
  ex9: 'EM',
  pop2: 'P2',
  ex10: 'UF',
  ex11: 'DS',
  ex12: 'LM',
  'tk-ex-p': 'TK2P',
  'tk-ex-m': 'TK2M',
  pop3: 'P3',
  ex13: 'HP',
  pop4: 'P4',
  ex14: 'CG',
  ex15: 'DF',
  ex16: 'PK',
  pop5: 'P5',
  dp1: 'DP',
  dpp: 'DPP',
  dp2: 'MT',
  pop6: 'P6',
  'tk-dp-l': 'TK3L',
  'tk-dp-m': 'TK3M',
  dp3: 'SW',
  dp4: 'GE',
  pop7: 'P7',
  dp5: 'MD',
  dp6: 'LA',
  pop8: 'P8',
  dp7: 'SF',
  pl1: 'PL',
  pop9: 'P9',
  pl2: 'RR',
  pl3: 'SV',
  pl4: 'AR',
  ru1: 'RM',
  hgss1: 'HS',
  hgssp: 'HSP',
  'tk-hs-r': 'TK4R',
  'tk-hs-g': 'TK4G',
  hgss2: 'UL',
  hgss3: 'UND',
  hgss4: 'TRI',
  col1: 'COL',
  bw1: 'BLW',
  bwp: 'BWP',
  '2011bw': 'MCD11',
  bw2: 'EP',
  'tk-bw-z': 'TK5Z',
  'tk-bw-e': 'TK5E',
  bw3: 'NVI',
  bw4: 'NXD',
  bw5: 'DEX',
  '2012bw': 'MCD12',
  bw6: 'DRX',
  dv1: 'DRV',
  bw7: 'BCR',
  bw8: 'PLS',
  bw9: 'PLF',
  bw10: 'PLB',
  xyp: 'XYP',
  bw11: 'LTR',
  xy0: 'KSS',
  xy1: 'XY',
  'tk-xy-sy': 'TK6S',
  'tk-xy-n': 'TK6N',
  xy2: 'FLF',
  '2014xy': 'MCD14',
  xy3: 'FFI',
  'tk-xy-b': 'TK7A',
  'tk-xy-w': 'TK7B',
  xy4: 'PHF',
  xy5: 'PRC',
  dc1: 'DCR',
  'tk-xy-latio': 'TK8O',
  'tk-xy-latia': 'TK8A',
  xy6: 'ROS',
  xy7: 'AOR',
  xy8: 'BKT',
  '2015xy': 'MCD15',
  xy9: 'BKP',
  g1: 'GEN',
  'tk-xy-su': 'TK9S',
  'tk-xy-p': 'TK9P',
  xy10: 'FCO',
  xy11: 'STS',
  '2016xy': 'MCD16',
  xy12: 'EVO',
  sm1: 'SUM',
  smp: 'SMP',
  'tk-sm-l': 'TK10L',
  'tk-sm-r': 'TK10A',
  sm2: 'GRI',
  '2017sm': 'MCD17',
  sm3: 'BUS',
  'sm3.5': 'SLG',
  sm4: 'CIN',
  sm5: 'UPR',
  sm6: 'FLI',
  sm7: 'CES',
  'sm7.5': 'DRM',
  '2018sm': 'MCD18',
  sm8: 'LOT',
  sm9: 'TEU',
  det1: 'DET',
  sm10: 'UNB',
  sm11: 'UNM',
  sm115: 'HIF',
  '2019sm': 'MCD19',
  sm12: 'CEC',
  swsh1: 'SSH',
  swsh2: 'RCL',
  swsh3: 'DAA',
  fut2020: 'FUT20',
  'swsh3.5': 'CPA',
  swsh4: 'VIV',
  '2021swsh': 'MCD21',
  'swsh4.5sv': 'SHF',
  'swsh4.5': 'SHF',
  swsh5: 'BST',
  swsh6: 'CRE',
  swsh7: 'EVS',
  cel25cc: 'CEL',
  cel25: 'CEL',
  swsh8: 'FST',
  swsh9: 'BRS',
  swsh9tg: 'BRS',
  swsh10: 'ASR',
  swsh10tg: 'ASR',
  'swsh10.5': 'PGO',
  '2022swsh': 'MCD22',
  swsh11: 'LOR',
  swsh11tg: 'LOR',
  swsh12: 'SIT',
  swsh12tg: 'SIT',
  'swsh12.5gg': 'CRZ',
  'swsh12.5': 'CRZ',
  sve: 'SVE',
  sv01: 'SVI',
  svp: 'SVP',
  sv02: 'PAL',
  '2023sv': 'MCD23',
  sv03: 'OBF',
  'sv03.5': 'MEW',
  mfb: 'MFB',
  sv04: 'PAR',
  'sv04.5': 'PAF',
  sv05: 'TEF',
  sv06: 'TWM',
  'sv06.5': 'SFA',
  sv07: 'SCR',
  sv08: 'SSP',
  '2024sv': 'MCD24',
  'sv08.5': 'PRE',
  sv09: 'JTG',
  sv10: 'DRI',
  'sv10.5w': 'WHT',
  'sv10.5b': 'BLK',
  mee: 'MEE',
  mep: 'MEP',
  me01: 'MEG',
  me02: 'PFL',
  'me02.5': 'ASC',
  me03: 'POR',
  me04: 'CRI',
  me05: 'PBL',
  '30th': '30C',
  '30th-c': '30C',
  me06: 'DLR',
};

/**
 * Códigos de 3+ letras impresos en el cuadradito negro de las cartas modernas (SWSH / SV / ME)
 * que pueden detectarse de forma inequívoca en el OCR sin colisionar con palabras comunes.
 */
const UNAMBIGUOUS_PRINTED_SET_CODES = new Set<string>([
  'SVI', 'PAL', 'OBF', 'MEW', 'PAR', 'PAF', 'TEF', 'TWM', 'SFA', 'SCR', 'SSP',
  'PRE', 'JTG', 'DRI', 'WHT', 'BLK', 'SVP', 'SVE',
  'MEG', 'PFL', 'ASC', 'POR', 'CRI', 'PBL', 'DLR', 'MEP', 'MEE', '30C',
  'SSH', 'RCL', 'DAA', 'CPA', 'VIV', 'SHF', 'BST', 'CRE', 'EVS', 'CEL', 'FST',
  'BRS', 'ASR', 'PGO', 'LOR', 'SIT', 'CRZ',
  'SUM', 'GRI', 'BUS', 'SLG', 'CIN', 'UPR', 'FLI', 'CES', 'DRM', 'LOT', 'TEU',
  'UNB', 'UNM', 'HIF', 'CEC',
  'FLF', 'FFI', 'PHF', 'PRC', 'ROS', 'AOR', 'BKT', 'BKP', 'FCO', 'STS', 'EVO',
  'BLW', 'NVI', 'NXD', 'DEX', 'DRX', 'BCR', 'PLS', 'PLF', 'PLB', 'LTR',
]);

/**
 * Devuelve el código corto oficial que va dentro del "cuadradito negro" de la colección.
 * Ej: "sv03.5" -> "MEW", "sv03" -> "OBF", "sv01" -> "SVI".
 */
export function getSetOfficialCode(setId: string): string {
  const clean = setId.trim().toLowerCase();
  const found = SET_OFFICIAL_CODES[clean] ?? SET_OFFICIAL_CODES[setId.trim()];
  if (found) return found;
  return setId.trim().toUpperCase().slice(0, 5);
}

/**
 * Devuelve los setId de TCGdex que corresponden a un código de colección (ej. "MEW" -> ["sv03.5"])
 * o al propio ID del set (ej. "sv03.5" -> ["sv03.5"]).
 */
export function findSetIdsByCode(codeOrId: string): string[] {
  const norm = codeOrId.trim().toUpperCase();
  if (!norm) return [];

  const matches: string[] = [];
  for (const [setId, officialCode] of Object.entries(SET_OFFICIAL_CODES)) {
    if (officialCode.toUpperCase() === norm || setId.toUpperCase() === norm) {
      matches.push(setId);
    }
  }
  return matches;
}

/**
 * Extrae el código del cuadradito negro de la colección desde texto OCR o búsqueda manual,
 * siempre que sea un código oficial de 3 letras (ej. "MEW", "OBF", "PAL", "SVI", "PRE", "TEF").
 * Evita confundirlo con el nombre del Pokémon "Mew" cuando "Mew" es la única palabra o el título.
 */
export function extractSetCodeFromText(rawText: string): string | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // Recorrer de abajo hacia arriba (el cuadradito negro va en el borde inferior junto a XXX/YYY)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const tokens = line
      .toUpperCase()
      .split(/[^A-Z0-9.]+/)
      .filter((t) => t.length >= 3 && t.length <= 6);

    for (const token of tokens) {
      // Si la línea es el título superior ("Mew ex" o "Mew"), no tratar "MEW" como código de set
      // a menos que en esa misma línea también haya una fracción XXX/YYY o código de idioma (ES/EN).
      if (
        token === 'MEW' &&
        i === 0 &&
        lines.length === 1 &&
        !/\d+\s*\/\s*\d+/.test(line)
      ) {
        continue;
      }

      if (UNAMBIGUOUS_PRINTED_SET_CODES.has(token)) {
        return token;
      }

      // También permitir IDs directos de TCGdex como "SV03.5", "SV01", "SWSH12"
      const byDirectId = Object.keys(SET_OFFICIAL_CODES).find(
        (id) => id.toUpperCase() === token
      );
      if (byDirectId) {
        return SET_OFFICIAL_CODES[byDirectId];
      }
    }
  }

  return null;
}

/**
 * Deriva el ID del set a partir del ID global de TCGdex (`${setId}-${localId}`).
 * Usa el localId conocido o, en su defecto, el último guion: hay sets con guiones
 * en su ID ("P-A", "tk-ex-latia"), así que cortar por el primero da un set incorrecto.
 */
export function inferSetIdFromCardId(
  cardId: string,
  localId?: string | null
): string {
  if (localId && cardId.endsWith(`-${localId}`)) {
    const setId = cardId.slice(0, cardId.length - localId.length - 1);
    if (setId) return setId;
  }
  const lastDash = cardId.lastIndexOf('-');
  return lastDash > 0 ? cardId.slice(0, lastDash) : cardId;
}

const LOCAL_ID_PARTS = /^(\D*)(\d*)(.*)$/;

/**
 * Orden natural de números de carta: "2" < "10" < "100", y prefijos ("TG01") agrupados.
 * SQLite ordena el TEXT de forma lexicográfica ("10" < "2"), por eso se ordena en JS.
 */
export function compareLocalIds(a: string, b: string): number {
  const [, preA = '', numA = '', restA = ''] = LOCAL_ID_PARTS.exec(a) ?? [];
  const [, preB = '', numB = '', restB = ''] = LOCAL_ID_PARTS.exec(b) ?? [];
  if (preA !== preB) return preA < preB ? -1 : 1;
  if (numA !== numB) {
    if (!numA) return -1;
    if (!numB) return 1;
    const diff = parseInt(numA, 10) - parseInt(numB, 10);
    if (diff !== 0) return diff;
  }
  if (restA === restB) return 0;
  return restA < restB ? -1 : 1;
}
