import { REFORMER_BRAND_META } from '../data/pilatesCatalog';
import type { ApparatusType, ReformerBrand } from '../types/pilates';
import { convertSpringTensionAcrossBrands } from './springTensionMatrix';

export interface BrandSpringOption {
  readonly id: ReformerBrand;
  readonly shortLabelKo: string;
  readonly fullLabelKo: string;
  readonly systemNoteKo: string;
}

export const BRAND_SPRING_OPTIONS: ReadonlyArray<BrandSpringOption> = [
  {
    id: 'intopilates',
    shortLabelKo: '국내 5스프링',
    fullLabelKo: '인투필라테스 / 국내 모던 표준',
    systemNoteKo: '빨강(강) · 파랑(중) · 노랑(약) · 초록(최강)',
  },
  {
    id: 'balanced-body',
    shortLabelKo: 'Balanced Body',
    fullLabelKo: '밸런스드 바디 (Balanced Body)',
    systemNoteKo: 'Red(강) · Blue(중) · Yellow(약) · Green(특강)',
  },
  {
    id: 'stott',
    shortLabelKo: 'STOTT · 메리듀',
    fullLabelKo: '스탓 / 메리듀 (Merrithew)',
    systemNoteKo: 'Red(1.0) · Blue(0.5) · White(0.25)',
  },
  {
    id: 'classical',
    shortLabelKo: 'Gratz 클래식',
    fullLabelKo: '클래식 그라츠 (4동일 스프링)',
    systemNoteKo: '동일 장력 스프링 4개 (#1~#4)',
  },
] as const;

export const HONEST_BRAND_SPRING_CAUTION_KO =
  '제조사·기구 연식·스프링 마모도에 따라 실제 장력이 다르므로 수행 전 강사가 직접 확인하세요.';

export interface FormattedBrandSpringResult {
  readonly rawSprings: string;
  readonly normalizedCode: string;
  readonly brand: ReformerBrand;
  readonly brandShortLabelKo: string;
  readonly equivalentLabelKo: string;
  readonly isNonSpringApparatus: boolean;
}

export function normalizeCanonicalSpringKey(rawSprings?: string): string {
  const trimmed = (rawSprings ?? '').trim();
  if (!trimmed) return '';
  if (/bodyweight|무스프링|스프링\s*없음|스프링\s*사용\s*없음|래더\s*고정/i.test(trimmed)) {
    return 'Bodyweight';
  }
  const compact = trimmed
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*\+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokenMatches = [...compact.matchAll(/(\d+(?:\.\d+)?)\s*([RBYGW])/gi)];
  if (tokenMatches.length > 0 && !/\bor\b|또는/i.test(compact)) {
    return tokenMatches
      .map((m) => `${m[1]}${m[2]!.toUpperCase()}`)
      .join(' ');
  }
  return compact;
}

/**
 * Formats a spring setup string for the selected studio apparatus brand.
 * Never claims mechanical Newton equivalence; always paired with instructor verification guidance.
 */
