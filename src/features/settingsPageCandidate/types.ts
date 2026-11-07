export type SettingsGroupId = 'account' | 'voice' | 'install' | 'data';

export type SettingsVoiceSpeed = 0.85 | 1 | 1.15;

export type SettingsVoicePreferenceKey = 'movement' | 'breath' | 'time';

export const SETTINGS_PAGE_SAFETY_CONTRACT = Object.freeze({
  featureId: 'parallel-page-settings-20261107',
  ownsLocalSettingsUiOnly: true,
  modifiesSharedRoutesOrStoreOrTheme: false,
  canMutateAuthOrSecurityConfig: false,
  canDeleteUserData: false,
  hasDestructiveDeleteAction: false,
  usesMockAdaptersInTests: true,
  groups: Object.freeze(['account', 'voice', 'install', 'data'] as const),
  minTouchTargetPx: 44,
  minTouchGapPx: 8,
  supportedViewports: Object.freeze([320, 390, 768, 1440] as const),
});

export interface SettingsAccountUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
}

export interface SettingsAccountError {
  readonly code: string;
  readonly message: string;
}

export interface SettingsAccountInput {
  readonly phase: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  readonly operation: 'signing-in' | 'signing-out' | null;
  readonly user: SettingsAccountUser | null;
  readonly error: SettingsAccountError | null;
  readonly notice: string;
  readonly operatingOrigin?: string;
}

export interface SettingsVoicePreferences {
  readonly movement: boolean;
  readonly breath: boolean;
  readonly time: boolean;
}

export interface SettingsVoiceInput {
  readonly capabilityStatus: 'available' | 'no-korean-voice' | 'unsupported';
  readonly voiceName: string | null;
  readonly voiceLang: string | null;
  readonly localService: boolean;
  readonly enabled: boolean;
  readonly speed: SettingsVoiceSpeed;
  readonly preferences: SettingsVoicePreferences;
  readonly error: string;
  readonly statusAnnouncementKo?: string;
}

export interface SettingsInstallInput {
  readonly standalone: boolean;
  readonly installed: boolean;
  readonly platform: 'ios-safari' | 'ios-other' | 'browser';
  readonly canInstall: boolean;
  readonly installStatus: 'idle' | 'prompting' | 'accepted' | 'dismissed' | 'error';
  readonly offlineStatus: 'unavailable' | 'preparing' | 'ready' | 'update-ready' | 'error';
}

export interface SettingsRecoveryPreviewSummary {
  readonly sourceLabel: string;
  readonly bytes: number;
  readonly newItems: number;
  readonly conflicts: number;
  readonly restoredExamples: number;
  readonly changed: boolean;
  readonly stale: boolean;
  readonly diskBlocked: boolean;
  readonly errorMessage?: string;
}

export interface SettingsRollbackSummary {
  readonly addedCount: number;
  readonly createdAtLabel?: string;
}

export interface SettingsDataInput {
  readonly savedSequenceCount: number;
  readonly exerciseCount: number;
  readonly historyLogCount: number;
  readonly ownedEquipmentIds: readonly string[];
  readonly ownedPropIds: readonly string[];
  readonly persistenceError: string | null;
  readonly backupMessage: string;
  readonly recoveryStage:
    | 'idle'
    | 'reading'
    | 'preview-ready'
    | 'preview-error'
    | 'rollback-available';
  readonly recoveryPreview: SettingsRecoveryPreviewSummary | null;
  readonly rollbackPoint: SettingsRollbackSummary | null;
}

export interface SettingsPageSnapshotInput {
  readonly account?: Partial<SettingsAccountInput> | null;
  readonly voice?: Partial<SettingsVoiceInput> | null;
  readonly install?: Partial<SettingsInstallInput> | null;
  readonly data?: Partial<SettingsDataInput> | null;
  readonly preferReducedMotion?: boolean;
}

export interface SettingsGroupSummary {
  readonly id: SettingsGroupId;
  readonly order: 1 | 2 | 3 | 4;
  readonly eyebrow: string;
  readonly titleKo: string;
  readonly shortDescriptionKo: string;
  readonly currentValueBadgeKo: string;
  readonly secondaryValueKo: string;
  readonly safetyNoteKo: string;
}

export interface SettingsAccountViewModel {
  readonly phase: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  readonly operation: 'signing-in' | 'signing-out' | null;
  readonly busy: boolean;
  readonly unsupportedHost: boolean;
  readonly user: SettingsAccountUser | null;
  readonly avatarInitial: string;
  readonly currentStatusLabelKo: string;
  readonly storageBoundaryLabelKo: string;
  readonly securityPolicyLabelKo: string;
  readonly errorMessageKo: string | null;
  readonly noticeKo: string | null;
  readonly operatingOrigin: string;
}

export interface SettingsVoiceViewModel {
  readonly capabilityStatus: 'available' | 'no-korean-voice' | 'unsupported';
  readonly voiceName: string | null;
  readonly voiceLang: string | null;
  readonly localService: boolean;
  readonly canToggleEnabled: boolean;
  readonly enabled: boolean;
  readonly speed: SettingsVoiceSpeed;
  readonly preferences: SettingsVoicePreferences;
  readonly enabledPreferenceCount: number;
  readonly currentCapabilityLabelKo: string;
  readonly currentSpeedLabelKo: string;
  readonly currentPreferencesLabelKo: string;
  readonly privacyBoundaryLabelKo: string;
  readonly errorMessageKo: string | null;
  readonly statusAnnouncementKo: string;
}

