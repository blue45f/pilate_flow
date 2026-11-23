import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Monitor,
  Nfc,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { APPARATUS_LABELS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { useManagedTimeouts } from '../hooks/useManagedTimeouts';
import type { ApparatusType } from '../types/pilates';
import {
  buildApparatusDeepLinkUrl,
  buildSimpleQrDataUrl,
  isWebNfcSupported,
  writeApparatusNfcTag,
  type ApparatusDeepLinkMode,
} from '../utils/apparatusNfcDeepLink';
import {
  createDualScreenChannel,
  generateDualScreenRoomCode,
  normalizeDualScreenRoomCode,
  readLatestDualScreenSnapshot,
  type DualScreenChannel,
  type DualScreenCommand,
  type DualScreenCommandType,
  type DualScreenConnectionState,
  type DualScreenStageSnapshot,
} from '../utils/dualScreenSyncEngine';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/dual-screen-nfc.css';

export interface DualScreenNfcPanelProps {
  snapshot: Omit<DualScreenStageSnapshot, 'roomCode' | 'updatedAt'>;
  onRemoteCommand?: (cmd: DualScreenCommand) => void;
  activeApparatus?: ApparatusType;
  activeSequenceId?: string;
  baseOrigin?: string;
}

export interface MemberDualDisplayStageProps {
  roomCode: string;
  initialSnapshot?: DualScreenStageSnapshot | null;
  onExitDisplay?: () => void;
}

type PanelTabId = 'dual-screen' | 'nfc-qr';

const APPARATUS_ORDER: readonly ApparatusType[] = [
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
];

const NFC_LAUNCH_MODES: ReadonlyArray<{
  readonly id: Exclude<ApparatusDeepLinkMode, 'member-display'>;
  readonly labelKo: string;
  readonly descKo: string;
}> = [
  { id: 'live', labelKo: '바로 수업 시작', descKo: '선택한 기구의 라이브 수업 진행 화면을 바로 엽니다.' },
  { id: 'workbench', labelKo: '시퀀스 작성', descKo: '해당 기구 필터가 적용된 수업 만들기 작업실로 이동합니다.' },
  { id: 'atlas', labelKo: '동작 라이브러리', descKo: '해당 기구 동작 라이브러리와 3D 자세 가이드를 바로 엽니다.' },
];

function resolveStudioOrigin(baseOrigin?: string): string {
  if (baseOrigin && baseOrigin.trim()) {
    return baseOrigin.trim();
  }
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return 'https://pilates-flow-atelier.web.app';
}

function formatTransportStatusKo(state: DualScreenConnectionState | null): string {
  if (!state) {
    return typeof BroadcastChannel === 'function'
      ? '같은 브라우저 즉시 연동'
      : '브라우저 저장소 폴백 연동';
  }
  if (state.closed) return '연결 준비됨';
  if (state.transport === 'webrtc-p2p') return '다른 기기 직접 연결됨';
  if (state.broadcastSupported) return '같은 브라우저 즉시 연동';
  if (state.storageFallbackActive) return '브라우저 저장소 폴백 연동';
  return '로컬 모드';
}

export const DualScreenNfcPanel: React.FC<DualScreenNfcPanelProps> = ({
  snapshot,
  onRemoteCommand,
  activeApparatus,
  activeSequenceId,
  baseOrigin,
}) => {
  const idPrefix = useId();
  const { scheduleTimeout } = useManagedTimeouts();

  const [activeTab, setActiveTab] = useState<PanelTabId>('dual-screen');
  const [roomCode, setRoomCode] = useState<string>(() => generateDualScreenRoomCode(4));
  const [roomInput, setRoomInput] = useState<string>(roomCode);
  const [connectionState, setConnectionState] = useState<DualScreenConnectionState | null>(null);
  const [dualFeedback, setDualFeedback] = useState<{ text: string; warn?: boolean } | null>(null);

  // WebRTC serverless pairing state
  const [offerCode, setOfferCode] = useState<string>('');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [webrtcBusy, setWebrtcBusy] = useState<boolean>(false);

  // NFC / QR tab state (derived from prop unless instructor picks another apparatus)
  const [selectedApparatusOverride, setSelectedApparatusOverride] = useState<ApparatusType | null>(
    null,
  );
  const selectedApparatus: ApparatusType =
    selectedApparatusOverride ?? activeApparatus ?? snapshot.apparatus ?? 'reformer';
  const [selectedMode, setSelectedMode] =
    useState<Exclude<ApparatusDeepLinkMode, 'member-display'>>('live');
  const [includeSequenceId, setIncludeSequenceId] = useState<boolean>(Boolean(activeSequenceId));
  const [nfcFeedback, setNfcFeedback] = useState<{ text: string; warn?: boolean } | null>(null);
  const [nfcBusy, setNfcBusy] = useState<boolean>(false);

  const channelRef = useRef<DualScreenChannel | null>(null);
  const onRemoteCommandRef = useRef(onRemoteCommand);
  const snapshotRef = useRef(snapshot);
  // Remains false on initial mount so localStorage.setItem is NEVER called automatically on mount
  const userSyncActiveRef = useRef<boolean>(false);

  useEffect(() => {
    onRemoteCommandRef.current = onRemoteCommand;
  }, [onRemoteCommand]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // Open channel in listen-only mode (zero localStorage writes on mount)
  useEffect(() => {
    const channel = createDualScreenChannel(roomCode, 'controller');
    channelRef.current = channel;

    const offCommand = channel.onCommand((cmd) => {
      onRemoteCommandRef.current?.(cmd);
    });
    const offState = channel.onConnectionStateChange((nextState) => {
      setConnectionState(nextState);
    });

    return () => {
      offCommand();
      offState();
      channel.close();
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [roomCode]);

  // Only push live snapshot updates after the user explicitly starts dual-screen sync
  useEffect(() => {
    if (!userSyncActiveRef.current) return;
    channelRef.current?.publishSnapshot(snapshot);
  }, [snapshot]);

  const resolvedOrigin = useMemo(() => resolveStudioOrigin(baseOrigin), [baseOrigin]);

  const memberDisplayUrl = useMemo(
    () =>
      buildApparatusDeepLinkUrl(resolvedOrigin, {
        mode: 'member-display',
        roomCode,
      }),
    [resolvedOrigin, roomCode],
  );

  const apparatusDeepLinkUrl = useMemo(
    () =>
      buildApparatusDeepLinkUrl(resolvedOrigin, {
        apparatus: selectedApparatus,
        mode: selectedMode,
        sequenceId: includeSequenceId && activeSequenceId ? activeSequenceId : undefined,
      }),
    [resolvedOrigin, selectedApparatus, selectedMode, includeSequenceId, activeSequenceId],
  );

  const qrDataUrl = useMemo(
    () => buildSimpleQrDataUrl(apparatusDeepLinkUrl),
    [apparatusDeepLinkUrl],
  );

  const webNfcAvailable = isWebNfcSupported();
  const apparatusLabelKo = APPARATUS_LABELS[selectedApparatus]?.ko ?? selectedApparatus;
  const currentApparatusLabelKo = APPARATUS_LABELS[snapshot.apparatus]?.ko ?? snapshot.apparatus;
  const selectedModeMeta =
    NFC_LAUNCH_MODES.find((item) => item.id === selectedMode) ?? NFC_LAUNCH_MODES[0]!;

  const showDualFeedback = useCallback(
    (text: string, warn = false) => {
      setDualFeedback({ text, warn });
      scheduleTimeout(() => {
        setDualFeedback((prev) => (prev?.text === text ? null : prev));
      }, 5000);
    },
    [scheduleTimeout],
  );

  const showNfcFeedback = useCallback(
    (text: string, warn = false) => {
      setNfcFeedback({ text, warn });
      scheduleTimeout(() => {
        setNfcFeedback((prev) => (prev?.text === text ? null : prev));
      }, 6000);
    },
    [scheduleTimeout],
  );

  const handleRoomInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = normalizeDualScreenRoomCode(event.target.value).slice(0, 6);
    setRoomInput(cleaned);
    if (cleaned.length >= 4) {
      userSyncActiveRef.current = false;
      setConnectionState(null);
      setOfferCode('');
      setAnswerInput('');
      setRoomCode(cleaned);
    }
  };

  const handleRegenerateRoomCode = () => {
    const nextCode = generateDualScreenRoomCode(4);
    userSyncActiveRef.current = false;
    setConnectionState(null);
    setOfferCode('');
    setAnswerInput('');
    setRoomCode(nextCode);
    setRoomInput(nextCode);
    showDualFeedback(`새 방 코드(${nextCode})를 발급했습니다.`);
  };

  const handleOpenMemberDisplay = () => {
    userSyncActiveRef.current = true;
    channelRef.current?.publishSnapshot(snapshotRef.current);

    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      const opened = window.open(memberDisplayUrl, '_blank', 'noopener');
      if (opened) {
        showDualFeedback(`방 코드 ${roomCode} 회원용 큰 화면을 새 창으로 열었습니다.`);
      } else {
        showDualFeedback(
          '팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 누르거나 아래 링크를 새 창에 열어 주세요.',
          true,
        );
      }
    }
  };

  const handleRemoteAction = (type: DualScreenCommandType) => {
    userSyncActiveRef.current = true;
    const cmd: DualScreenCommand = { type, issuedAt: Date.now() };
    channelRef.current?.publishSnapshot(snapshotRef.current);
    channelRef.current?.sendCommand(cmd);
    onRemoteCommandRef.current?.(cmd);

    const actionLabel =
      type === 'prev' ? '이전 동작' : type === 'next' ? '다음 동작' : '재생/일시정지';
    showDualFeedback(`리모컨 명령(${actionLabel})을 전송했습니다.`);
  };

  const handleCreateOffer = async () => {
    if (!channelRef.current) return;
    setWebrtcBusy(true);
    try {
      userSyncActiveRef.current = true;
      channelRef.current.publishSnapshot(snapshotRef.current);
      const result = await channelRef.current.createWebRtcOffer();
      if (result.ok) {
        setOfferCode(result.code);
        showDualFeedback(result.messageKo);
      } else {
        setOfferCode('');
        showDualFeedback(result.messageKo, true);
      }
    } finally {
      setWebrtcBusy(false);
    }
  };

  const handleCopyText = async (
    text: string,
    successKo: string,
    onDone: (msg: string, warn?: boolean) => void,
  ) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        onDone(successKo, false);
        return;
      }
    } catch {
      // Fall through to manual copy notice
    }
    onDone('클립보드 접근이 제한되어 있습니다. 표시된 코드를 길게 눌러 복사해 주세요.', true);
  };

  const handleCompleteAnswer = async () => {
    if (!channelRef.current) return;
    setWebrtcBusy(true);
    try {
      const result = await channelRef.current.completeWebRtcAnswer(answerInput);
      showDualFeedback(result.messageKo, !result.ok);
      if (result.ok) {
        userSyncActiveRef.current = true;
        channelRef.current.publishSnapshot(snapshotRef.current);
      }
    } finally {
      setWebrtcBusy(false);
    }
  };

  const handleWriteNfcTag = async () => {
    setNfcBusy(true);
    try {
      const result = await writeApparatusNfcTag(apparatusDeepLinkUrl);
      showNfcFeedback(result.messageKo, !result.ok);
    } finally {
      setNfcBusy(false);
    }
  };

  const isConnectedLive =
    connectionState?.transport === 'webrtc-p2p' ||
    (connectionState?.lastSyncedAt !== null && connectionState?.lastSyncedAt !== undefined);

  return (
    <section
      className="pf-ds-panel"
      aria-label="듀얼 스크린 연동 및 기구 NFC 태그 설정"
      data-testid="dual-screen-nfc-panel"
    >
      <header className="pf-ds-panel__header">
        <div className="pf-ds-panel__title-group">
          <h2 className="pf-ds-panel__title">스튜디오 화면 연동 · 기구 태그</h2>
          <p className="pf-ds-panel__subtitle">
            강사 폰으로 큰 화면을 제어하고 기구 NFC·QR 태그로 수업을 바로 엽니다.
          </p>
        </div>
        <span
          className={`pf-ds-status-chip ${isConnectedLive ? 'pf-ds-status-chip--live' : ''}`}
          data-testid="dual-screen-connection-status"
        >
          <span className="pf-ds-status-dot" aria-hidden="true" />
          {formatTransportStatusKo(connectionState)} · {roomCode}
        </span>
      </header>

      <div className="pf-ds-tabs" role="tablist" aria-label="화면 연동 및 기구 태그 탭">
        <button
          id={`${idPrefix}-tab-dual`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'dual-screen'}
          aria-controls={`${idPrefix}-panel-dual`}
          className={`pf-ds-tab ${activeTab === 'dual-screen' ? 'pf-ds-tab--active' : ''}`}
          data-testid="dual-screen-tab"
          onClick={() => setActiveTab('dual-screen')}
        >
          <Monitor size={18} aria-hidden="true" />
          폰 ↔ 큰 화면 듀얼 연동
        </button>
        <button
          id={`${idPrefix}-tab-nfc`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'nfc-qr'}
          aria-controls={`${idPrefix}-panel-nfc`}
          className={`pf-ds-tab ${activeTab === 'nfc-qr' ? 'pf-ds-tab--active' : ''}`}
          data-testid="nfc-qr-tab"
          onClick={() => setActiveTab('nfc-qr')}
        >
          <Nfc size={18} aria-hidden="true" />
          기구 NFC · QR 태그
        </button>
      </div>

      {activeTab === 'dual-screen' ? (
        <div
          id={`${idPrefix}-panel-dual`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-tab-dual`}
          className="pf-ds-tabpanel"
          data-testid="dual-screen-tabpanel"
        >
          <div className="pf-ds-section">
            <label htmlFor={`${idPrefix}-room-code`} className="pf-ds-section__label">
              4자리 방 코드
            </label>
            <p className="pf-ds-section__hint">
              강사 기기와 회원용 TV·아이패드가 같은 방 코드를 쓰면 동작과 타이머가 즉시 맞물립니다.
            </p>
            <div className="pf-ds-room-row">
              <input
                id={`${idPrefix}-room-code`}
                type="text"
                inputMode="text"
                maxLength={6}
                value={roomInput}
                onChange={handleRoomInputChange}
                className="pf-ds-input"
                aria-label="듀얼 스크린 방 코드"
                data-testid="dual-screen-room-input"
              />
              <button
                type="button"
                className="pf-ds-btn"
                onClick={handleRegenerateRoomCode}
                data-testid="dual-screen-regenerate-btn"
              >
                <RefreshCw size={16} aria-hidden="true" />
                새 코드
              </button>
              <button
                type="button"
                className="pf-ds-btn pf-ds-btn--primary"
                onClick={handleOpenMemberDisplay}
                data-testid="open-member-display-btn"
              >
                <ExternalLink size={16} aria-hidden="true" />
                회원용 큰 화면 새 창 열기
              </button>
            </div>
          </div>

          <div className="pf-ds-section">
            <p className="pf-ds-section__label">강사 리모컨 미니 제어</p>
            <div className="pf-ds-stage-preview">
              <span className="pf-ds-stage-preview__name">
                {snapshot.exerciseNameKo || '현재 동작 대기 중'}
              </span>
              <span className="pf-ds-stage-preview__meta">
                <span>{currentApparatusLabelKo}</span>
                {snapshot.springs ? <span className="pf-ds-keycap">{snapshot.springs}</span> : null}
                <span>
                  {snapshot.stepIndex + 1}/{Math.max(1, snapshot.totalSteps)}
                </span>
                <span>{formatSecondsToMMSS(snapshot.timerRemainingSec)}</span>
              </span>
            </div>

            <div className="pf-ds-remote-grid">
              <button
                type="button"
                className="pf-ds-btn"
                onClick={() => handleRemoteAction('prev')}
                data-testid="remote-prev-btn"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                이전 동작
              </button>
              <button
                type="button"
                className="pf-ds-btn pf-ds-btn--primary"
                onClick={() => handleRemoteAction('toggle-play')}
                data-testid="remote-toggle-play-btn"
              >
                {snapshot.running ? (
                  <>
                    <Pause size={18} aria-hidden="true" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play size={18} aria-hidden="true" />
                    재생 시작
                  </>
                )}
              </button>
              <button
                type="button"
                className="pf-ds-btn"
                onClick={() => handleRemoteAction('next')}
                data-testid="remote-next-btn"
              >
                다음 동작
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <details className="pf-ds-details" data-testid="webrtc-pairing-details">
            <summary className="pf-ds-details__summary">
              <span>다른 기기(TV·아이패드) WebRTC 직접 연결</span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="pf-ds-details__body">
              <p className="pf-ds-section__hint">
                별도 서버 없이 강사 폰과 스튜디오 TV·아이패드를 P2P로 바로 연결합니다. 1단계에서 Offer 코드를 만들고 큰 화면에 붙여넣은 뒤, 받은 Answer 코드를 2단계에 입력해 주세요.
              </p>

              <div className="pf-ds-webrtc-step">
                <div className="pf-ds-action-row">
                  <button
                    type="button"
                    className="pf-ds-btn pf-ds-btn--primary"
                    onClick={handleCreateOffer}
                    disabled={webrtcBusy}
                    data-testid="webrtc-create-offer-btn"
                  >
                    <Wifi size={16} aria-hidden="true" />
                    1단계 · Offer 코드 생성
                  </button>
                  {offerCode ? (
                    <button
                      type="button"
                      className="pf-ds-btn"
                      onClick={() =>
                        handleCopyText(
                          offerCode,
                          'Offer 코드를 복사했습니다. 큰 화면 기기에 붙여넣어 주세요.',
                          showDualFeedback,
                        )
                      }
                      data-testid="webrtc-copy-offer-btn"
                    >
                      <Copy size={16} aria-hidden="true" />
                      Offer 코드 복사
                    </button>
                  ) : null}
                </div>
                {offerCode ? (
                  <textarea
                    readOnly
                    value={offerCode}
                    className="pf-ds-textarea"
                    aria-label="생성된 WebRTC Offer 연결 코드"
                    data-testid="webrtc-offer-output"
                  />
                ) : null}
              </div>

              <div className="pf-ds-webrtc-step">
                <label htmlFor={`${idPrefix}-answer-input`} className="pf-ds-section__label">
                  2단계 · 큰 화면에서 받은 Answer 코드
                </label>
                <textarea
                  id={`${idPrefix}-answer-input`}
                  value={answerInput}
                  onChange={(event) => setAnswerInput(event.target.value)}
                  placeholder="TV나 아이패드에서 생성된 PF1... 응답 코드를 붙여넣어 주세요"
                  className="pf-ds-textarea"
                  data-testid="webrtc-answer-input"
                />
                <div className="pf-ds-action-row">
                  <button
                    type="button"
                    className="pf-ds-btn"
                    onClick={handleCompleteAnswer}
                    disabled={webrtcBusy || !answerInput.trim()}
                    data-testid="webrtc-complete-answer-btn"
                  >
                    Answer 코드 연결 완료
                  </button>
                </div>
              </div>
            </div>
          </details>

          {dualFeedback ? (
            <p
              className={`pf-ds-feedback ${dualFeedback.warn ? 'pf-ds-feedback--warn' : ''}`}
              role="status"
              aria-live="polite"
              data-testid="dual-screen-feedback"
            >
              {dualFeedback.text}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          id={`${idPrefix}-panel-nfc`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-tab-nfc`}
          className="pf-ds-tabpanel"
          data-testid="nfc-qr-tabpanel"
        >
          <div className="pf-ds-section">
            <p className="pf-ds-section__label">1. 기구 선택</p>
            <div className="pf-ds-choice-grid" role="group" aria-label="기구 선택">
              {APPARATUS_ORDER.map((apparatus) => {
                const selected = selectedApparatus === apparatus;
                return (
                  <button
                    key={apparatus}
                    type="button"
                    aria-pressed={selected}
                    className={`pf-ds-choice ${selected ? 'pf-ds-choice--selected' : ''}`}
                    data-testid={`nfc-apparatus-${apparatus}`}
                    onClick={() => setSelectedApparatusOverride(apparatus)}
                  >
                    {APPARATUS_LABELS[apparatus].ko}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pf-ds-section">
            <p className="pf-ds-section__label">2. 태그 인식 시 바로 열 화면</p>
            <div className="pf-ds-choice-grid" role="group" aria-label="실행 모드 선택">
              {NFC_LAUNCH_MODES.map((modeItem) => {
                const selected = selectedMode === modeItem.id;
                return (
                  <button
                    key={modeItem.id}
                    type="button"
                    aria-pressed={selected}
                    className={`pf-ds-choice ${selected ? 'pf-ds-choice--selected' : ''}`}
                    data-testid={`nfc-mode-${modeItem.id}`}
                    onClick={() => setSelectedMode(modeItem.id)}
                  >
                    {modeItem.labelKo}
                  </button>
                );
              })}
            </div>
            <p className="pf-ds-section__hint">{selectedModeMeta.descKo}</p>

            {activeSequenceId ? (
              <label className="pf-ds-checkbox-row">
                <input
                  type="checkbox"
                  checked={includeSequenceId}
                  onChange={(event) => setIncludeSequenceId(event.target.checked)}
                  data-testid="nfc-include-sequence-checkbox"
                />
                <span>현재 열린 시퀀스({activeSequenceId}) 바로 연결</span>
              </label>
            ) : null}
          </div>

          <div className="pf-ds-section">
            <p className="pf-ds-section__label">3. 기구 부착용 태그 카드 미리보기</p>
            <div className="pf-ds-tag-card" data-testid="nfc-tag-card-preview">
              <img
                src={qrDataUrl}
                alt={`${apparatusLabelKo} ${selectedModeMeta.labelKo} QR 코드`}
                className="pf-ds-tag-card__qr"
                data-testid="nfc-tag-qr-image"
              />
              <div className="pf-ds-tag-card__info">
                <h3 className="pf-ds-tag-card__heading">{apparatusLabelKo} 전용 태그</h3>
                <p className="pf-ds-tag-card__mode">{selectedModeMeta.labelKo}</p>
                <p className="pf-ds-section__hint">
                  기구 프레임 옆에 붙여 두면 스마트폰을 대거나 카메라로 비춰 바로 수업을 시작합니다.
                </p>
                <p className="pf-ds-tag-card__url" data-testid="nfc-deeplink-url">
                  {apparatusDeepLinkUrl}
                </p>
              </div>
            </div>

            <div className="pf-ds-action-row">
              <button
                type="button"
                className="pf-ds-btn pf-ds-btn--primary"
                onClick={handleWriteNfcTag}
                disabled={nfcBusy}
                data-testid="nfc-write-tag-btn"
              >
                <Nfc size={16} aria-hidden="true" />
                {webNfcAvailable ? 'NFC 태그에 바로 굽기' : 'NFC 태그 굽기 (안내 확인)'}
              </button>
              <button
                type="button"
                className="pf-ds-btn"
                onClick={() =>
                  handleCopyText(
                    apparatusDeepLinkUrl,
                    `${apparatusLabelKo} 바로 실행 링크를 복사했습니다.`,
                    showNfcFeedback,
                  )
                }
                data-testid="nfc-copy-link-btn"
              >
                <Copy size={16} aria-hidden="true" />
                링크 복사
              </button>
              <a
                href={qrDataUrl}
                download={`pilates-${selectedApparatus}-${selectedMode}-qr.svg`}
                className="pf-ds-btn"
                data-testid="nfc-download-qr-link"
              >
                <QrCode size={16} aria-hidden="true" />
                QR 이미지 저장
              </a>
            </div>
          </div>

          {nfcFeedback ? (
            <p
              className={`pf-ds-feedback ${nfcFeedback.warn ? 'pf-ds-feedback--warn' : ''}`}
              role="status"
              aria-live="polite"
              data-testid="nfc-feedback"
            >
              {nfcFeedback.text}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
};

export const MemberDualDisplayStage: React.FC<MemberDualDisplayStageProps> = ({
  roomCode,
  initialSnapshot = null,
  onExitDisplay,
}) => {
  const normalizedRoom = useMemo(
    () => normalizeDualScreenRoomCode(roomCode) || 'STUDIO',
    [roomCode],
  );
  const [liveSnapshot, setLiveSnapshot] = useState<DualScreenStageSnapshot | null>(() =>
    readLatestDualScreenSnapshot(normalizedRoom),
  );
  const [connectionState, setConnectionState] = useState<DualScreenConnectionState | null>(null);
  const [offerInput, setOfferInput] = useState<string>('');
  const [answerOutput, setAnswerOutput] = useState<string>('');
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);
  const [pairingBusy, setPairingBusy] = useState<boolean>(false);

  const channelRef = useRef<DualScreenChannel | null>(null);

  useEffect(() => {
    const channel = createDualScreenChannel(normalizedRoom, 'display');
    channelRef.current = channel;

    const offSnap = channel.onSnapshot((incoming) => {
      setLiveSnapshot(incoming);
    });
    const offState = channel.onConnectionStateChange((nextState) => {
      setConnectionState(nextState);
    });

    // BroadcastChannel-only catch-up ping (never writes localStorage)
    channel.requestSync();

    return () => {
      offSnap();
      offState();
      channel.close();
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [normalizedRoom]);

  const stageSnapshot =
    (liveSnapshot && liveSnapshot.roomCode === normalizedRoom ? liveSnapshot : null) ??
    initialSnapshot;

  const matchedExercise = useMemo(() => {
    if (!stageSnapshot || !stageSnapshot.exerciseId) return null;
    return (
      INITIAL_EXERCISES.find(
        (ex) => ex.id === stageSnapshot.exerciseId && ex.apparatus === stageSnapshot.apparatus,
      ) ?? null
    );
  }, [stageSnapshot]);

  const handleAcceptOffer = async () => {
    if (!channelRef.current) return;
    setPairingBusy(true);
    try {
      const result = await channelRef.current.acceptWebRtcOfferAndCreateAnswer(offerInput);
      if (result.ok) {
        setAnswerOutput(result.code);
      } else {
        setAnswerOutput('');
      }
      setPairingNotice(result.messageKo);
    } finally {
      setPairingBusy(false);
    }
  };

  const handleCopyAnswer = async () => {
    if (!answerOutput) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(answerOutput);
        setPairingNotice('Answer 코드를 복사했습니다. 강사 폰의 2단계 입력창에 붙여넣어 주세요.');
        return;
      }
    } catch {
      // Fallback below
    }
    setPairingNotice('생성된 Answer 코드를 길게 눌러 복사해 주세요.');
  };

  const apparatusLabelKo = stageSnapshot
    ? (APPARATUS_LABELS[stageSnapshot.apparatus]?.ko ?? stageSnapshot.apparatus)
    : '';

  const isReceivingLive =
    stageSnapshot !== null || connectionState?.transport === 'webrtc-p2p';

  return (
    <div
      className="pf-member-stage"
      role="main"
      aria-label="회원용 스튜디오 큰 화면"
      data-testid="member-dual-display-stage"
    >
      <header className="pf-member-stage__topbar">
        <div className="pf-member-stage__brand">
          <span className="pf-ds-keycap" data-testid="member-stage-room-badge">
            방 {normalizedRoom}
          </span>
          <h1 className="pf-member-stage__sequence">
            {stageSnapshot?.sequenceTitle || '스튜디오 라이브 안내 화면'}
          </h1>
        </div>
        <div className="pf-member-stage__meta-group">
          {stageSnapshot ? (
            <span className="pf-ds-keycap" data-testid="member-stage-step-progress">
              {stageSnapshot.stepIndex + 1} / {Math.max(1, stageSnapshot.totalSteps)}
            </span>
          ) : null}
          <span
            className={`pf-ds-status-chip ${isReceivingLive ? 'pf-ds-status-chip--live' : ''}`}
          >
            <span className="pf-ds-status-dot" aria-hidden="true" />
            {isReceivingLive ? '실시간 연동 중' : '강사 화면 대기 중'}
          </span>
          {onExitDisplay ? (
            <button type="button" className="pf-ds-btn" onClick={onExitDisplay}>
              큰 화면 닫기
            </button>
          ) : null}
        </div>
      </header>

      {stageSnapshot ? (
        <>
          <div className="pf-member-stage__main">
            <div className="pf-member-stage__visual-frame" data-testid="member-stage-visual">
              {matchedExercise ? (
                <ExerciseMotionArtwork
                  exercise={matchedExercise}
                  phase="middle"
                  decorative={false}
                  className="pf-member-stage__artwork"
                />
              ) : (
                <div className="pf-member-stage__visual-fallback">
                  <ApparatusIllustrationSvg apparatus={stageSnapshot.apparatus} />
                </div>
              )}
              <span className="pf-ds-status-chip">
                {apparatusLabelKo} · {stageSnapshot.phaseLabelKo || '본 운동'}
              </span>
            </div>

            <div className="pf-member-stage__focus">
              <div className="pf-member-stage__badges">
                <span className="pf-ds-keycap">{apparatusLabelKo}</span>
                {stageSnapshot.phaseLabelKo ? (
                  <span className="pf-ds-status-chip">{stageSnapshot.phaseLabelKo}</span>
                ) : null}
                <span
                  className={`pf-ds-status-chip ${stageSnapshot.running ? 'pf-ds-status-chip--live' : ''}`}
                >
                  {stageSnapshot.running ? '진행 중' : '일시정지'}
                </span>
              </div>

              <h2 className="pf-member-stage__exercise-name" data-testid="member-stage-exercise">
                {stageSnapshot.exerciseNameKo}
              </h2>

              <div className="pf-member-stage__timer-row">
                <span className="pf-member-stage__timer" data-testid="member-stage-timer">
                  {formatSecondsToMMSS(stageSnapshot.timerRemainingSec)}
                </span>
                <div className="pf-member-stage__springs" data-testid="member-stage-springs">
                  <span className="pf-member-stage__spring-label">현재 스프링</span>
                  <SpringVisualPills springs={stageSnapshot.springs} />
                  {stageSnapshot.springs ? (
                    <span className="pf-ds-keycap">{stageSnapshot.springs}</span>
                  ) : null}
                </div>
              </div>

              {stageSnapshot.cueLine ? (
                <div className="pf-member-stage__cue-box" data-testid="member-stage-cue">
                  {stageSnapshot.cueLine}
                </div>
              ) : null}
            </div>
          </div>

          <section
            className="pf-member-stage__next-bar"
            aria-label="다음 동작 및 스프링 안내"
            data-testid="member-stage-next-bar"
          >
            <div className="pf-member-stage__next-left">
              <span className="pf-ds-status-chip">다음 동작</span>
              <span className="pf-member-stage__next-title">
                {stageSnapshot.nextExerciseNameKo || '마무리 호흡 단계'}
              </span>
            </div>
            <div className="pf-member-stage__springs">
              <span className="pf-member-stage__spring-label">다음 스프링</span>
              {stageSnapshot.nextSprings ? (
                <>
                  <SpringVisualPills springs={stageSnapshot.nextSprings} />
                  <span className="pf-ds-keycap" data-testid="member-stage-next-springs">
                    {stageSnapshot.nextSprings}
                  </span>
                </>
              ) : (
                <span className="pf-ds-keycap" data-testid="member-stage-next-springs">
                  변경 없음
                </span>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="pf-member-stage__waiting" data-testid="member-stage-waiting">
          <h2 className="pf-member-stage__waiting-title">강사 기기의 수업을 기다리고 있습니다</h2>
          <p className="pf-member-stage__waiting-desc">
            강사 화면에서 방 코드 <strong>{normalizedRoom}</strong>으로 수업을 시작하면 현재 동작,
            타이머, 핵심 큐 1줄, 다음 스프링만 깔끔하게 표시됩니다. 강사 개인 메모는 표시되지
            않습니다.
          </p>
        </div>
      )}

      <footer className="pf-member-stage__footer">
        <details className="pf-ds-details" data-testid="member-stage-webrtc-details">
          <summary className="pf-ds-details__summary">
            <span>다른 기기(강사 폰) WebRTC 코드로 직접 연결</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="pf-ds-details__body">
            <textarea
              value={offerInput}
              onChange={(event) => setOfferInput(event.target.value)}
              placeholder="강사 폰에서 복사한 Offer 코드(PF1...)를 붙여넣어 주세요"
              className="pf-ds-textarea"
              aria-label="강사 기기 Offer 코드 입력"
              data-testid="member-stage-offer-input"
            />
            <div className="pf-ds-action-row">
              <button
                type="button"
                className="pf-ds-btn pf-ds-btn--primary"
                onClick={handleAcceptOffer}
                disabled={pairingBusy || !offerInput.trim()}
                data-testid="member-stage-accept-offer-btn"
              >
                Answer 코드 만들기
              </button>
              {answerOutput ? (
                <button
                  type="button"
                  className="pf-ds-btn"
                  onClick={handleCopyAnswer}
                  data-testid="member-stage-copy-answer-btn"
                >
                  <Copy size={16} aria-hidden="true" />
                  Answer 코드 복사
                </button>
              ) : null}
            </div>
            {answerOutput ? (
              <textarea
                readOnly
                value={answerOutput}
                className="pf-ds-textarea"
                aria-label="생성된 Answer 응답 코드"
                data-testid="member-stage-answer-output"
              />
            ) : null}
            {pairingNotice ? (
              <p className="pf-ds-feedback" role="status" aria-live="polite">
                {pairingNotice}
              </p>
            ) : null}
          </div>
        </details>
      </footer>
    </div>
  );
};
