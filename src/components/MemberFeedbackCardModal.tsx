import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Share2,
  ShieldAlert,
  Smartphone,
  Square,
} from 'lucide-react';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { useManagedTimeouts } from '../hooks/useManagedTimeouts';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, PilatesExercise, SequenceStep } from '../types/pilates';
import {
  FEEDBACK_CARD_DIMENSIONS,
  INSTRUCTOR_NOTE_PRESETS,
  MEMBER_FEEDBACK_PRIVACY_NOTICE_KO,
  buildMemberFeedbackDraft,
  exportMemberFeedbackCardPng,
  formatMemberFeedbackKakaoText,
  shareOrDownloadFeedbackCard,
  triggerFeedbackCardDownload,
  type FeedbackCardRatio,
  type FeedbackExerciseLookup,
  type InstructorNotePresetId,
} from '../utils/memberFeedbackCardGenerator';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/member-feedback-card.css';

export interface MemberFeedbackCardModalProps {
  readonly open?: boolean;
  readonly onClose?: () => void;
  readonly embedded?: boolean;
  readonly sequenceTitle?: string;
  readonly steps?: readonly SequenceStep[];
  readonly exercises?: readonly PilatesExercise[];
  readonly exercisesById?: FeedbackExerciseLookup;
  readonly apparatus?: ApparatusType | 'mixed';
  readonly dateLabel?: string;
  readonly initialRatio?: FeedbackCardRatio;
}

