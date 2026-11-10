import React from 'react';
import { parseSpringVisualChips } from '../utils/springVisualParser';

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
