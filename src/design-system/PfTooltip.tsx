import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export interface PfTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
}

export const PfTooltip: React.FC<PfTooltipProps> = ({
  content,
  children,
  side = 'top',
  sideOffset = 6,
  delayDuration = 180,
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            className="pf-tooltip-content"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
