import type {
  SettingsFixturePreset,
  SettingsFixturePresetId,
  SettingsPageSnapshotInput,
} from './types';

export const SETTINGS_PAGE_FIXTURE_PRESETS: readonly SettingsFixturePreset[] = Object.freeze([
  {
    id: 'default-local-studio',
    labelKo: '기본 로컬 스튜디오 (비로그인 · 설치 가능)',
    descriptionKo:
      '로그아웃 상태에서 로컬 브라우저에 수업 시퀀스와 기록을 보관하고, 한국어 음성과 PWA 설치 버튼이 활성화된 기본 시나리오입니다.',
    snapshot: {
      account: {
        phase: 'signed-out',
        operation: null,
        user: null,
        error: null,
        notice: '',
      },
      voice: {
        capabilityStatus: 'available',
        voiceName: 'Yuna (ko-KR, 기기 내장)',
        voiceLang: 'ko-KR',
        localService: true,
        enabled: false,
        speed: 1,
        preferences: { movement: true, breath: true, time: true },
        error: '',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'idle',
        offlineStatus: 'ready',
      },
      data: {
        savedSequenceCount: 4,
        exerciseCount: 98,
        historyLogCount: 6,
        ownedEquipmentIds: ['reformer', 'cadillac', 'chair', 'barrel', 'mat'],
        ownedPropIds: ['mini-ball', 'magic-circle', 'foam-roller'],
        persistenceError: null,
        backupMessage: '',
        recoveryStage: 'idle',
        recoveryPreview: null,
        rollbackPoint: null,
      },
    },
  },
  {
    id: 'signed-in-active-instructor',
    labelKo: 'Google 로그인 강사 · 앱 실행 · 롤백 가능',
    descriptionKo:
      'Google 계정이 연결되고 Standalone 앱으로 실행 중이며, 1.15x 음성 안내와 직전 백업 복원 되돌리기 바가 활성화된 시나리오입니다.',
    snapshot: {
      account: {
        phase: 'signed-in',
        operation: null,
        user: {
          uid: 'synthetic-instructor-01',
          displayName: '김서연 강사',
          email: 'seoyeon.pilates@example.test',
        },
        error: null,
        notice: '',
      },
      voice: {
        capabilityStatus: 'available',
        voiceName: 'Sora (ko-KR, 기기 내장)',
        voiceLang: 'ko-KR',
        localService: true,
        enabled: true,
        speed: 1.15,
        preferences: { movement: true, breath: false, time: true },
        error: '',
      },
      install: {
        standalone: true,
        installed: true,
        platform: 'browser',
        canInstall: false,
        installStatus: 'idle',
        offlineStatus: 'ready',
      },
      data: {
        savedSequenceCount: 12,
        exerciseCount: 104,
        historyLogCount: 28,
        ownedEquipmentIds: ['reformer', 'cadillac', 'chair', 'ladder-barrel', 'mat'],
        ownedPropIds: ['mini-ball', 'magic-circle', 'loop-band', 'foam-roller', 'bosu'],
        persistenceError: null,
        backupMessage: '백업 파일을 만들었습니다. 기기 변경 전 안전한 곳에 보관해 주세요.',
        recoveryStage: 'rollback-available',
        recoveryPreview: null,
        rollbackPoint: {
          addedCount: 3,
          createdAtLabel: '방금 복원 적용됨',
        },
      },
    },
  },
  {
    id: 'ios-safari-no-korean-voice',
    labelKo: 'iOS Safari 안내 · 한국어 음성 미확인 · 복구 미리보기',
    descriptionKo:
      'iOS Safari 수동 홈 화면 추가 3단계 안내와 기기 한국어 음성 미확인 시 대본 폴백, 백업 JSON 복구 전 미리보기를 검증합니다.',
    snapshot: {
      account: {
        phase: 'signed-out',
        operation: null,
        user: null,
        error: null,
        notice: 'Google 로그인 창이 닫혔습니다. 원할 때 다시 로그인할 수 있습니다.',
      },
      voice: {
        capabilityStatus: 'no-korean-voice',
        voiceName: null,
        voiceLang: null,
        localService: false,
        enabled: false,
        speed: 0.85,
        preferences: { movement: true, breath: true, time: true },
        error: '',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'ios-safari',
        canInstall: false,
        installStatus: 'idle',
        offlineStatus: 'preparing',
      },
      data: {
        savedSequenceCount: 5,
        exerciseCount: 98,
        historyLogCount: 9,
        ownedEquipmentIds: ['mat', 'reformer'],
        ownedPropIds: ['mini-ball'],
        persistenceError: null,
        backupMessage: '',
        recoveryStage: 'preview-ready',
        recoveryPreview: {
          sourceLabel: 'flow-atelier-backup-2026-11-07.json',
          bytes: 18432,
          newItems: 2,
          conflicts: 1,
          restoredExamples: 0,
          changed: true,
          stale: false,
          diskBlocked: false,
        },
        rollbackPoint: null,
      },
    },
  },
  {
    id: 'unsupported-host-update-ready',
    labelKo: '운영 도메인 외 · 재설치 프롬프트(B-F2) · 업데이트 대기(B-F4)',
    descriptionKo:
      '운영 도메인 외 안내, 이전 설치 취소(dismissed) 후 새 설치 이벤트 도착 시 배너 정리(B-F2), 오프라인 update-ready 단일 상태 공지(B-F4)를 검증합니다.',
    snapshot: {
      account: {
        phase: 'unavailable',
        operation: null,
        user: null,
        error: {
          code: 'auth/unsupported-host',
          message:
            'Google 로그인은 운영 주소 pilates-flow-atelier.web.app에서 사용할 수 있습니다. 이 기기의 수업 자료는 그대로 유지됩니다.',
        },
        notice: '',
      },
      voice: {
        capabilityStatus: 'available',
        voiceName: 'Yuna (ko-KR)',
        voiceLang: 'ko-KR',
        localService: true,
        enabled: true,
        speed: 1,
        preferences: { movement: true, breath: true, time: true },
        error: '',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'dismissed',
        offlineStatus: 'update-ready',
      },
      data: {
        savedSequenceCount: 7,
        exerciseCount: 98,
        historyLogCount: 14,
        ownedEquipmentIds: ['reformer', 'chair', 'mat'],
        ownedPropIds: ['magic-circle', 'theraband'],
        persistenceError: null,
        backupMessage: '',
        recoveryStage: 'idle',
        recoveryPreview: null,
        rollbackPoint: null,
      },
    },
  },
  {
    id: 'storage-warning-stale-preview',
    labelKo: '저장소 경고 · 복구 재검토 필요 · 음성 미지원',
    descriptionKo:
      '브라우저 저장소 경고와 복구 전 확인 중 현재 자료 변경(stale)·저장소 차단(diskBlocked) 상태 및 음성 합성 미지원 환경을 검증합니다.',
    snapshot: {
      account: {
        phase: 'unavailable',
        operation: null,
        user: null,
        error: {
          code: 'auth/bootstrap-timeout',
          message: '계정 연결 확인이 지연되고 있습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
        },
        notice: '',
      },
      voice: {
        capabilityStatus: 'unsupported',
        voiceName: null,
        voiceLang: null,
        localService: false,
        enabled: false,
        speed: 1,
        preferences: { movement: false, breath: false, time: false },
        error: '현재 브라우저에서 음성 합성을 지원하지 않습니다. 화면 대본을 이용해 주세요.',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'ios-other',
        canInstall: false,
        installStatus: 'error',
        offlineStatus: 'error',
      },
      data: {
        savedSequenceCount: 2,
        exerciseCount: 98,
        historyLogCount: 1,
        ownedEquipmentIds: ['mat'],
        ownedPropIds: [],
        persistenceError:
          '브라우저 저장 공간이 부족합니다. 전체 백업 파일을 먼저 내려받아 보관해 주세요.',
        backupMessage: '',
        recoveryStage: 'preview-ready',
        recoveryPreview: {
          sourceLabel: 'studio-transfer-package-with-very-long-filename-20261107.json',
          bytes: 49152,
          newItems: 4,
          conflicts: 2,
          restoredExamples: 1,
          changed: true,
          stale: true,
          diskBlocked: true,
          errorMessage: '다른 탭에서 저장 자료가 바뀌어 복원을 잠시 멈췄습니다.',
        },
        rollbackPoint: null,
      },
    },
  },
  {
    id: 'adversarial-untrusted-input',
    labelKo: '비신뢰 입력 · 민감 토큰 마스킹 · 수치 클램핑',
    descriptionKo:
      '음수/NaN 수치, 비정상 문자열, 에러 메시지 내 API 키/Bearer 토큰 포함 시 자동 마스킹 및 읽기 전용 방어를 검증합니다.',
    snapshot: {
      account: {
        phase: 'unavailable',
        operation: null,
        user: null,
        error: {
          code: 'auth/invalid-api-key',
          message:
            '연결 오류: apiKey=AIzaSyDummySecretKeyForRedactionTest12345 및 Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sig 확인 필요',
        },
        notice: '',
      },
      voice: {
        capabilityStatus: 'available',
        voiceName: 'Yuna',
        voiceLang: 'ko-KR',
        localService: true,
        enabled: true,
        speed: 1,
        preferences: { movement: true, breath: true, time: false },
        error: '',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: false,
        installStatus: 'idle',
        offlineStatus: 'unavailable',
      },
      data: {
        savedSequenceCount: -15,
        exerciseCount: Number.NaN,
        historyLogCount: 9999999,
        ownedEquipmentIds: ['reformer', 'mat'],
        ownedPropIds: ['mini-ball'],
        persistenceError: null,
        backupMessage: 'token=ghp_1234567890abcdefghijklmnopqrstuvwx 백업 완료',
        recoveryStage: 'idle',
        recoveryPreview: null,
        rollbackPoint: null,
      },
    },
  },
]);

export function getSettingsFixturePreset(
  presetId: SettingsFixturePresetId,
): SettingsFixturePreset {
  return (
    SETTINGS_PAGE_FIXTURE_PRESETS.find((item) => item.id === presetId) ??
    SETTINGS_PAGE_FIXTURE_PRESETS[0]
  );
}

export function cloneSettingsSnapshotInput(
  snapshot: SettingsPageSnapshotInput,
): SettingsPageSnapshotInput {
  return structuredClone(snapshot);
}