export function formatBrandSpringEquivalent(
  rawSprings: string | undefined,
  brand: ReformerBrand,
  apparatus?: ApparatusType | 'mixed',
): FormattedBrandSpringResult {
  const raw = (rawSprings ?? '').trim();
  const brandMeta =
    BRAND_SPRING_OPTIONS.find((item) => item.id === brand) ?? BRAND_SPRING_OPTIONS[0]!;

  if (!raw || apparatus === 'mat' || apparatus === 'barrel') {
    return {
      rawSprings: raw || '맨몸',
      normalizedCode: 'Bodyweight',
      brand,
      brandShortLabelKo: brandMeta.shortLabelKo,
      equivalentLabelKo: apparatus === 'barrel' ? '래더·바렐 고정 (무스프링)' : '무스프링 · 맨몸 저항',
      isNonSpringApparatus: true,
    };
  }

  const normalizedCode = normalizeCanonicalSpringKey(raw);
  if (normalizedCode === 'Bodyweight') {
    return {
      rawSprings: raw,
      normalizedCode,
      brand,
      brandShortLabelKo: brandMeta.shortLabelKo,
      equivalentLabelKo: REFORMER_BRAND_META[brand].springMapping.Bodyweight ?? '무스프링',
      isNonSpringApparatus: true,
    };
  }

  // Handle choice expressions like "1R or 1B" or "1R 1B or 1R"
  if (/\bor\b|또는/i.test(raw)) {
    const parts = raw
      .split(/\bor\b|또는/i)
      .map((part) => formatBrandSpringEquivalent(part.trim(), brand, apparatus).equivalentLabelKo);
    return {
      rawSprings: raw,
      normalizedCode,
      brand,
      brandShortLabelKo: brandMeta.shortLabelKo,
      equivalentLabelKo: parts.join(' 또는 '),
      isNonSpringApparatus: false,
    };
  }

  const exactCatalogHit =
    REFORMER_BRAND_META[brand].springMapping[raw] ??
    REFORMER_BRAND_META[brand].springMapping[normalizedCode];
  if (exactCatalogHit) {
    return {
      rawSprings: raw,
      normalizedCode,
      brand,
      brandShortLabelKo: brandMeta.shortLabelKo,
      equivalentLabelKo: exactCatalogHit,
      isNonSpringApparatus: false,
    };
  }

  // Parse R/B/Y/G/W token counts directly before falling back to text heuristics
  const tokenMatches = [...normalizedCode.matchAll(/(\d+(?:\.\d+)?)\s*([RBYGW])/gi)];
  if (tokenMatches.length > 0) {
    let units = 0;
    const pieces: Array<{ count: number; code: string }> = [];
    for (const match of tokenMatches) {
      const count = Number.parseFloat(match[1] ?? '1') || 1;
      const code = (match[2] ?? 'R').toUpperCase();
      pieces.push({ count, code });
      if (code === 'G') units += count * 1.25;
      else if (code === 'R') units += count * 1.0;
      else if (code === 'B') units += count * 0.5;
      else if (code === 'Y' || code === 'W') units += count * 0.25;
    }

    let equivalentLabelKo: string;
    if (brand === 'classical') {
      const springsCount = Math.max(1, Math.min(4, Math.round(units * 1.35)));
      equivalentLabelKo = `${springsCount} Spring${springsCount > 1 ? 's' : ''} (약 ${units.toFixed(2).replace(/\.00$/, '')}R 상당)`;
    } else if (brand === 'stott') {
      const stottParts = pieces.map(({ count, code }) => {
        if (code === 'G' || code === 'R') return `${count} Red`;
        if (code === 'B') return `${count} Blue`;
        return `${count} White`;
      });
      equivalentLabelKo = `${stottParts.join(' + ')} (${units.toFixed(2).replace(/\.00$/, '')} Springs)`;
    } else if (brand === 'balanced-body') {
      const bbParts = pieces.map(({ count, code }) => {
        const name =
          code === 'G' ? 'Green' : code === 'R' ? 'Red' : code === 'B' ? 'Blue' : 'Yellow';
        return `${count} ${name}`;
      });
      equivalentLabelKo = bbParts.join(', ');
    } else {
      const krParts = pieces.map(({ count, code }) => {
        const name =
          code === 'G' ? '초록' : code === 'R' ? '빨강' : code === 'B' ? '파랑' : '노랑';
        return `${name} ${count}`;
      });
      equivalentLabelKo = krParts.join(' + ');
    }

    return {
      rawSprings: raw,
      normalizedCode,
      brand,
      brandShortLabelKo: brandMeta.shortLabelKo,
      equivalentLabelKo,
      isNonSpringApparatus: false,
    };
  }

  const fallbackMatrix = convertSpringTensionAcrossBrands(raw);
  return {
    rawSprings: raw,
    normalizedCode,
    brand,
    brandShortLabelKo: brandMeta.shortLabelKo,
    equivalentLabelKo: fallbackMatrix.equivalentsByBrand[brand],
    isNonSpringApparatus: false,
  };
}
