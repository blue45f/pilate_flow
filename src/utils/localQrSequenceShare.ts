import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { MovementSnapshot } from '../types/hierarchy';
import { isRestStep } from './sequenceEngine';

export const PF_SEQUENCE_SHARE_HASH_PREFIX = '#pf_share=';

/**
 * Pure local ISO/IEC 18004 QR Code SVG generator (Versions 1..22, Byte mode UTF-8, ECC Level L)
 * Zero external libraries, zero network calls, 100% deterministic offline execution.
 */
export interface LocalQrMatrixResult {
  readonly version: number;
  readonly size: number;
  readonly modules: ReadonlyArray<ReadonlyArray<boolean>>;
  readonly svgMarkup: string;
}

// Total data codewords & ECC codewords per block for QR Versions 1..22 at ECC Level L (ISO/IEC 18004 Table 9)
// Tuple: [totalDataCodewords, ecCodewordsPerBlock, group1Blocks, group1DataCw, group2Blocks, group2DataCw]
const QR_LEVEL_L_SPEC: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0, 0, 0, 0, 0, 0], // placeholder index 0
  [19, 7, 1, 19, 0, 0], // V1
  [34, 10, 1, 34, 0, 0], // V2
  [55, 15, 1, 55, 0, 0], // V3
  [80, 20, 1, 80, 0, 0], // V4
  [108, 26, 1, 108, 0, 0], // V5
  [136, 18, 2, 68, 0, 0], // V6
  [156, 20, 2, 78, 0, 0], // V7
  [194, 24, 2, 97, 0, 0], // V8
  [232, 30, 2, 116, 0, 0], // V9
  [274, 18, 2, 68, 2, 69], // V10
  [324, 20, 4, 81, 0, 0], // V11
  [370, 24, 2, 92, 2, 93], // V12
  [428, 26, 4, 107, 0, 0], // V13
  [461, 30, 3, 115, 1, 116], // V14
  [523, 22, 5, 87, 1, 88], // V15
  [589, 24, 5, 98, 1, 99], // V16
  [647, 28, 1, 107, 5, 108], // V17
  [721, 30, 5, 120, 1, 121], // V18
  [795, 28, 3, 113, 4, 114], // V19
  [861, 28, 3, 107, 5, 108], // V20
  [932, 28, 4, 116, 4, 117], // V21
  [1006, 28, 2, 111, 7, 112], // V22
];

const ALIGNMENT_CENTERS: ReadonlyArray<readonly number[]> = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

function buildReedSolomonDivisor(degree: number): Uint8Array {
  let result = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const root = GF_EXP[i]!;
    const next = new Uint8Array(result.length + 1);
    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= result[j]!;
      next[j + 1] ^= gfMul(result[j]!, root);
    }
    result = next;
  }
  return result.slice(1);
}

function computeReedSolomonRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const divisor = buildReedSolomonDivisor(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i]! ^ rem[0]!;
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j += 1) {
        rem[j] ^= gfMul(divisor[j]!, factor);
      }
    }
  }
  return rem;
}

function appendBits(out: number[], val: number, bitLen: number): void {
  for (let i = bitLen - 1; i >= 0; i -= 1) {
    out.push((val >>> i) & 1);
  }
}

function pickQrVersionForBytePayload(byteLength: number): number {
  for (let v = 1; v < QR_LEVEL_L_SPEC.length; v += 1) {
    const totalDataCw = QR_LEVEL_L_SPEC[v]![0];
    const countIndicatorBits = v <= 9 ? 8 : 16;
    const neededBits = 4 + countIndicatorBits + byteLength * 8;
    if (neededBits <= totalDataCw * 8) {
      return v;
    }
  }
  throw new Error(
    'QR 공유 데이터 길이가 로컬 코드 용량(약 1,000바이트)을 초과했습니다. 시퀀스 메모 제외 옵션을 켜 주세요.',
  );
}

