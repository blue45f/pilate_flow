export interface ParsedSpringChip {
  readonly key: string;
  readonly labelKo: string;
  readonly colorHex: string;
}

const ATTACHMENT_CONTEXT_PATTERN =
  /상단|하단|레그|암\s*스프링|탑|타워|롤다운|푸쉬\s*스루|푸시스루|페달|leg\s*spring|arm\s*spring|roll[\s-]*down|push[\s-]*through|pedal/i;

function matchColorQuantity(
  source: string,
  codePattern: string,
  koPattern: string,
): { matched: boolean; qty: number | null } {
  const enRegex = new RegExp(`(?:^|[^\\d.])(\\d+(?:\\.\\d+)?)\\s*(?:${codePattern})\\b`, 'i');
  const koRegex = new RegExp(`(?:${koPattern})\\s*(\\d+(?:\\.\\d+)?)`, 'i');
  const numMatch = source.match(enRegex) ?? source.match(koRegex);
  if (numMatch?.[1] !== undefined) {
    const parsed = Number(numMatch[1]);
    return { matched: true, qty: Number.isFinite(parsed) ? parsed : null };
  }
  const wordRegex = new RegExp(`\\b(?:${codePattern})\\b|(?:${koPattern})`, 'i');
  if (wordRegex.test(source)) {
    return { matched: true, qty: null };
  }
  return { matched: false, qty: null };
}

/**
 * Parses common Pilates spring notations ('2R 1B', '1 Red + 1 Blue', '0.5 Blue', '1R or 1B', 'Bodyweight')
 * into tactile color-coded visual chips for 0.5-second instructor recognition.
 */
export function parseSpringVisualChips(rawSprings: string | undefined): ParsedSpringChip[] {
  const text = (rawSprings ?? '').trim();
  if (!text) return [];

  if (
    /^(?:bodyweight|none|0(?:\.0+)?\s*springs?|맨몸|없음|스프링\s*(?:사용\s*)?없음(?:\s*\([^)]*\))?)$/i.test(
      text,
    )
  ) {
    return [{ key: 'bw', labelKo: '맨몸', colorHex: '#94A39B' }];
  }

  const parenMatches = [...text.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]?.trim() ?? '');
  const strippedParens = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  // Preserve choice/alternative spring notations ('1R or 1B', '1R / 1B', '빨강 1 또는 파랑 1')
  // so instructors never mistake an either/or option for simultaneous additive tension.
  if (
    /\bor\b|또는/i.test(strippedParens) ||
    /(?:\d|\b(?:red|blue|yellow|green|white|r|b|y|g|w)\b|빨강|파랑|노랑|초록|하양|화이트)\s*\/\s*(?:\d|\b(?:red|blue|yellow|green|white|bodyweight|none|r|b|y|g|w)\b|빨강|파랑|노랑|초록|하양|화이트|맨몸)/i.test(
      strippedParens,
    )
  ) {
    const compactLabel = text.length <= 26 ? text : `${text.slice(0, 25)}…`;
    return [{ key: 'choice', labelKo: compactLabel, colorHex: '#4F7668' }];
  }

  const extractColorChips = (target: string): { chips: ParsedSpringChip[]; sawZeroOnly: boolean } => {
    const found: ParsedSpringChip[] = [];
    let sawZero = false;

    const specs: ReadonlyArray<{
      key: string;
      nameKo: string;
      colorHex: string;
      codePattern: string;
      koPattern: string;
    }> = [
      { key: 'red', nameKo: '빨강', colorHex: '#C84B31', codePattern: 'R|Red', koPattern: '빨강|레드' },
      { key: 'blue', nameKo: '파랑', colorHex: '#2E6F9E', codePattern: 'B|Blue', koPattern: '파랑|블루' },
      {
        key: 'yellow',
        nameKo: '노랑',
        colorHex: '#D9A426',
        codePattern: 'Y|Yellow',
        koPattern: '노랑|옐로우?',
      },
      {
        key: 'green',
        nameKo: '초록',
        colorHex: '#2F855A',
        codePattern: 'G|Green',
        koPattern: '초록|그린',
      },
      {
        key: 'white',
        nameKo: '하양',
        colorHex: '#CBD5E1',
        codePattern: 'W|White',
        koPattern: '하양|화이트|백색',
      },
    ];

    for (const spec of specs) {
      const res = matchColorQuantity(target, spec.codePattern, spec.koPattern);
      if (!res.matched) continue;
      if (res.qty !== null) {
        if (res.qty <= 0) {
          sawZero = true;
          continue;
        }
        found.push({
          key: spec.key,
          labelKo: `${spec.nameKo}×${res.qty}`,
          colorHex: spec.colorHex,
        });
      } else {
        found.push({
          key: spec.key,
          labelKo: spec.nameKo,
          colorHex: spec.colorHex,
        });
      }
    }

    return { chips: found, sawZeroOnly: found.length === 0 && sawZero };
  };

  let { chips, sawZeroOnly } = extractColorChips(strippedParens);
  let usedParenForSpring = false;
  if (chips.length === 0 && !sawZeroOnly && parenMatches.length > 0) {
    const fromFull = extractColorChips(text);
    chips = fromFull.chips;
    sawZeroOnly = fromFull.sawZeroOnly;
    usedParenForSpring = chips.length > 0;
  }

  if (sawZeroOnly) {
    return [{ key: 'bw', labelKo: '맨몸', colorHex: '#94A39B' }];
  }

  if (chips.length === 0) {
    return [{ key: 'raw', labelKo: text.slice(0, 22), colorHex: '#4F7668' }];
  }

  if (!usedParenForSpring) {
    const attachmentNote = parenMatches.find(
      (note) => note.length > 0 && note.length <= 16 && ATTACHMENT_CONTEXT_PATTERN.test(note),
    );
    if (attachmentNote) {
      chips.push({ key: 'context', labelKo: attachmentNote, colorHex: '#64748B' });
    }
  }

  return chips;
}
