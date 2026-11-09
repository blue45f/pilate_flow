import type { ReformerBrand } from '../types/pilates';

export type SpringResistanceTier = 'light' | 'medium' | 'heavy' | 'extra-heavy';

export interface BrandSpringEquivalence {
  rawInput: string;
  normalizedLoadUnits: number;
  tier: SpringResistanceTier;
  tierLabelKo: string;
  equivalentsByBrand: Record<ReformerBrand, string>;
}

/**
 * Parses a Korean or English spring string into normalized load units
 * (where 1.0 = 1 Heavy/Red spring) and maps across Reformer brands.
 */
export function convertSpringTensionAcrossBrands(rawSprings?: string): BrandSpringEquivalence {
  const raw = (rawSprings ?? '').trim();
  const lower = raw.toLowerCase();

  let units = 0;

  const redMatch = raw.match(/(?:빨강|적색|red|중강|강)\s*(\d+)?/i);
  const blueMatch = raw.match(/(?:파랑|청색|blue|중)\s*(\d+)?/i);
  const yellowMatch = raw.match(/(?:노랑|황색|yellow|약|경)\s*(\d+)?/i);
  const greenMatch = raw.match(/(?:초록|녹색|green|최강)\s*(\d+)?/i);

  if (redMatch) units += Number(redMatch[1] ?? 1) * 1.0;
  if (blueMatch) units += Number(blueMatch[1] ?? 1) * 0.5;
  if (yellowMatch) units += Number(yellowMatch[1] ?? 1) * 0.25;
  if (greenMatch) units += Number(greenMatch[1] ?? 1) * 1.25;

  if (units === 0) {
    if (lower.includes('footwork') || lower.includes('풋워크')) units = 2.5;
    else if (lower.includes('light') || lower.includes('약')) units = 0.5;
    else units = 1.5;
  }

  const normalizedLoadUnits = Number(units.toFixed(2));
  const tier: SpringResistanceTier =
    normalizedLoadUnits <= 0.75
      ? 'light'
      : normalizedLoadUnits <= 1.75
        ? 'medium'
        : normalizedLoadUnits <= 2.75
          ? 'heavy'
          : 'extra-heavy';

  const tierLabelKo =
    tier === 'light'
      ? '경량(코어 제어·상체)'
      : tier === 'medium'
        ? '중량(표준 밸런스)'
        : tier === 'heavy'
          ? '고중량(하지·풋워크)'
          : '초고중량(고강도 지지)';

  const equivalentsByBrand: Record<ReformerBrand, string> =
    tier === 'light'
      ? {
          balanced: '파랑 1 (또는 노랑 2)',
          stott: '파랑 1 (0.5 Red)',
          classical: '약 스프링 1 (1 Light)',
          custom: raw || '경량 스프링 1',
        }
      : tier === 'medium'
        ? {
            balanced: '빨강 1 · 파랑 1',
            stott: '빨강 1 · 파랑 1 (1.5 Red)',
            classical: '표준 스프링 2 (2 Springs)',
            custom: raw || '표준 스프링 1.5',
          }
        : tier === 'heavy'
          ? {
              balanced: '빨강 2 · 파랑 1',
              stott: '빨강 2 · 파랑 1 (2.5 Red)',
              classical: '표준 스프링 3 (3 Springs)',
              custom: raw || '고중량 스프링 2.5',
            }
          : {
              balanced: '빨강 3 · 파랑 1',
              stott: '빨강 3 · 파랑 1 (3.5 Red)',
              classical: '전체 스프링 4 (4 Springs)',
              custom: raw || '최대 스프링 3.5',
            };

  return {
    rawInput: raw || '기본 세팅',
    normalizedLoadUnits,
    tier,
    tierLabelKo,
    equivalentsByBrand,
  };
}
