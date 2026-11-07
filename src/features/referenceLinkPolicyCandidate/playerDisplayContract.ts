import {
  type EvaluatedReferenceLinkItem,
  type ExerciseReferenceLinkPolicyReport,
  type ReferenceDisplayMode,
  type ReferencePlayerDisplaySnapshot,
  type ReferencePlayerLifecycleState,
  type ReferencePlayerRuntimeFailureKind,
  type SyntheticIframeFixtureDescriptor,
} from './types';
import { isStrictNoAutoplayEmbedUrl } from './urlPolicyEngine';

export interface ReferencePlayerControllerOptions {
  readonly iframeMode?: 'local-synthetic-fixture' | 'production-nocookie';
  readonly initialItemId?: string | null;
  readonly onSnapshotChange?: (snapshot: ReferencePlayerDisplaySnapshot) => void;
}

export interface RequestEmbedLoadAction {
  readonly userClicked: boolean;
}

export interface ReferencePlayerDisplayController {
  getSnapshot: () => ReferencePlayerDisplaySnapshot;
  selectItem: (itemId: string | null) => ReferencePlayerDisplaySnapshot;
  requestLoadEmbed: (action: RequestEmbedLoadAction) => boolean;
  closeEmbed: () => ReferencePlayerDisplaySnapshot;
  reportRuntimeFailure: (
    kind?: ReferencePlayerRuntimeFailureKind,
  ) => ReferencePlayerDisplaySnapshot;
  resetFailureState: () => ReferencePlayerDisplaySnapshot;
  handlePageHide: () => ReferencePlayerDisplaySnapshot;
  handleVisibilityChange: (hidden: boolean) => ReferencePlayerDisplaySnapshot;
  handlePageShow: () => ReferencePlayerDisplaySnapshot;
  replaceReport: (
    nextReport: ExerciseReferenceLinkPolicyReport,
    initialItemId?: string | null,
  ) => ReferencePlayerDisplaySnapshot;
}

function buildSyntheticIframeDescriptor(
  item: EvaluatedReferenceLinkItem,
  mode: 'local-synthetic-fixture' | 'production-nocookie',
): SyntheticIframeFixtureDescriptor | null {
  const norm = item.normalized;
  if (
    !norm.ok ||
    !norm.embedAllowed ||
    norm.displayMode !== 'embed-with-external-link' ||
    !norm.embedUrl ||
    !norm.localSyntheticFixtureUrl ||
    !norm.youtubeVideoId ||
    !norm.canonicalExternalUrl ||
    !isStrictNoAutoplayEmbedUrl(norm.embedUrl)
  ) {
    return null;
  }

  return Object.freeze({
    mode,
    iframeSrc:
      mode === 'local-synthetic-fixture' ? norm.localSyntheticFixtureUrl : norm.embedUrl,
    canonicalEmbedUrl: norm.embedUrl,
    videoId: norm.youtubeVideoId,
    startSec: norm.startSec ?? 0,
    endSec: norm.endSec ?? null,
    autoplayParam: '0',
    relParam: '0',
    allowAttribute: 'encrypted-media; gyroscope; picture-in-picture',
    referrerPolicy: 'strict-origin-when-cross-origin',
    sandboxAttribute: 'allow-scripts allow-same-origin allow-presentation',
    externalOriginalUrl: norm.canonicalExternalUrl,
  });
}

function resolveInitialStateForItem(
  item: EvaluatedReferenceLinkItem | null,
): {
  state: ReferencePlayerLifecycleState;
  effectiveDisplayMode: ReferenceDisplayMode;
  failureKind: ReferencePlayerRuntimeFailureKind | null;
  statusNoticeKo: string;
} {
  if (!item || !item.normalized.ok || !item.normalized.canonicalExternalUrl) {
    return {
      state: 'blocked-url',
      effectiveDisplayMode: 'blocked',
      failureKind: null,
      statusNoticeKo: '유효한 참고 링크가 없거나 보안 정책에 의해 차단된 항목입니다.',
    };
  }

  if (
    item.normalized.displayMode === 'external-link-only' ||
    !item.normalized.embedAllowed ||
    !item.normalized.embedUrl
  ) {
    return {
      state: 'fallback-external-only',
      effectiveDisplayMode: 'external-link-only',
      failureKind: 'unsupported-embed-policy',
      statusNoticeKo:
        '이 출처는 인라인 임베드 플레이어를 지원하지 않으므로 외부 원본 링크로 분리되었습니다.',
    };
  }

  return {
    state: 'idle-unmounted',
    effectiveDisplayMode: 'embed-with-external-link',
    failureKind: null,
    statusNoticeKo:
      '사용자 클릭 전에는 자동 재생하거나 iframe을 미리 마운트하지 않습니다. [수동으로 참고 영상 불러오기]를 눌러야 로드됩니다.',
  };
}

