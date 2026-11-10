import React from 'react';

export interface ParsedSpringChip {
  readonly key: string;
  readonly labelKo: string;
  readonly colorHex: string;
}

/**
 * Parses common Pilates spring notations ('2R 1B', '1 Red + 1 Blue', '빨강 2 · 파랑 1', 'Bodyweight')
 * into tactile color-coded visual chips for 0.5-second instructor recognition.
 */
export function parseSpringVisualChips(rawSprings: string | undefined): ParsedSpringChip[] {
  const text = (rawSprings ?? '').trim();
  if (!text) return [];

  if (/^(?:bodyweight|none|맨몸|없음)$/i.test(text)) {
    return [{ key: 'bw', labelKo: '맨몸', colorHex: '#94A39B' }];
  }

  const chips: ParsedSpringChip[] = [];

  const redMatch =
    text.match(/(\d+)\s*(?:R\b|Red)/i) ?? text.match(/(?:빨강|레드)\s*(\d+)/);
  const blueMatch =
    text.match(/(\d+)\s*(?:B\b|Blue)/i) ?? text.match(/(?:파랑|블루)\s*(\d+)/);
  const yellowMatch =
    text.match(/(\d+)\s*(?:Y\b|Yellow)/i) ?? text.match(/(?:노랑|옐로우?)\s*(\d+)/);
  const greenMatch =
    text.match(/(\d+)\s*(?:G\b|Green)/i) ?? text.match(/(?:초록|그린)\s*(\d+)/);

  if (redMatch) {
    chips.push({ key: 'red', labelKo: `빨강×${redMatch[1]}`, colorHex: '#C84B31' });
  } else if (/\bred\b|빨강/i.test(text)) {
    chips.push({ key: 'red', labelKo: '빨강', colorHex: '#C84B31' });
  }

  if (blueMatch) {
    chips.push({ key: 'blue', labelKo: `파랑×${blueMatch[1]}`, colorHex: '#2E6F9E' });
  } else if (/\bblue\b|파랑/i.test(text)) {
    chips.push({ key: 'blue', labelKo: '파랑', colorHex: '#2E6F9E' });
  }

  if (yellowMatch) {
    chips.push({ key: 'yellow', labelKo: `노랑×${yellowMatch[1]}`, colorHex: '#D9A426' });
  } else if (/\byellow\b|노랑/i.test(text)) {
    chips.push({ key: 'yellow', labelKo: '노랑', colorHex: '#D9A426' });
  }

  if (greenMatch) {
    chips.push({ key: 'green', labelKo: `초록×${greenMatch[1]}`, colorHex: '#2F855A' });
  } else if (/\bgreen\b|초록/i.test(text)) {
    chips.push({ key: 'green', labelKo: '초록', colorHex: '#2F855A' });
  }

  if (chips.length === 0) {
    return [{ key: 'raw', labelKo: text.slice(0, 22), colorHex: '#4F7668' }];
  }

  return chips;
}

export interface SpringVisualPillsProps {
  readonly springs?: string;
}

export const SpringVisualPills: React.FC<SpringVisualPillsProps> = ({ springs }) => {
  const chips = parseSpringVisualChips(springs);
  if (chips.length === 0) return null;

  return (
    <span
      className="pf-spring-pills"
      data-testid="spring-visual-pills"
      title={`스프링 장력: ${springs ?? ''}`.trim()}
    >
      {chips.map((chip) => (
        <span key={chip.key} className="pf-spring-pill">
          <i
            className="pf-spring-pill__dot"
            style={{ backgroundColor: chip.colorHex }}
            aria-hidden="true"
          />
          {chip.labelKo}
        </span>
      ))}
    </span>
  );
};
