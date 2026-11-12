import type { HumanMovementDraft, ReusableBlock } from '../types/hierarchy';

interface ReusableBlockBackupBridgeHandlers {
  getReusableBlocks: () => ReusableBlock[];
  getHumanDrafts: () => HumanMovementDraft[];
  applyRestored: (input: {
    reusableBlocks?: readonly ReusableBlock[];
    humanMovementDrafts?: readonly HumanMovementDraft[];
  }) => void;
}

let registeredHandlers: ReusableBlockBackupBridgeHandlers | null = null;

export function registerReusableBlockBackupBridge(
  handlers: ReusableBlockBackupBridgeHandlers,
): void {
  registeredHandlers = handlers;
}

export function getReusableBlocksForBackup(): ReusableBlock[] {
  return registeredHandlers ? registeredHandlers.getReusableBlocks() : [];
}

export function getHumanDraftsForBackup(): HumanMovementDraft[] {
  return registeredHandlers ? registeredHandlers.getHumanDrafts() : [];
}

export function applyRestoredReusableBlocksAndDrafts(input: {
  reusableBlocks?: readonly ReusableBlock[];
  humanMovementDrafts?: readonly HumanMovementDraft[];
}): void {
  registeredHandlers?.applyRestored(input);
}