export interface SettingsInstallViewModel {
  readonly standalone: boolean;
  readonly installed: boolean;
  readonly platform: 'ios-safari' | 'ios-other' | 'browser';
  readonly canInstall: boolean;
  readonly showInstallButton: boolean;
  readonly effectiveInstallStatus: 'idle' | 'prompting' | 'accepted' | 'dismissed' | 'error';
  readonly offlineStatus: 'unavailable' | 'preparing' | 'ready' | 'update-ready' | 'error';
  readonly currentRunModeLabelKo: string;
  readonly currentOfflineLabelKo: string;
  readonly liveStatusAnnouncementKo: string | null;
  readonly offlineDetailSummaryKo: string;
  readonly manualGuideOpenByDefault: boolean;
}

export interface SettingsInventoryOptionView {
  readonly id: string;
  readonly labelKo: string;
  readonly selected: boolean;
}

export interface SettingsDataViewModel {
  readonly savedSequenceCount: number;
  readonly exerciseCount: number;
  readonly historyLogCount: number;
  readonly equipmentOptions: readonly SettingsInventoryOptionView[];
  readonly propOptions: readonly SettingsInventoryOptionView[];
  readonly selectedEquipmentCount: number;
  readonly selectedPropCount: number;
  readonly currentRecordsSummaryKo: string;
  readonly currentInventorySummaryKo: string;
  readonly currentRecoveryLabelKo: string;
  readonly nonDestructivePolicyLabelKo: string;
  readonly persistenceErrorKo: string | null;
  readonly backupMessageKo: string | null;
  readonly recoveryStage:
    | 'idle'
    | 'reading'
    | 'preview-ready'
    | 'preview-error'
    | 'rollback-available';
  readonly recoveryPreview: SettingsRecoveryPreviewSummary | null;
  readonly rollbackPoint: SettingsRollbackSummary | null;
}

export interface SettingsPageSafetyStatus {
  readonly canMutateAuthOrSecurityConfig: false;
  readonly canDeleteUserData: false;
  readonly hasDestructiveDeleteAction: false;
  readonly redactionApplied: boolean;
}

export interface SettingsPageViewModel {
  readonly groups: readonly SettingsGroupSummary[];
  readonly account: SettingsAccountViewModel;
  readonly voice: SettingsVoiceViewModel;
  readonly install: SettingsInstallViewModel;
  readonly data: SettingsDataViewModel;
  readonly preferReducedMotion: boolean;
  readonly safety: SettingsPageSafetyStatus;
}

export type SettingsRecordedAction =
  | { readonly type: 'account:sign-in' }
  | { readonly type: 'account:switch' }
  | { readonly type: 'account:sign-out' }
  | { readonly type: 'account:recheck' }
  | { readonly type: 'voice:toggle-enabled'; readonly nextEnabled: boolean }
  | { readonly type: 'voice:change-speed'; readonly nextSpeed: SettingsVoiceSpeed }
  | {
      readonly type: 'voice:toggle-preference';
      readonly key: SettingsVoicePreferenceKey;
      readonly nextChecked: boolean;
    }
  | { readonly type: 'voice:recheck-capability' }
  | { readonly type: 'voice:preview-sample' }
  | { readonly type: 'install:request-pwa-install' }
  | { readonly type: 'data:export-backup' }
  | {
      readonly type: 'data:select-backup-file';
      readonly fileName: string;
      readonly byteSize: number;
    }
  | { readonly type: 'data:apply-restore' }
  | { readonly type: 'data:cancel-restore' }
  | { readonly type: 'data:rollback-restore' }
  | { readonly type: 'data:dismiss-rollback' }
  | { readonly type: 'data:toggle-equipment'; readonly equipmentId: string }
  | { readonly type: 'data:toggle-prop'; readonly propId: string };

export interface SettingsPageActionPort {
  readonly onRequestGoogleSignIn?: () => void;
  readonly onRequestAccountSwitch?: () => void;
  readonly onRequestSignOut?: () => void;
  readonly onRequestAuthRecheck?: () => void;
  readonly onToggleVoiceEnabled?: (nextEnabled: boolean) => void;
  readonly onChangeVoiceSpeed?: (nextSpeed: SettingsVoiceSpeed) => void;
  readonly onToggleVoicePreference?: (
    key: SettingsVoicePreferenceKey,
    nextChecked: boolean,
  ) => void;
  readonly onRecheckVoiceCapability?: () => void;
  readonly onPreviewVoiceSample?: () => void;
  readonly onRequestPwaInstall?: () => void;
  readonly onExportBackupJson?: () => void;
  readonly onSelectBackupFile?: (fileName: string, byteSize: number) => void;
  readonly onApplyBackupRestore?: () => void;
  readonly onCancelBackupRestore?: () => void;
  readonly onRollbackBackupRestore?: () => void;
  readonly onDismissRollbackBanner?: () => void;
  readonly onToggleOwnedEquipment?: (equipmentId: string) => void;
  readonly onToggleOwnedProp?: (propId: string) => void;
}

export interface MockSettingsActionRecorder {
  readonly calls: readonly SettingsRecordedAction[];
  readonly port: SettingsPageActionPort;
  readonly clear: () => void;
}

export type SettingsFixturePresetId =
  | 'default-local-studio'
  | 'signed-in-active-instructor'
  | 'ios-safari-no-korean-voice'
  | 'unsupported-host-update-ready'
  | 'storage-warning-stale-preview'
  | 'adversarial-untrusted-input';

export interface SettingsFixturePreset {
  readonly id: SettingsFixturePresetId;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly snapshot: SettingsPageSnapshotInput;
}
