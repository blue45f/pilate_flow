import React from 'react';
import { REFORMER_BRAND_META } from '../data/pilatesCatalog';
import type { ReformerBrand } from '../types/pilates';

interface SpringBadgeProps {
  springs: string;
  brand: ReformerBrand;
  compact?: boolean;
}

interface ParsedSpringToken {
  count: number;
  code: 'R' | 'B' | 'Y' | 'G' | 'W' | 'BW';
  label: string;
}

function parseSpringTokens(springs: string): ParsedSpringToken[] {
  if (!springs || springs === 'Bodyweight') {
    return [{ count: 1, code: 'BW', label: '맨몸/무스프링' }];
  }
  const tokens: ParsedSpringToken[] = [];
  const regex = /(\d)([RBYGW])/gi;
  let match = regex.exec(springs);
  while (match) {
    const count = Number.parseInt(match[1], 10) || 1;
    const rawCode = match[2].toUpperCase() as 'R' | 'B' | 'Y' | 'G' | 'W';
    const labelMap: Record<'R' | 'B' | 'Y' | 'G' | 'W', string> = {
      R: 'Red(강)',
      B: 'Blue(중)',
      Y: 'Yellow(약)',
      G: 'Green(특강)',
      W: 'White(미세)',
    };
    tokens.push({ count, code: rawCode, label: labelMap[rawCode] ?? rawCode });
    match = regex.exec(springs);
  }
  if (tokens.length === 0) {
    return [{ count: 1, code: 'BW', label: springs }];
  }
  return tokens;
}

export const SpringBadge: React.FC<SpringBadgeProps> = ({
  springs,
  brand,
  compact = false,
}) => {
  const tokens = parseSpringTokens(springs);
  const brandText = REFORMER_BRAND_META[brand].springMapping[springs] ?? springs;

  return (
    <span className="spring-badge-group" title={`${REFORMER_BRAND_META[brand].nameKo}: ${brandText}`}>
      <span className="spring-dots" aria-hidden="true">
        {tokens.map((tok, i) =>
          Array.from({ length: tok.count }).map((_, idx) => (
            <span
              key={`${tok.code}-${i}-${idx}`}
              className={`spring-dot spring-dot-${tok.code.toLowerCase()}`}
            >
              {tok.code === 'BW' ? 'M' : tok.code}
            </span>
          )),
        )}
      </span>
      <span className="spring-code-text">{springs}</span>
      {!compact && <span className="spring-brand-subtext">({brandText})</span>}
    </span>
  );
};