export const MemberFeedbackCardModal: React.FC<MemberFeedbackCardModalProps> = ({
  open = true,
  onClose,
  embedded = false,
  sequenceTitle: sequenceTitleProp,
  steps: stepsProp,
  exercises: exercisesProp,
  exercisesById: exercisesByIdProp,
  apparatus: apparatusProp,
  dateLabel,
  initialRatio = '4:5',
}) => {
  const storeTitle = usePilatesStore((s) => s.activeTitle);
  const storeSteps = usePilatesStore((s) => s.activeSteps);
  const storeExercises = usePilatesStore((s) => s.exercises);
  const storeApparatus = usePilatesStore((s) => s.activeApparatus);

  const sequenceTitle = sequenceTitleProp ?? storeTitle ?? '오늘의 필라테스 수업';
  const steps = stepsProp ?? storeSteps;
  const apparatus = apparatusProp ?? storeApparatus;

  const { scheduleTimeout } = useManagedTimeouts();

  const [ratio, setRatio] = useState<FeedbackCardRatio>(initialRatio);
  const [notePresetId, setNotePresetId] = useState<InstructorNotePresetId | 'custom'>(
    INSTRUCTOR_NOTE_PRESETS[0]!.id,
  );
  const [instructorNote, setInstructorNote] = useState<string>(
    INSTRUCTOR_NOTE_PRESETS[0]!.textKo,
  );
  const [busyAction, setBusyAction] = useState<'save' | 'share' | 'copy' | null>(null);
  const [toast, setToast] = useState<{ readonly ok: boolean; readonly messageKo: string } | null>(
    null,
  );
  const [failedImages, setFailedImages] = useState<Readonly<Record<string, boolean>>>({});

  const resolvedExercisesById = useMemo(() => {
    if (exercisesByIdProp) return exercisesByIdProp;
    const map = new Map<string, PilatesExercise>();
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      map.set(ex.id, ex);
    }
    const sourceList = exercisesProp ?? storeExercises;
    for (const ex of sourceList) {
      map.set(ex.id, ex);
    }
    return map;
  }, [exercisesByIdProp, exercisesProp, storeExercises]);

  const draft = useMemo(
    () =>
      buildMemberFeedbackDraft({
        sequenceTitle,
        steps,
        exercisesById: resolvedExercisesById,
        apparatus,
        dateLabel,
        unifiedPool: WORLD_PILATES_EXERCISES,
        instructorNote,
        notePresetId,
        ratio,
      }),
    [
      sequenceTitle,
      steps,
      resolvedExercisesById,
      apparatus,
      dateLabel,
      instructorNote,
      notePresetId,
      ratio,
    ],
  );

  const dimSpec = FEEDBACK_CARD_DIMENSIONS[ratio];

  const showToast = (ok: boolean, messageKo: string) => {
    setToast({ ok, messageKo });
    scheduleTimeout(() => {
      setToast((prev) => (prev?.messageKo === messageKo ? null : prev));
    }, 4500);
  };

  const handleSelectNotePreset = (presetId: InstructorNotePresetId) => {
    const found = INSTRUCTOR_NOTE_PRESETS.find((item) => item.id === presetId);
    if (!found) return;
    setNotePresetId(presetId);
    setInstructorNote(found.textKo);
  };

  const handleSavePng = async () => {
    setBusyAction('save');
    try {
      const exported = await exportMemberFeedbackCardPng(draft);
      triggerFeedbackCardDownload(exported.blob, exported.fileName);
      showToast(
        true,
        `고해상도 PNG 카드(${exported.width}×${exported.height})를 저장했어요.`,
      );
    } catch {
      showToast(false, 'PNG 이미지를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareCard = async () => {
    setBusyAction('share');
    try {
      const result = await shareOrDownloadFeedbackCard(draft);
      showToast(result.ok, result.messageKo);
    } catch {
      showToast(false, '공유를 시작할 수 없어요. PNG 이미지 저장 버튼을 이용해 주세요.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyKakaoText = async () => {
    setBusyAction('copy');
    const text = formatMemberFeedbackKakaoText(draft);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(true, '카카오톡용 수업 정리 텍스트를 클립보드에 복사했어요.');
      } else {
        showToast(false, '이 브라우저에서는 자동 복사가 제한돼요. 이미지 저장을 이용해 주세요.');
      }
    } catch {
      showToast(false, '클립보드 복사에 실패했어요. 다시 한 번 눌러 주세요.');
    } finally {
      setBusyAction(null);
    }
  };

  if (!embedded && !open) {
    return null;
  }

  const showHomeImg =
    Boolean(draft.homePractice.artworkSrc) &&
    !failedImages[draft.homePractice.artworkSrc ?? ''];

  const content = (
    <div
      className="pf-feedback-card-studio"
      data-testid="member-feedback-card-studio"
    >
      {/* Left Column: Live Calm Atelier Preview Mirroring Canvas PNG */}
      <div className="pf-feedback-card-studio__preview-col">
        <div
          className="pf-feedback-ratio-bar"
          role="group"
          aria-label="피드백 카드 비율 선택"
          data-testid="feedback-ratio-toggle"
        >
          <button
            type="button"
            className="pf-feedback-ratio-btn"
            aria-pressed={ratio === '4:5'}
            data-testid="feedback-ratio-4-5"
            onClick={() => setRatio('4:5')}
          >
            <Square size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>4:5 피드 · 카톡</span>
          </button>
          <button
            type="button"
            className="pf-feedback-ratio-btn"
            aria-pressed={ratio === '9:16'}
            data-testid="feedback-ratio-9-16"
            onClick={() => setRatio('9:16')}
          >
            <Smartphone size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>9:16 스토리</span>
          </button>
        </div>

        <article
          className={`pf-feedback-preview-frame ${ratio === '9:16' ? 'is-story' : ''}`}
          data-ratio={ratio}
          data-testid="member-feedback-preview-card"
          aria-label={`회원 피드백 카드 실시간 미리보기 (${dimSpec.labelKo})`}
        >
          <div className="pf-feedback-preview-topbar" aria-hidden="true" />
          <div className="pf-feedback-preview-body">
            <header className="pf-feedback-preview-head">
              <div className="pf-feedback-preview-kicker-row">
                <span className="pf-feedback-preview-kicker">
                  Pilates Flow Atelier · 오늘의 수업 정리
                </span>
                <span className="pf-feedback-preview-date">{draft.dateLabel}</span>
              </div>
              <h3 className="pf-feedback-preview-title">{draft.sequenceTitle}</h3>
              <span className="pf-feedback-preview-meta">
                {draft.apparatusLabelKo}
                {draft.totalDurationMin > 0 ? ` · ${draft.totalDurationMin}분 수업` : ''}
                {draft.totalExerciseCount > 0 ? ` · 총 ${draft.totalExerciseCount}동작` : ''}
              </span>
            </header>

            {draft.highlights.length > 0 ? (
              <h4 className="pf-feedback-preview-section-title">
                오늘의 핵심 동작 ({draft.highlights.length}가지)
              </h4>
            ) : (
              <p className="pf-feedback-preview-meta">
                시퀀스에 동작을 담으면 오늘의 핵심 3동작이 자동으로 채워져요.
              </p>
            )}

            <div className="pf-feedback-preview-list" data-testid="feedback-preview-highlights">
              {draft.highlights.map((move) => {
                const showImg = Boolean(move.artworkSrc) && !failedImages[move.artworkSrc ?? ''];
                return (
                  <div
                    key={move.stepId}
                    className="pf-feedback-preview-move"
                    data-testid={`feedback-highlight-${move.exerciseId}`}
                  >
                    <div
                      className={`pf-feedback-preview-thumb-wrap ${showImg ? 'has-image' : ''}`}
                    >
                      {showImg && move.artworkSrc ? (
                        <img
                          className="pf-feedback-preview-thumb"
                          src={move.artworkSrc}
                          alt={`${move.nameKo} 3D 동작 도해`}
                          loading="lazy"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [move.artworkSrc!]: true,
                            }))
                          }
                        />
                      ) : (
                        <>
                          <span className="pf-feedback-preview-fallback-num">
                            0{move.orderNumber}
                          </span>
                          <span className="pf-feedback-preview-fallback-sub">
                            {move.apparatusLabelKo}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pf-feedback-preview-move-info">
                      <span className="pf-feedback-preview-phase">{move.phaseTagKo}</span>
                      <h5 className="pf-feedback-preview-move-name">{move.nameKo}</h5>
                      <p className="pf-feedback-preview-cue">{move.cueLineKo}</p>
                      <p className="pf-feedback-preview-breath">호흡 · {move.breathPatternKo}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pf-feedback-preview-home" data-testid="feedback-preview-home-practice">
              <div
                className={`pf-feedback-preview-thumb-wrap ${showHomeImg ? 'has-image' : ''}`}
              >
                {showHomeImg && draft.homePractice.artworkSrc ? (
                  <img
                    className="pf-feedback-preview-thumb"
                    src={draft.homePractice.artworkSrc}
                    alt={`${draft.homePractice.nameKo} 홈트 도해`}
                    loading="lazy"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [draft.homePractice.artworkSrc!]: true,
                      }))
                    }
                  />
                ) : (
                  <>
                    <span className="pf-feedback-preview-fallback-num">3분</span>
                    <span className="pf-feedback-preview-fallback-sub">매트 홈트</span>
                  </>
                )}
              </div>
              <div className="pf-feedback-preview-move-info">
                <span className="pf-feedback-preview-home-badge">
                  오늘의 3분 홈트 · {draft.homePractice.durationLabelKo}
                </span>
                <h5 className="pf-feedback-preview-move-name">{draft.homePractice.nameKo}</h5>
                <p className="pf-feedback-preview-cue">{draft.homePractice.cueLineKo}</p>
                <p className="pf-feedback-preview-breath">{draft.homePractice.tipKo}</p>
              </div>
            </div>

            <div className="pf-feedback-preview-note" data-testid="feedback-preview-note">
              <span className="pf-feedback-preview-note-kicker">강사 한마디</span>
              <p className="pf-feedback-preview-note-text">
                {draft.instructorNote.trim() || INSTRUCTOR_NOTE_PRESETS[0]!.textKo}
              </p>
            </div>

            <span className="pf-feedback-preview-foot">
              Pilates Flow Atelier · 내 몸의 속도와 호흡에 맞춰 이어 가세요
            </span>
          </div>
        </article>

        <p className="pf-feedback-ratio-caption" data-testid="feedback-dimension-label">
          출력 해상도: {dimSpec.labelKo}
        </p>
      </div>

      {/* Right Column: Note Presets, Editor, Privacy Notice & 3 One-Tap Actions */}
      <div className="pf-feedback-card-studio__controls-col">
        <div className="pf-feedback-control-card">
          <h3 className="pf-feedback-control-title">강사 한마디 빠른 선택</h3>
          <div
            className="pf-feedback-preset-row"
            role="group"
            aria-label="강사 한마디 프리셋 3종"
            data-testid="feedback-note-presets"
          >
            {INSTRUCTOR_NOTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="pf-feedback-preset-btn"
                aria-pressed={notePresetId === preset.id}
                data-testid={`feedback-note-preset-${preset.id}`}
                onClick={() => handleSelectNotePreset(preset.id)}
              >
                {preset.labelKo}
              </button>
            ))}
          </div>

          <label className="pf-feedback-control-title" htmlFor="pf-feedback-note-textarea">
            직접 편집 (카드에 실시간 반영)
          </label>
          <textarea
            id="pf-feedback-note-textarea"
            className="pf-feedback-textarea"
            data-testid="feedback-note-textarea"
            value={instructorNote}
            maxLength={220}
            onChange={(event) => {
              setNotePresetId('custom');
              setInstructorNote(event.target.value);
            }}
            placeholder="오늘 수업에서 좋았던 움직임이나 가벼운 홈트 격려를 적어 주세요."
          />

          <p
            className={`pf-feedback-privacy-notice ${draft.privacyWarningKo ? 'is-warning' : ''}`}
            role={draft.privacyWarningKo ? 'alert' : 'note'}
            data-testid="feedback-privacy-notice"
          >
            {draft.privacyWarningKo ? (
              <AlertTriangle size={16} strokeWidth={1.7} aria-hidden="true" />
            ) : (
              <ShieldAlert size={16} strokeWidth={1.6} aria-hidden="true" />
            )}
            <span>{draft.privacyWarningKo ?? MEMBER_FEEDBACK_PRIVACY_NOTICE_KO}</span>
          </p>
        </div>

        <div className="pf-feedback-actions">
          <button
            type="button"
            className="pf-feedback-action-btn pf-feedback-action-btn--primary"
            data-testid="feedback-save-png-btn"
            disabled={busyAction !== null}
            onClick={handleSavePng}
          >
            <Download size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>{busyAction === 'save' ? 'PNG 카드 만드는 중…' : 'PNG 이미지 저장'}</span>
          </button>

          <div className="pf-feedback-action-row">
            <button
              type="button"
              className="pf-feedback-action-btn"
              data-testid="feedback-share-btn"
              disabled={busyAction !== null}
              onClick={handleShareCard}
            >
              <Share2 size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>{busyAction === 'share' ? '공유 준비 중…' : '공유하기'}</span>
            </button>

            <button
              type="button"
              className="pf-feedback-action-btn"
              data-testid="feedback-copy-kakao-btn"
              disabled={busyAction !== null}
              onClick={handleCopyKakaoText}
            >
              <Copy size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>카카오톡용 텍스트 복사</span>
            </button>
          </div>
        </div>

        {toast && (
          <p
            className={`pf-feedback-toast ${toast.ok ? '' : 'is-error'}`}
            role={toast.ok ? 'status' : 'alert'}
            aria-live={toast.ok ? 'polite' : 'assertive'}
            data-testid="feedback-action-toast"
          >
            {toast.ok ? (
              <Check size={16} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <AlertTriangle size={16} strokeWidth={1.7} aria-hidden="true" />
            )}
            <span>{toast.messageKo}</span>
          </p>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose ?? (() => {})}
      title="수업 후 10초 회원 피드백 카드"
      subtitle="핵심 3동작과 안전한 3분 홈트를 카톡·스토리용 PNG 카드로 바로 저장해요"
      maxWidth="960px"
      variant="sheet"
      className="pf-feedback-card-dialog"
    >
      {content}
    </LightDismissDialog>
  );
};
