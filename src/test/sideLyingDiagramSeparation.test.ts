import { describe, expect, it } from 'vitest';
import { getMovementVisualAsset, calculatePhaseJointDelta } from '../data/movementVisualRigCatalog';

const clam = getMovementVisualAsset('original-mat-clam')!;
const book = getMovementVisualAsset('original-mat-open-book')!;

describe('source-text-constrained separation of clam and open-book drafts', () => {
  it('keeps clam arms and trunk still while the top knee opens and returns', () => {
    expect(calculatePhaseJointDelta(clam).movedJoints.map((item) => item.joint)).toEqual(['knee']);
    expect(clam.phases.middle.joints.ankle).toEqual(clam.phases.start.joints.ankle);
    expect(clam.phases.middle.joints.pelvis).toEqual(clam.phases.start.joints.pelvis);
    expect(clam.phases.end.joints).toEqual(clam.phases.start.joints);
    expect(clam.phases.middle.summaryKo).toContain('오픈 북의 팔 회전은 포함하지 않습니다');
  });
  it('keeps open-book knees and pelvis still instead of opening them like a clam', () => {
    for (const joint of ['hip', 'knee', 'ankle', 'pelvis', 'farKnee', 'farAnkle', 'farShoulder', 'farElbow', 'farWrist'] as const) {
      expect(book.phases.middle.joints[joint]).toEqual(book.phases.start.joints[joint]);
    }
    expect(book.phases.middle.joints.hand).not.toEqual(book.phases.start.joints.hand);
    expect(book.phases.end.joints).toEqual(book.phases.start.joints);
    expect(book.phases.middle.summaryKo).toContain('클램의 무릎 벌림은 포함하지 않습니다');
  });
  it('keeps distinct geometry without elevating clinical or anatomical review', () => {
    expect(clam.archetypeId).not.toEqual(book.archetypeId);
    expect(clam.phases.middle.joints).not.toEqual(book.phases.middle.joints);
    for (const asset of [clam, book]) expect(asset.anatomicalAccuracyAssumed).toBe(false);
    expect(getMovementVisualAsset('original-mat-side-leg-lift')!.archetypeId).toBe('side-lying-leg-press-sweep');
  });
});