function encodeCodewordsLevelL(utf8Bytes: Uint8Array, version: number): Uint8Array {
  const [totalDataCw, ecCwPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw] =
    QR_LEVEL_L_SPEC[version]!;
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode
  appendBits(bits, utf8Bytes.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < utf8Bytes.length; i += 1) {
    appendBits(bits, utf8Bytes[i]!, 8);
  }
  const capacityBits = totalDataCw * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCw = new Uint8Array(totalDataCw);
  for (let i = 0; i < bits.length / 8; i += 1) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) {
      byte = (byte << 1) | bits[i * 8 + b]!;
    }
    dataCw[i] = byte;
  }
  for (let i = bits.length / 8, padIdx = 0; i < totalDataCw; i += 1, padIdx += 1) {
    dataCw[i] = padIdx % 2 === 0 ? 0xec : 0x11;
  }

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < g1Blocks; b += 1) {
    const slice = dataCw.slice(offset, offset + g1DataCw);
    offset += g1DataCw;
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomonRemainder(slice, ecCwPerBlock));
  }
  for (let b = 0; b < g2Blocks; b += 1) {
    const slice = dataCw.slice(offset, offset + g2DataCw);
    offset += g2DataCw;
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomonRemainder(slice, ecCwPerBlock));
  }

  const maxDataBlockLen = Math.max(g1DataCw, g2DataCw);
  const interleaved: number[] = [];
  for (let i = 0; i < maxDataBlockLen; i += 1) {
    for (const blk of dataBlocks) {
      if (i < blk.length) interleaved.push(blk[i]!);
    }
  }
  for (let i = 0; i < ecCwPerBlock; i += 1) {
    for (const blk of ecBlocks) {
      interleaved.push(blk[i]!);
    }
  }
  return new Uint8Array(interleaved);
}

function drawFunctionModules(version: number): {
  modules: boolean[][];
  isFunction: boolean[][];
} {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFn = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y]![x] = dark;
    isFunction[y]![x] = true;
  };

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  };

  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  for (let i = 0; i < size; i += 1) {
    if (!isFunction[6]![i]) setFn(i, 6, i % 2 === 0);
    if (!isFunction[i]![6]) setFn(6, i, i % 2 === 0);
  }

  const alignCoords = ALIGNMENT_CENTERS[version] ?? [];
  for (let i = 0; i < alignCoords.length; i += 1) {
    for (let j = 0; j < alignCoords.length; j += 1) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cx = alignCoords[i]!;
      const cy = alignCoords[j]!;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserve format info bits
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setFn(size - 1 - i, 8, false);
  }
  for (let i = 0; i < 7; i += 1) {
    setFn(8, size - 1 - i, false);
  }
  setFn(8, size - 8, true); // Dark module

  // Version info for V7+
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const bit = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, bit);
      setFn(b, a, bit);
    }
  }

  return { modules, isFunction };
}

function writeFormatBits(modules: boolean[][], mask: number): void {
  const size = modules.length;
  // ECC Level L indicator = 01
  const data = (0b01 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;
  const getBit = (idx: number) => ((bits >>> idx) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) modules[i]![8] = getBit(i);
  modules[7]![8] = getBit(6);
  modules[8]![8] = getBit(7);
  modules[8]![7] = getBit(8);
  for (let i = 9; i < 15; i += 1) modules[8]![14 - i] = getBit(i);

  for (let i = 0; i < 8; i += 1) modules[8]![size - 1 - i] = getBit(i);
  for (let i = 8; i < 15; i += 1) modules[size - 15 + i]![8] = getBit(i);
  modules[size - 8]![8] = true;
}

function maskCondition(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function computePenaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive modules in row/col
  for (let y = 0; y < size; y += 1) {
    let runColor = modules[y]![0]!;
    let runLen = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y]![x] === runColor) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[y]![x]!;
        runLen = 1;
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = modules[0]![x]!;
    let runLen = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y]![x] === runColor) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[y]![x]!;
        runLen = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y]![x]!;
      if (c === modules[y]![x + 1] && c === modules[y + 1]![x] && c === modules[y + 1]![x + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 4: dark ratio balance
  let darkCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules[y]![x]) darkCount += 1;
    }
  }
  const total = size * size;
  const k = Math.ceil((Math.abs(darkCount * 20 - total * 10) + total - 1) / total) - 1;
  penalty += Math.max(0, k) * 10;

  return penalty;
}