export function createReferencePlayerDisplayController(
  initialReport: ExerciseReferenceLinkPolicyReport,
  options: ReferencePlayerControllerOptions = {},
): ReferencePlayerDisplayController {
  const iframeMode = options.iframeMode ?? 'local-synthetic-fixture';
  let currentReport = initialReport;

  const findItem = (itemId: string | null | undefined): EvaluatedReferenceLinkItem | null => {
    if (!currentReport.acceptedItems.length) return null;
    if (itemId) {
      const matched = currentReport.acceptedItems.find((item) => item.itemId === itemId);
      if (matched) return matched;
    }
    return (
      currentReport.embedCapableItems[0] ?? currentReport.acceptedItems[0] ?? null
    );
  };

  let activeItem: EvaluatedReferenceLinkItem | null = findItem(options.initialItemId);
  const initialResolved = resolveInitialStateForItem(activeItem);
  let state: ReferencePlayerLifecycleState = initialResolved.state;
  let effectiveDisplayMode: ReferenceDisplayMode = initialResolved.effectiveDisplayMode;
  let failureKind: ReferencePlayerRuntimeFailureKind | null = initialResolved.failureKind;
  let statusNoticeKo = initialResolved.statusNoticeKo;
  let iframeMounted = false;
  let userClickVerified = false;
  let syntheticIframe: SyntheticIframeFixtureDescriptor | null = null;

  const buildSnapshot = (): ReferencePlayerDisplaySnapshot =>
    Object.freeze({
      subjectId: currentReport.subjectId,
      activeItemId: activeItem?.itemId ?? null,
      state,
      iframeMounted,
      userClickVerified,
      failureKind,
      statusNoticeKo,
      effectiveDisplayMode,
      canonicalExternalUrl: activeItem?.normalized.canonicalExternalUrl ?? null,
      externalLinkLabelKo:
        activeItem?.normalized.externalLinkLabelKo ?? '외부 원본 링크 없음',
      syntheticIframe,
    });

  const emit = (): ReferencePlayerDisplaySnapshot => {
    const snap = buildSnapshot();
    options.onSnapshotChange?.(snap);
    return snap;
  };

  const resetToIdleForCurrentItem = (customNoticeKo?: string): ReferencePlayerDisplaySnapshot => {
    const resolved = resolveInitialStateForItem(activeItem);
    state = resolved.state;
    effectiveDisplayMode = resolved.effectiveDisplayMode;
    failureKind = resolved.failureKind;
    statusNoticeKo = customNoticeKo ?? resolved.statusNoticeKo;
    iframeMounted = false;
    userClickVerified = false;
    syntheticIframe = null;
    return emit();
  };

  return {
    getSnapshot() {
      return buildSnapshot();
    },

    selectItem(itemId: string | null) {
      if (itemId === null && currentReport.acceptedItems.length === 0) {
        activeItem = null;
      } else {
        activeItem = findItem(itemId);
      }
      return resetToIdleForCurrentItem();
    },

    requestLoadEmbed(action: RequestEmbedLoadAction) {
      if (!action || action.userClicked !== true) {
        statusNoticeKo =
          '명시적인 사용자 클릭(userClicked=true) 없이는 참고 영상 iframe을 불러오거나 자동 재생할 수 없습니다.';
        iframeMounted = false;
        userClickVerified = false;
        syntheticIframe = null;
        emit();
        return false;
      }

      if (!activeItem) {
        resetToIdleForCurrentItem();
        return false;
      }

      const descriptor = buildSyntheticIframeDescriptor(activeItem, iframeMode);
      if (!descriptor) {
        state = 'fallback-external-only';
        effectiveDisplayMode = 'external-link-only';
        failureKind = 'unsupported-embed-policy';
        iframeMounted = false;
        userClickVerified = false;
        syntheticIframe = null;
        statusNoticeKo =
          '인라인 임베드가 지원되지 않는 출처입니다. 아래 외부 원본 링크를 이용해 주세요.';
        emit();
        return false;
      }

      state = 'loaded-manual';
      effectiveDisplayMode = 'embed-with-external-link';
      failureKind = null;
      iframeMounted = true;
      userClickVerified = true;
      syntheticIframe = descriptor;
      statusNoticeKo =
        iframeMode === 'local-synthetic-fixture'
          ? '사용자 클릭 확인 완료 · 로컬 합성 iframe 픽스처(autoplay=0, rel=0)가 로드되었습니다.'
          : '사용자 클릭 확인 완료 · 공식 개인정보 보호 모드(youtube-nocookie, autoplay=0)가 로드되었습니다.';
      emit();
      return true;
    },

    closeEmbed() {
      return resetToIdleForCurrentItem(
        '사용자가 인베드 플레이어를 닫아 iframe을 언마운트했습니다.',
      );
    },

    reportRuntimeFailure(
      kind: ReferencePlayerRuntimeFailureKind = 'embed-blocked-by-publisher',
    ) {
      state = 'fallback-external-only';
      effectiveDisplayMode = 'external-link-only';
      failureKind = kind;
      iframeMounted = false;
      userClickVerified = false;
      syntheticIframe = null;
      statusNoticeKo =
        kind === 'playback-network-or-media-error'
          ? '임베드 재생 중 오류가 감지되어 iframe을 제거하고 외부 원본 링크로 분리했습니다.'
          : '게시자 임베드 차단 또는 출처 정책 제한으로 iframe을 제거하고 외부 원본 링크로 분리했습니다.';
      return emit();
    },

    resetFailureState() {
      return resetToIdleForCurrentItem();
    },

    handlePageHide() {
      return resetToIdleForCurrentItem(
        '페이지 전환(pagehide)으로 인해 인베드 플레이어를 즉시 언마운트했습니다.',
      );
    },

    handleVisibilityChange(hidden: boolean) {
      if (hidden) {
        return resetToIdleForCurrentItem(
          '화면이 백그라운드로 전환(document.hidden)되어 인베드 플레이어를 언마운트했습니다.',
        );
      }
      // Restoring visibility NEVER auto-resumes playback
      return buildSnapshot();
    },

    handlePageShow() {
      // pageshow NEVER auto-resumes playback
      return buildSnapshot();
    },

    replaceReport(
      nextReport: ExerciseReferenceLinkPolicyReport,
      initialItemId?: string | null,
    ) {
      currentReport = nextReport;
      activeItem = findItem(initialItemId);
      return resetToIdleForCurrentItem();
    },
  };
}
