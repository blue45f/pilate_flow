import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Printer, QrCode, ShieldCheck, Upload } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { PfBadge, PfButton } from '../design-system';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import { BRAND_SPRING_OPTIONS } from '../utils/brandSpringConverter';
import {
  type DecodedSharedSequence,
  buildSequenceShareUrl,
  generateLocalQrCodeSvg,
} from '../utils/localQrSequenceShare';
import { formatDifficultyBadgeKo } from '../utils/memberBookingBridge';
import { formatSecondsToMMSS, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
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

export const SequenceQrShareDialog: React.FC<SequenceQrShareDialogProps> = ({
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
  const [includeInstructorNotes, setIncludeInstructorNotes] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const shareBundle = useMemo(() => {
    try {
      const built = buildSequenceShareUrl({
        title,
        subtitle,
        apparatus,
        level,
        targetMinutes,
        reformerBrand,
        steps,
        exercises,
        includeInstructorNotes,
      });
      const qr = generateLocalQrCodeSvg(built.shareUrl);
      return {
        ok: true as const,
        shareUrl: built.shareUrl,
        hashFragment: built.hashFragment,
        qr,
        errorMessage: null,
      };
    } catch (err) {
      return {
        ok: false as const,
        shareUrl: '',
        hashFragment: '',
        qr: null,
        errorMessage:
          err instanceof Error ? err.message : '시퀀스 분량이 커서 로컬 QR 용량을 초과했습니다.',
      };
    }
  }, [
    title,
    subtitle,
    apparatus,
    level,
    targetMinutes,
    reformerBrand,
    steps,
    exercises,
    includeInstructorNotes,
  ]);

  if (!open) return null;

  const durations = getSequenceDurations([...steps]);
  const moveCount = steps.filter((s) => !isRestStep(s)).length;
  const apparatusKo =
    apparatus === 'mixed' ? '복합 기구' : (APPARATUS_LABELS[apparatus]?.ko ?? apparatus);
  const brandLabelKo =
    BRAND_SPRING_OPTIONS.find((b) => b.id === reformerBrand)?.shortLabelKo ?? '국내 5스프링';

  const handleCopyShareUrl = async () => {
    if (!shareBundle.ok) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareBundle.shareUrl);
        setCopyStatus('공유 링크를 클립보드에 복사했습니다.');
        return;
      }
    } catch {
      // Fall back to prompt/select notice below
    }
    setCopyStatus('아래 공유 주소 입력란을 길게 눌러 복사해 주세요.');
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="태블릿·모바일 무서버 로컬 QR 시퀀스 공유"
      subtitle="외부 서버 업로드·계정 로그인·비용 없이 기기 간 카메라 스캔으로 수업안을 전달합니다."
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

        {shareBundle.ok && shareBundle.qr ? (
          <div className="pf-qr-share-modal__canvas" data-testid="local-qr-share-svg">
            <div
              className="pf-qr-share-modal__svg-box"
              dangerouslySetInnerHTML={{ __html: shareBundle.qr.svgMarkup }}
            />
            <small className="muted">
              ISO/IEC 18004 표준 로컬 생성 (Version {shareBundle.qr.version} · {shareBundle.qr.size}
              ×{shareBundle.qr.size} 모듈 · 네트워크 호출 0건)
            </small>
          </div>
        ) : (
          <p className="status error" role="alert">
            {shareBundle.errorMessage}
          </p>
        )}

        <label className="pf-qr-share-modal__toggle">
          <input
            type="checkbox"
            data-testid="qr-share-include-notes-toggle"
            checked={includeInstructorNotes}
            onChange={(e) => setIncludeInstructorNotes(e.target.checked)}
          />
          <span>강사 개인 티칭 메모 포함하기 (기본 해제 · 회원 개인정보는 포함하지 마세요)</span>
        </label>

        {shareBundle.ok && (
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
              {copyStatus ? (
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
            {copyStatus}
          </p>
        )}

        <p className="pf-qr-share-modal__privacy">
          <ShieldCheck size={15} aria-hidden="true" /> 공유 데이터는 서버로 전송되지 않고 URL 해시(
          <code>#pf_share=…</code>) 안에만 담깁니다. 수업실 아이패드 카메라로 스캔하면 기존 초안을
          보존(되돌리기 지원)한 채 바로 열 수 있습니다.
        </p>

        <div className="pf-member-dialog-actions">
          <PfButton variant="secondary" onClick={onClose}>
            닫기
          </PfButton>
          <PfButton
            variant="ghost"
            onClick={() => {
              if (!shareBundle.ok || !shareBundle.qr) return;
              const blob = new Blob([shareBundle.qr.svgMarkup], {
                type: 'image/svg+xml;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `${(title || 'pilates-sequence').replace(/[\\/:*?"<>|]/g, '-')}-qr.svg`;
              anchor.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={15} aria-hidden="true" /> QR SVG 저장
          </PfButton>
          <PfButton variant="primary" onClick={() => window.print()}>
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
}

export const SequenceQrImportDialog: React.FC<SequenceQrImportDialogProps> = ({
  sharedSequence,
  onDismiss,
  onImported,
}) => {
  const exercises = usePilatesStore((s) => s.exercises);
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  if (!sharedSequence) return null;

  const durations = getSequenceDurations(sharedSequence.steps);
  const moveSteps = sharedSequence.steps.filter((s) => !isRestStep(s));
  const apparatusKo =
    sharedSequence.apparatus === 'mixed'
      ? '복합 기구'
      : (APPARATUS_LABELS[sharedSequence.apparatus]?.ko ?? sharedSequence.apparatus);
  const brandLabelKo =
    BRAND_SPRING_OPTIONS.find((b) => b.id === sharedSequence.reformerBrand)?.shortLabelKo ??
    '국내 5스프링';

  const handleConfirmImport = () => {
    const current = usePilatesStore.getState();
    const nextUndoStack = [...current.undoStack.slice(-19), createSequenceSnapshot(current)];

    usePilatesStore.setState({
      activeSequenceId: `shared-seq-${Date.now()}`,
      activeTitle: sharedSequence.title,
      activeSubtitle: sharedSequence.subtitle || 'QR 공유로 불러온 수업안',
      activeApparatus: sharedSequence.apparatus,
      activeLevel: sharedSequence.level,
      activeTargetMinutes: sharedSequence.targetMinutes,
      activeTargetGroupId: '',
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
    onImported?.();
  };

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
            <QrCode size={12} aria-hidden="true" /> 로컬 QR 공유 수신
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
          {sharedSequence.steps.slice(0, 6).map((step, idx) => {
            const rest = isRestStep(step);
            const ex = !rest ? exerciseMap.get(step.exerciseId) : undefined;
            const nameKo = rest
              ? '중간 휴식'
              : (ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? step.exerciseId);
            return (
              <li key={step.stepId}>
                <span>{String(idx + 1).padStart(2, '0')}</span>
                <strong>{nameKo}</strong>
                <small>{step.durationMin}분</small>
              </li>
            );
          })}
          {sharedSequence.steps.length > 6 && (
            <li className="is-more">외 {sharedSequence.steps.length - 6}개 순서 포함</li>
          )}
        </ol>

        <p className="pf-qr-share-modal__privacy">
          작성 중이던 기존 수업 초안이 있으면 작업대 ‘되돌리기’에 자동 보관된 뒤 불러옵니다. 수업 전
          기구 상태와 스프링 장력은 현장에서 직접 확인해 주세요.
        </p>

        <div className="pf-member-dialog-actions">
          <PfButton variant="secondary" onClick={onDismiss}>
            취소
          </PfButton>
          <PfButton
            variant="primary"
            data-testid="confirm-qr-sequence-import-btn"
            onClick={handleConfirmImport}
          >
            <Upload size={15} aria-hidden="true" /> 작업대에 안전하게 불러오기
          </PfButton>
        </div>
      </div>
    </LightDismissDialog>
  );
};