export function generateLocalQrCodeSvg(
  text: string,
  options?: {
    readonly quietZone?: number;
    readonly darkFill?: string;
    readonly lightFill?: string;
  },
): LocalQrMatrixResult {
  const quietZone = options?.quietZone ?? 4;
  const darkFill = options?.darkFill ?? '#173d34';
  const lightFill = options?.lightFill ?? '#ffffff';
  const utf8Bytes = new TextEncoder().encode(text);
  const version = pickQrVersionForBytePayload(utf8Bytes.length);
  const codewords = encodeCodewordsLevelL(utf8Bytes, version);
  const base = drawFunctionModules(version);
  const size = base.modules.length;

  // Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < size; vert += 1) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (!base.isFunction[y]![x]) {
          let dark = false;
          if (bitIdx < codewords.length * 8) {
            const cw = codewords[bitIdx >>> 3]!;
            dark = ((cw >>> (7 - (bitIdx & 7))) & 1) !== 0;
          }
          base.modules[y]![x] = dark;
          bitIdx += 1;
        }
      }
    }
  }

  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestGrid: boolean[][] = base.modules;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = base.modules.map((row, y) =>
      row.map((cell, x) => (base.isFunction[y]![x] ? cell : cell !== maskCondition(mask, x, y))),
    );
    writeFormatBits(candidate, mask);
    const score = computePenaltyScore(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestMask = mask;
      bestGrid = candidate;
    }
  }

  void bestMask;
  const viewBoxSize = size + quietZone * 2;
  const pathParts: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (!bestGrid[y]![x]) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < size && bestGrid[y]![x + run]) {
        run += 1;
      }
      pathParts.push(`M${x + quietZone} ${y + quietZone}h${run}v1h-${run}z`);
      x += run;
    }
  }

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges" role="img" aria-label="수업 시퀀스 로컬 공유 QR 코드"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${lightFill}"/><path d="${pathParts.join('')}" fill="${darkFill}"/></svg>`;

  return {
    version,
    size,
    modules: bestGrid,
    svgMarkup,
  };
}

// ============================================================================
// Portable Zero-Server Sequence Share Codec (#pf_share=<base64url>)
// ============================================================================

export interface SharedSequenceStepCompact {
  /** 'r' for rest step, else exerciseId */
  readonly id: string;
  readonly b: ClassBlockCategory;
  readonly d: number;
  readonly l?: LayerMode;
  readonly sp?: string;
  readonly rp?: number;
  readonly st?: number;
  readonly sd?: StepSideMode;
  readonly nt?: string;
  /** Compact fallback metadata when an exercise is custom or crawled */
  readonly sn?: {
    readonly ko: string;
    readonly ap: ApparatusType;
    readonly lv: DifficultyLevel;
    readonly sp: string;
  };
}

export interface SharedSequencePayloadV1 {
  readonly v: 1;
  readonly t: string;
  readonly sub?: string;
  readonly ap: ApparatusType | 'mixed';
  readonly lv: DifficultyLevel;
  readonly min: number;
  readonly br: ReformerBrand;
  readonly notesIncluded: boolean;
  readonly st: readonly SharedSequenceStepCompact[];
}

export interface DecodedSharedSequence {
  readonly title: string;
  readonly subtitle: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly targetMinutes: number;
  readonly reformerBrand: ReformerBrand;
  readonly notesIncluded: boolean;
  readonly steps: SequenceStep[];
}

const VALID_EXERCISE_APPARATUS = new Set<string>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);
const VALID_APPARATUS = new Set<string>([...VALID_EXERCISE_APPARATUS, 'mixed']);
const VALID_LEVELS = new Set<string>(['1.0', '1.5', '2.0']);
const VALID_BRANDS = new Set<string>(['balanced-body', 'stott', 'intopilates', 'classical']);
const VALID_BLOCKS = new Set<string>([
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
]);
const VALID_LAYERS = new Set<string>(['easy', 'standard', 'hard']);
const VALID_SIDES = new Set<string>([
  'left',
  'right',
  'together',
  'left-then-right',
  'right-then-left',
]);

function cleanPlainString(raw: unknown, maxLen: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, maxLen);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(token: string): Uint8Array {
  const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

export interface EncodeSequenceShareInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly targetMinutes: number;
  readonly reformerBrand?: ReformerBrand;
  readonly steps: readonly SequenceStep[];
  readonly exercises?: readonly PilatesExercise[];
  /** Defaults to false so private instructor memos are never shared unless opted in */
  readonly includeInstructorNotes?: boolean;
}

export function encodeSequenceShareToken(input: EncodeSequenceShareInput): string {
  const includeNotes = Boolean(input.includeInstructorNotes);
  const exById = new Map((input.exercises ?? []).map((ex) => [ex.id, ex]));

  const compactSteps: SharedSequenceStepCompact[] = input.steps.slice(0, 24).map((step) => {
    if (isRestStep(step)) {
      return {
        id: 'r',
        b: step.blockCategory,
        d: Number(Math.max(0.5, Math.min(30, step.durationMin)).toFixed(2)),
        ...(includeNotes && step.instructorNote?.trim()
          ? { nt: cleanPlainString(step.instructorNote, 80) }
          : {}),
      };
    }

    const ex = exById.get(step.exerciseId);
    const needsSnapshot =
      Boolean(step.exerciseSnapshot) ||
      step.exerciseId.startsWith('ex-custom-') ||
      step.exerciseId.startsWith('crawled-');

    return {
      id: cleanPlainString(step.exerciseId, 64, 'ex-warmup-01'),
      b: step.blockCategory,
      d: Number(Math.max(0.5, Math.min(30, step.durationMin)).toFixed(2)),
      ...(step.selectedLayer && step.selectedLayer !== 'standard' ? { l: step.selectedLayer } : {}),
      ...(step.customSpringOverride?.trim()
        ? { sp: cleanPlainString(step.customSpringOverride, 24) }
        : {}),
      ...(step.repetitions !== undefined
        ? { rp: Math.max(1, Math.min(100, Math.round(step.repetitions))) }
        : {}),
      ...(step.sets !== undefined ? { st: Math.max(1, Math.min(20, Math.round(step.sets))) } : {}),
      ...(step.sideMode ? { sd: step.sideMode } : {}),
      ...(includeNotes && step.instructorNote?.trim()
        ? { nt: cleanPlainString(step.instructorNote, 80) }
        : {}),
      ...(needsSnapshot
        ? {
            sn: {
              ko: cleanPlainString(
                ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? '공유 동작',
                48,
                '공유 동작',
              ),
              ap: ex?.apparatus ?? step.exerciseSnapshot?.apparatus ?? 'reformer',
              lv: ex?.level ?? step.exerciseSnapshot?.level ?? '1.5',
              sp: cleanPlainString(
                ex?.springs ?? step.exerciseSnapshot?.springs ?? '1R 1B',
                20,
                '1R 1B',
              ),
            },
          }
        : {}),
    };
  });

  const payload: SharedSequencePayloadV1 = {
    v: 1,
    t: cleanPlainString(input.title, 64, '공유된 수업 시퀀스'),
    ...(input.subtitle?.trim() ? { sub: cleanPlainString(input.subtitle, 80) } : {}),
    ap: VALID_APPARATUS.has(input.apparatus) ? input.apparatus : 'reformer',
    lv: VALID_LEVELS.has(input.level) ? input.level : '1.5',
    min: Math.max(5, Math.min(120, Math.round(input.targetMinutes || 50))),
    br:
      input.reformerBrand && VALID_BRANDS.has(input.reformerBrand)
        ? input.reformerBrand
        : 'intopilates',
    notesIncluded: includeNotes,
    st: compactSteps,
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  return bytesToBase64Url(jsonBytes);
}

export function buildSequenceShareUrl(
  input: EncodeSequenceShareInput,
  baseOriginAndPath?: string,
): { readonly shareUrl: string; readonly hashFragment: string; readonly token: string } {
  const token = encodeSequenceShareToken(input);
  const hashFragment = `${PF_SEQUENCE_SHARE_HASH_PREFIX}${token}`;
  const base =
    baseOriginAndPath ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://flow-atelier.local/');
  return {
    shareUrl: `${base}${hashFragment}`,
    hashFragment,
    token,
  };
}

export function parseSequenceShareFromHashOrToken(rawInput: string): DecodedSharedSequence | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  let token = trimmed;
  const hashIdx = trimmed.indexOf(PF_SEQUENCE_SHARE_HASH_PREFIX);
  if (hashIdx >= 0) {
    token = trimmed.slice(hashIdx + PF_SEQUENCE_SHARE_HASH_PREFIX.length);
  } else if (trimmed.startsWith('pf_share=')) {
    token = trimmed.slice('pf_share='.length);
  }
  const ampIdx = token.indexOf('&');
  if (ampIdx >= 0) token = token.slice(0, ampIdx);
  if (!token || token.length > 8192) return null;

  try {
    const bytes = base64UrlToBytes(token);
    const jsonText = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonText) as Partial<SharedSequencePayloadV1>;
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1 || !Array.isArray(parsed.st)) {
      return null;
    }
    if (parsed.st.length === 0 || parsed.st.length > 30) {
      return null;
    }

    const title = cleanPlainString(parsed.t, 64, '공유받은 필라테스 시퀀스');
    const subtitle = cleanPlainString(parsed.sub, 80, '');
    const apparatus = (
      typeof parsed.ap === 'string' && VALID_APPARATUS.has(parsed.ap) ? parsed.ap : 'reformer'
    ) as ApparatusType | 'mixed';
    const level = (
      typeof parsed.lv === 'string' && VALID_LEVELS.has(parsed.lv) ? parsed.lv : '1.5'
    ) as DifficultyLevel;
    const targetMinutes =
      typeof parsed.min === 'number' && Number.isFinite(parsed.min)
        ? Math.max(5, Math.min(120, Math.round(parsed.min)))
        : 50;
    const reformerBrand = (
      typeof parsed.br === 'string' && VALID_BRANDS.has(parsed.br) ? parsed.br : 'intopilates'
    ) as ReformerBrand;

    const stamp = Date.now();
    const steps: SequenceStep[] = parsed.st.map((rawStep, idx) => {
      const item = rawStep as Partial<SharedSequenceStepCompact>;
      const blockCategory = (
        typeof item.b === 'string' && VALID_BLOCKS.has(item.b) ? item.b : 'core'
      ) as ClassBlockCategory;
      const durationMin =
        typeof item.d === 'number' && Number.isFinite(item.d)
          ? Number(Math.max(0.5, Math.min(30, item.d)).toFixed(2))
          : 4;
      const instructorNote =
        typeof item.nt === 'string' && item.nt.trim() ? cleanPlainString(item.nt, 80) : undefined;

      if (item.id === 'r') {
        return {
          kind: 'rest',
          stepId: `shared-rest-${stamp}-${idx + 1}`,
          order: idx + 1,
          blockCategory,
          exerciseId: '',
          durationMin,
          selectedLayer: 'standard',
          ...(instructorNote ? { instructorNote } : {}),
        };
      }

      const exerciseId = cleanPlainString(item.id, 64, 'ex-warmup-01');
      const selectedLayer = (
        typeof item.l === 'string' && VALID_LAYERS.has(item.l) ? item.l : 'standard'
      ) as LayerMode;
      const sideMode =
        typeof item.sd === 'string' && VALID_SIDES.has(item.sd)
          ? (item.sd as StepSideMode)
          : undefined;

      let exerciseSnapshot: MovementSnapshot | undefined;
      if (item.sn && typeof item.sn === 'object') {
        const snAp =
          typeof item.sn.ap === 'string' && VALID_EXERCISE_APPARATUS.has(item.sn.ap)
            ? (item.sn.ap as ApparatusType)
            : 'reformer';
        const snLv =
          typeof item.sn.lv === 'string' && VALID_LEVELS.has(item.sn.lv)
            ? (item.sn.lv as DifficultyLevel)
            : '1.5';
        exerciseSnapshot = {
          id: exerciseId,
          nameKo: cleanPlainString(item.sn.ko, 48, '공유 동작'),
          nameEn: 'Shared Studio Movement',
          apparatus: snAp,
          blockCategory,
          spinalPlanes: ['neutral'],
          bodyPosition: 'supine',
          level: snLv,
          defaultDurationMin: durationMin,
          targetMuscles: [],
          capturedAt: new Date(stamp).toISOString(),
          isUnilateral: Boolean(sideMode && sideMode !== 'together'),
          springs: cleanPlainString(item.sn.sp, 20, '1R 1B'),
          box: 'none',
          footbar: 'high',
          headrest: 'flat',
          props: ['none'],
          breathPattern: '자연스러운 흉식 호흡 유지',
          cues: ['정렬과 스프링 장력을 현장에서 먼저 확인하세요.'],
          precautions: '수행 전 대상자 컨디션과 기구 세팅을 강사가 직접 확인합니다.',
          layers: {
            easy: '가동범위 축소 진행',
            standard: '표준 가동범위 진행',
            hard: '코어 제어 심화 진행',
          },
        };
      }

      return {
        kind: 'exercise',
        stepId: `shared-step-${stamp}-${idx + 1}`,
        order: idx + 1,
        blockCategory,
        exerciseId,
        durationMin,
        selectedLayer,
        ...(typeof item.sp === 'string' && item.sp.trim()
          ? { customSpringOverride: cleanPlainString(item.sp, 24) }
          : {}),
        ...(typeof item.rp === 'number' && Number.isFinite(item.rp)
          ? { repetitions: Math.max(1, Math.min(100, Math.round(item.rp))) }
          : {}),
        ...(typeof item.st === 'number' && Number.isFinite(item.st)
          ? { sets: Math.max(1, Math.min(20, Math.round(item.st))) }
          : {}),
        ...(sideMode ? { sideMode } : {}),
        ...(instructorNote ? { instructorNote } : {}),
        ...(exerciseSnapshot ? { exerciseSnapshot } : {}),
      };
    });

    return {
      title,
      subtitle,
      apparatus,
      level,
      targetMinutes,
      reformerBrand,
      notesIncluded: Boolean(parsed.notesIncluded),
      steps,
    };
  } catch {
    return null;
  }
}
