import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const INLINE_TYPOGRAPHY_AUDITED_FILES = [
  'src/components/Apparatus3dRigPreviewCard.tsx',
  'src/components/ApparatusVisualGuideRibbon.tsx',
  'src/components/BreathingPelvicDiagramFigure.tsx',
  'src/components/CoreAbdominalDiagramFigure.tsx',
  'src/components/ExerciseThumbnailBadge.tsx',
  'src/components/ExtendedMotionVerificationPanel.tsx',
  'src/components/FootworkLowerDiagramFigure.tsx',
  'src/components/LateralAndApparatusDiagramFigure.tsx',
  'src/components/MotionReferencePlayer.tsx',
  'src/components/MovementVisualGuideCard.tsx',
  'src/components/SequenceStudioWorkbench.tsx',
  'src/components/SequenceWorkbench.tsx',
  'src/components/ShoulderSupportDiagramFigure.tsx',
  'src/components/StudioCarePlaybookPanel.tsx',
  'src/components/UpperBodyArmDiagramFigure.tsx',
] as const;

describe('Wave 20 Inline TSX Mobile Typography & Hangul Weight Gate', () => {
  const root = path.resolve(import.meta.dirname, '../..');

  it('prevents sub-12px/sub-0.75rem inline fontSize and >=700 inline fontWeight across all 15 audited TSX components', () => {
    for (const rel of INLINE_TYPOGRAPHY_AUDITED_FILES) {
      const src = readFileSync(path.join(root, rel), 'utf8');
      expect(src, `${rel} contains sub-0.75rem inline fontSize`).not.toMatch(
        /fontSize\s*:\s*['"]0\.(?:[0-6]\d|7[0-4])rem['"]/,
      );
      expect(src, `${rel} contains sub-12px inline fontSize`).not.toMatch(
        /fontSize\s*:\s*['"](?:[6-9]|10|11)px['"]/,
      );
      expect(src, `${rel} contains >=700 inline fontWeight`).not.toMatch(
        /fontWeight\s*:\s*(?:700|800|900|['"](?:700|800|900|bold)['"])/,
      );
    }
  });
});
