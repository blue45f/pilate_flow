import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useManagedTimeouts } from '../hooks/useManagedTimeouts';
import { Check, Copy, Download, Printer, QrCode, ShieldCheck, Upload } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { PfBadge, PfButton } from '../design-system';
import {
  commitSharedSequenceImport,
  createSequenceSnapshot,
  downloadEmergencyBackupJson,
  protectSharedSequenceReview,
  sharedSequenceStorageIssue,
  usePilatesStore,
} from '../store/usePilatesStore';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import { BRAND_SPRING_OPTIONS } from '../utils/brandSpringConverter';
import { type DecodedSharedSequence, prepareSequenceShare } from '../utils/localQrSequenceShare';
import { formatDifficultyBadgeKo } from '../utils/memberBookingBridge';
import { formatSecondsToMMSS, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import { reconstructExerciseFromSnapshot } from '../utils/hierarchyModel';
import { LightDismissDialog } from './LightDismissDialog';

export interface SequenceQrShareDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly targetMinutes: number;
  readonly reformerBrand?: ReformerBrand;
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
}

export const SequenceQrShareDialog: React.FC<SequenceQrShareDialogProps> = (props) =>
  props.open ? <OpenSequenceQrShareDialog {...props} /> : null;

const OpenSequenceQrShareDialog: React.FC<SequenceQrShareDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  apparatus,
  level,
  targetMinutes,
  reformerBrand = 'intopilates',
  steps,
  exercises,
}) => {
  const { scheduleTimeout } = useManagedTimeouts();
  const [includeInstructorNotes, setIncludeInstructorNotes] = useState(false);
  const [copied, setCopied] = useState<{ url: string; succeeded: boolean } | null>(null);

  const shareBundle = useMemo(
    () =>
      prepareSequenceShare({
        title,
        subtitle,
        apparatus,
        level,
        targetMinutes,
        reformerBrand,
        steps,
        exercises,
        includeInstructorNotes,
      }),
    [
      title,
      subtitle,
      apparatus,
      level,
      targetMinutes,
      reformerBrand,
      steps,
      exercises,
      includeInstructorNotes,
    ],
  );

  const copyStatus = copied?.url === shareBundle.shareUrl ? copied : null;
  const durations = getSequenceDurations([...steps]);
  const moveCount = steps.filter((s) => !isRestStep(s)).length;
  const apparatusKo =
    apparatus === 'mixed' ? '복합 기구' : (APPARATUS_LABELS[apparatus]?.ko ?? apparatus);
  const brandLabelKo =
    BRAND_SPRING_OPTIONS.find((b) => b.id === reformerBrand)?.shortLabelKo ?? '국내 5스프링';

  const handleCopyShareUrl = async () => {
    if (!shareBundle.shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareBundle.shareUrl);
        setCopied({ url: shareBundle.shareUrl, succeeded: true });
        return;
      }
    } catch {
      // Fall back to prompt/select notice below
    }
    setCopied({ url: shareBundle.shareUrl, succeeded: false });
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="다른 기기에 수업 보내기"
      subtitle="공유 링크를 열거나 QR 코드를 스캔해 수업안을 확인할 수 있습니다."
      maxWidth="540px"
    >
      <div className="pf-qr-share-modal" data-testid="sequence-qr-share-dialog">
        <div className="pf-class-badges-strip">
          <span className="pf-class-apparatus-pill">{apparatusKo}</span>
          <PfBadge tone="sage">{formatDifficultyBadgeKo(level)}</PfBadge>
          <PfBadge tone="brand">
            동작 {moveCount}개 · {formatSecondsToMMSS(durations.totalSec)}
          </PfBadge>
          <PfBadge tone="neutral">스프링 기준: {brandLabelKo}</PfBadge>
        </div>

        <strong className="pf-qr-share-modal__title">{title || '현재 수업 시퀀스'}</strong>

        {shareBundle.qr &&
          createPortal(
            <section className="pf-qr-print-sheet">
              <h1>{title || '현재 수업 시퀀스'}</h1>
              <p>
                {apparatusKo} · 동작 {moveCount}개 · {formatSecondsToMMSS(durations.totalSec)}
              </p>
              <div dangerouslySetInnerHTML={{ __html: shareBundle.qr.svgMarkup }} />
            </section>,
            document.body,
          )}
        {shareBundle.qr ? (
          <div className="pf-qr-share-modal__canvas" data-testid="local-qr-share-svg">
            <div
              className="pf-qr-share-modal__svg-box"
              dangerouslySetInnerHTML={{ __html: shareBundle.qr.svgMarkup }}
            />
            <small className="muted">인터넷 전송 없이 이 기기에서 바로 만든 QR 코드입니다</small>
          </div>
        ) : (
          <p
            className={shareBundle.shareUrl ? 'status' : 'status error'}
            role={shareBundle.shareUrl ? 'status' : 'alert'}
          >
            {shareBundle.message}
          </p>
        )}

        <label className="pf-qr-share-modal__toggle">
          <input
            type="checkbox"
            data-testid="qr-share-include-notes-toggle"
            checked={includeInstructorNotes}
            onChange={(e) => {
              setIncludeInstructorNotes(e.target.checked);
              setCopied(null);
            }}
          />
          <span>강사 개인 티칭 메모 포함하기 (기본 해제 · 회원 개인정보는 포함하지 마세요)</span>
        </label>

        {shareBundle.shareUrl && (
          <div className="pf-qr-share-modal__url-row">
            <input
              type="text"
              readOnly
              aria-label="로컬 시퀀스 공유 링크"
              data-testid="qr-share-url-input"
              value={shareBundle.shareUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            <PfButton
              variant="secondary"
              data-testid="qr-share-copy-btn"
              onClick={() => void handleCopyShareUrl()}
            >
              {copyStatus?.succeeded ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Copy size={15} aria-hidden="true" />
              )}{' '}
              링크 복사
            </PfButton>
          </div>
        )}

        {copyStatus && (
          <p className="status" role="status" data-testid="qr-share-copy-status">
            {copyStatus.succeeded
              ? '공유 링크를 클립보드에 복사했습니다.'
              : '공유 주소 입력란을 선택한 뒤 직접 복사해 주세요.'}
          </p>
        )}

        <p className="pf-qr-share-modal__privacy">
          <ShieldCheck size={15} aria-hidden="true" /> 링크를 받은 사람은 수업안 내용을 볼 수
          있습니다. 받는 기기에서 내용을 확인하고 불러오면 이전 초안은 되돌리기에 보관됩니다.
        </p>

        <div className="pf-member-dialog-actions">
          <PfButton variant="secondary" onClick={onClose}>
            닫기
          </PfButton>
          <PfButton
            variant="ghost"
            disabled={!shareBundle.qr}
            onClick={() => {
              if (!shareBundle.qr) return;
              const blob = new Blob([shareBundle.qr.svgMarkup], {
                type: 'image/svg+xml;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `${(title || 'pilates-sequence').replace(/[\\/:*?"<>|]/g, '-')}-qr.svg`;
              anchor.click();
              scheduleTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={15} aria-hidden="true" /> QR SVG 저장
          </PfButton>
          <PfButton variant="primary" disabled={!shareBundle.qr} onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" /> QR 인쇄
          </PfButton>
        </div>
      </div>
    </LightDismissDialog>
  );
};

export interface SequenceQrImportDialogProps {
  readonly sharedSequence: DecodedSharedSequence | null;
  readonly onDismiss: () => void;
  readonly onImported?: () => void;
  readonly onRequestImport?: (commit: () => void) => void;
  readonly awaitingStageExit?: boolean;
}

export const SequenceQrImportDialog: React.FC<SequenceQrImportDialogProps> = ({
  sharedSequence,
  onDismiss,
  onImported,
  onRequestImport,
  awaitingStageExit = false,
}) => {
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const [backupFeedback, setBackupFeedback] = useState('');
  useEffect(() => (sharedSequence ? protectSharedSequenceReview() : undefined), [sharedSequence]);
  const exercises = usePilatesStore((s) => s.exercises);
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  if (!sharedSequence || awaitingStageExit) return null;

  const durations = getSequenceDurations(sharedSequence.steps);
  const moveSteps = sharedSequence.steps.filter((s) => !isRestStep(s));
  const apparatusKo =
    sharedSequence.apparatus === 'mixed'
      ? '복합 기구'
      : (APPARATUS_LABELS[sharedSequence.apparatus]?.ko ?? sharedSequence.apparatus);
  const brandLabelKo =
    BRAND_SPRING_OPTIONS.find((b) => b.id === sharedSequence.reformerBrand)?.shortLabelKo ??
    '국내 5스프링';

  const restorableMovements = sharedSequence.restorableMovements ?? [];
  const knownOrRestorable = new Set([
    ...exerciseMap.keys(),
    ...restorableMovements.map((movement) => movement.id),
  ]);
  const missingCount = new Set(
    moveSteps
      .filter((step) => !knownOrRestorable.has(step.exerciseId))
      .map((step) => step.exerciseId),
  ).size;
  const canImport = () => {
    const issue = sharedSequenceStorageIssue();
    setStorageIssue(issue);
    return issue === null;
  };
  const handleConfirmImport = () => {
    const current = usePilatesStore.getState();
    const knownIds = new Set(current.exercises.map((exercise) => exercise.id));
    const missingExercises = restorableMovements
      .filter((movement) => !knownIds.has(movement.id))
      .map(reconstructExerciseFromSnapshot);
    const nextUndoStack = [
      ...current.undoStack.slice(-19),
      createSequenceSnapshot(current, current.reformerBrand !== sharedSequence.reformerBrand),
    ];

    const issue = commitSharedSequenceImport({
      activeSequenceId: `shared-seq-${Date.now()}`,
      activeTitle: sharedSequence.title,
      ...(missingExercises.length
        ? { exercises: [...current.exercises, ...missingExercises] }
        : {}),
      activeSubtitle: sharedSequence.subtitle || 'QR 공유로 불러온 수업안',
      activeApparatus: sharedSequence.apparatus,
      activeLevel: sharedSequence.level,
      activeTargetMinutes: sharedSequence.targetMinutes,
      activeTargetGroupId: '',
      activeScheduleContext: undefined,
      redoStack: [],
      lastCriteria: null,
      draftCriteria: null,
      generationError: null,
      reformerBrand: sharedSequence.reformerBrand,
      activeSteps: sharedSequence.steps.map((st, idx) => ({
        ...structuredClone(st),
        order: idx + 1,
      })),
      undoStack: nextUndoStack,
      activeTab: 'workbench',
      saveFeedback: `‘${sharedSequence.title}’ 공유 시퀀스를 작업대에 불러왔습니다. (이전 초안은 되돌리기에 보관됨)`,
    });
    if (issue) setStorageIssue(issue);
    else onImported?.();
  };

  const renderStep = (step: SequenceStep, index: number) => (
    <li key={step.stepId}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <strong>
        {isRestStep(step)
          ? '중간 휴식'
          : (exerciseMap.get(step.exerciseId)?.nameKo ??
            step.exerciseSnapshot?.nameKo ??
            step.exerciseId)}
      </strong>
      <small>{formatSecondsToMMSS(Math.round(step.durationMin * 60))}</small>
    </li>
  );

  return (
    <LightDismissDialog
      open={Boolean(sharedSequence)}
      onClose={onDismiss}
      title="QR·링크로 공유된 수업 시퀀스 확인"
      subtitle="내용을 먼저 확인한 뒤 현재 작업대에 안전하게 불러옵니다."
      maxWidth="540px"
    >
      <div className="pf-qr-share-modal" data-testid="sequence-qr-import-dialog">
        <div className="pf-class-badges-strip">
          <PfBadge tone="brand">
            <QrCode size={12} aria-hidden="true" /> QR 공유 수업안
          </PfBadge>
          <span className="pf-class-apparatus-pill">{apparatusKo}</span>
          <PfBadge tone="sage">{formatDifficultyBadgeKo(sharedSequence.level)}</PfBadge>
          <PfBadge tone="neutral">{brandLabelKo}</PfBadge>
        </div>

        <strong className="pf-qr-share-modal__title">{sharedSequence.title}</strong>
        {sharedSequence.subtitle && <p className="muted">{sharedSequence.subtitle}</p>}

        <p className="pf-qr-share-modal__meta">
          동작 <strong>{moveSteps.length}개</strong> · 계획 시간{' '}
          <strong>{formatSecondsToMMSS(durations.totalSec)}</strong> (목표{' '}
          {sharedSequence.targetMinutes}분)
        </p>

        <ol className="pf-qr-share-modal__preview-list">
          {sharedSequence.steps.slice(0, 6).map(renderStep)}
        </ol>
        {sharedSequence.steps.length > 6 && (
          <details>
            <summary>나머지 {sharedSequence.steps.length - 6}개 순서 보기</summary>
            <ol start={7} className="pf-qr-share-modal__preview-list">
              {sharedSequence.steps.slice(6).map((step, index) => renderStep(step, index + 6))}
            </ol>
          </details>
        )}
        {missingCount > 0 && (
          <p className="status">
            이 기기에서 찾을 수 없는 동작이 {missingCount}개 있습니다. 수업 시작 전에 작성 화면에서
            해당 순서를 확인해 주세요.
          </p>
        )}

        <p className="pf-qr-share-modal__privacy">
          작성 중이던 기존 수업 초안이 있으면 작업대 ‘되돌리기’에 자동 보관된 뒤 불러옵니다. 수업 전
          기구 상태와 스프링 장력은 현장에서 직접 확인해 주세요.
        </p>

        {storageIssue && (
          <div className="status error" role="alert">
            <strong>공유 수업을 가져오기 전에 저장본을 확인해 주세요.</strong>
            <p>{storageIssue}</p>
            <p>최신 저장본으로 다시 열면 이 공유 링크를 한 번 더 확인할 수 있습니다.</p>
            <PfButton variant="secondary" onClick={() => window.location.reload()}>
              최신 저장본으로 다시 열기
            </PfButton>
            <PfButton
              variant="ghost"
              onClick={() =>
                setBackupFeedback(
                  downloadEmergencyBackupJson()
                    ? '현재 탭의 백업을 내려받았습니다.'
                    : '백업을 내려받지 못했습니다.',
                )
              }
            >
              현재 탭 백업
            </PfButton>
            {backupFeedback && <p role="status">{backupFeedback}</p>}
          </div>
        )}

        <div className="pf-member-dialog-actions">
          <PfButton variant="secondary" onClick={onDismiss}>
            취소
          </PfButton>
          <PfButton
            variant="primary"
            data-testid="confirm-qr-sequence-import-btn"
            disabled={Boolean(storageIssue)}
            onClick={() => {
              if (!onRequestImport) handleConfirmImport();
              else if (canImport()) onRequestImport(handleConfirmImport);
            }}
          >
            <Upload size={15} aria-hidden="true" /> 작업대에 안전하게 불러오기
          </PfButton>
        </div>
      </div>
    </LightDismissDialog>
  );
};
