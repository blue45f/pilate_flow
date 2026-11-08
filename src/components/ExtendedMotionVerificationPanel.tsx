import React, { useId, useRef, useState } from 'react';
import {
  EXTENDED_CANDIDATE_JOINT_KEYS,
  resolveExtendedCandidateMotionModel,
  resolveExtendedMotionSourceAudit,
  type ExtendedCandidatePhaseId,
} from '../data/extendedMotionVerificationCatalog';
import type { PilatesExercise } from '../types/pilates';

export interface ExtendedMotionVerificationPanelProps {
  readonly exercise: PilatesExercise & { readonly verifiedReferenceId?: string };
}

const PHASE_TABS: readonly {
  readonly id: ExtendedCandidatePhaseId;
  readonly labelKo: string;
  readonly progressPercent: number;
}[] = [
  { id: 'start', labelKo: '1단계 · 시작 (0%)', progressPercent: 0 },
  { id: 'middle', labelKo: '2단계 · 정점 (50%)', progressPercent: 50 },
  { id: 'end', labelKo: '3단계 · 복귀 (100%)', progressPercent: 100 },
] as const;

export function ExtendedMotionVerificationPanel({
  exercise,
}: ExtendedMotionVerificationPanelProps) {
  const baseId = useId();
  const [progressPercent, setProgressPercent] = useState<number>(50);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const candidateModel = resolveExtendedCandidateMotionModel(exercise.id);
  const auditBundle = resolveExtendedMotionSourceAudit(exercise);

  const normalizedProgress = Math.max(0, Math.min(1, progressPercent / 100));
  const pose = candidateModel ? candidateModel.samplePose(normalizedProgress) : null;

  const activePhaseIndex =
    pose?.phaseId === 'start' ? 0 : pose?.phaseId === 'middle' ? 1 : 2;

  const selectPhaseIndex = (index: number, focusTab = false) => {
    const safeIndex = ((index % PHASE_TABS.length) + PHASE_TABS.length) % PHASE_TABS.length;
    const targetTab = PHASE_TABS[safeIndex];
    setProgressPercent(targetTab.progressPercent);
    if (focusTab) {
      tabRefs.current[safeIndex]?.focus();
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectPhaseIndex(currentIndex + 1, true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectPhaseIndex(currentIndex - 1, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectPhaseIndex(0, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectPhaseIndex(PHASE_TABS.length - 1, true);
    }
  };

  return (
    <section
      data-testid="extended-motion-verification-panel"
      aria-label={`${exercise.nameKo} 확장 모션 도해 및 출처 대조 원장`}
      style={{
        marginTop: '14px',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        color: '#0f172a',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
            출처·근거 대조 원장 &amp; 후보 모션 초안 기록
          </strong>
          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
            {auditBundle.verificationBoundaryNoticeKo} · 기준일 {auditBundle.checkedAt}
          </div>
        </div>
        <span
          data-testid="extended-factual-sha256-badge"
          style={{
            fontSize: '0.74rem',
            fontFamily: 'monospace',
            padding: '4px 8px',
            borderRadius: '999px',
            background: '#e2e8f0',
            color: '#1e293b',
          }}
        >
          SHA-256: {auditBundle.primaryFactualRecordSha256.slice(0, 16)}…
        </span>
      </div>

      {candidateModel && pose && (
        <div
          data-testid="extended-candidate-motion-section"
          style={{
            marginBottom: '14px',
            padding: '14px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #dbeafe',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#dbeafe',
                  color: '#1e40af',
                  marginRight: '8px',
                }}
              >
                후보 매트 모션 도해 ({candidateModel.candidateId})
              </span>
              <strong style={{ fontSize: '0.9rem' }}>{candidateModel.titleKo}</strong>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#334155' }}>
              진행률: <strong>{progressPercent}%</strong> · {pose.phaseLabelKo}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="3단계 동작 국면 선택"
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            {PHASE_TABS.map((tab, idx) => {
              const isSelected = activePhaseIndex === idx;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={`${baseId}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`${baseId}-motion-tabpanel`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => selectPhaseIndex(idx)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                    background: isSelected ? '#ccfbf1' : '#f8fafc',
                    color: isSelected ? '#115e59' : '#334155',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {tab.labelKo}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <label
              htmlFor={`${baseId}-progress-range`}
              style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}
            >
              연속 동작 진행률 조절 ({progressPercent}%)
            </label>
            <input
              id={`${baseId}-progress-range`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={progressPercent}
              aria-label="연속 동작 진행률 조절"
              onChange={(e) => setProgressPercent(Number(e.target.value))}
              style={{ flex: 1, minHeight: '44px', minWidth: '140px' }}
            />
          </div>

          <div id={`${baseId}-motion-tabpanel`} role="tabpanel">
            <svg
              data-testid="extended-candidate-motion-svg"
              data-candidate-id={candidateModel.candidateId}
              data-exercise-id={candidateModel.exerciseId}
              data-phase-id={pose.phaseId}
              data-progress={pose.progress}
              viewBox={candidateModel.viewBox}
              role="img"
              aria-label={`${candidateModel.titleKo} ${pose.phaseLabelKo} 진행률 ${progressPercent}% 도해`}
              style={{
                width: '100%',
                maxHeight: '240px',
                borderRadius: '10px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
              }}
            >
              <title>{`${candidateModel.titleKo} · ${pose.phaseLabelKo} (${progressPercent}%)`}</title>
              <defs>
                <marker
                  id={`${baseId}-arrow-head`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
                </marker>
              </defs>

              {/* Mat baseline */}
              <line
                x1={70}
                y1={252}
                x2={590}
                y2={252}
                stroke="#64748b"
                strokeWidth={4}
                strokeLinecap="round"
              />

              {/* Spine & Trunk chain */}
              <polyline
                fill="none"
                stroke="#0f766e"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={[
                  `${pose.joints.head.x},${pose.joints.head.y}`,
                  `${pose.joints.neck.x},${pose.joints.neck.y}`,
                  `${pose.joints.shoulder.x},${pose.joints.shoulder.y}`,
                  `${pose.joints.thoracic.x},${pose.joints.thoracic.y}`,
                  `${pose.joints.lumbar.x},${pose.joints.lumbar.y}`,
                  `${pose.joints.pelvis.x},${pose.joints.pelvis.y}`,
                ].join(' ')}
              />

              {/* Lower limb chain */}
              <polyline
                fill="none"
                stroke="#1e40af"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={[
                  `${pose.joints.pelvis.x},${pose.joints.pelvis.y}`,
                  `${pose.joints.hip.x},${pose.joints.hip.y}`,
                  `${pose.joints.knee.x},${pose.joints.knee.y}`,
                  `${pose.joints.ankle.x},${pose.joints.ankle.y}`,
                  `${pose.joints.heel.x},${pose.joints.heel.y}`,
                  `${pose.joints.toe.x},${pose.joints.toe.y}`,
                ].join(' ')}
              />

              {/* Upper limb chain */}
              <polyline
                fill="none"
                stroke="#7c3aed"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={[
                  `${pose.joints.shoulder.x},${pose.joints.shoulder.y}`,
                  `${pose.joints.elbow.x},${pose.joints.elbow.y}`,
                  `${pose.joints.wrist.x},${pose.joints.wrist.y}`,
                  `${pose.joints.hand.x},${pose.joints.hand.y}`,
                ].join(' ')}
              />

              {/* Head circle */}
              <circle
                cx={pose.joints.head.x}
                cy={pose.joints.head.y}
                r={12}
                fill="#ccfbf1"
                stroke="#0f766e"
                strokeWidth={2.5}
              />

              {/* All 14 joints */}
              <g data-testid="extended-motion-joints">
                {EXTENDED_CANDIDATE_JOINT_KEYS.map((jointKey) => {
                  const pt = pose.joints[jointKey];
                  return (
                    <circle
                      key={jointKey}
                      data-joint={jointKey}
                      cx={pt.x}
                      cy={pt.y}
                      r={3.5}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>

              {/* Support contact anchors */}
              <g data-testid="extended-motion-support-anchors">
                {pose.supportAnchors.map((anchor) => (
                  <g key={anchor.id} data-support-anchor-id={anchor.id}>
                    <rect
                      x={anchor.x - 5}
                      y={anchor.y - 5}
                      width={10}
                      height={10}
                      rx={2}
                      fill={anchor.state === 'fixed-contact' ? '#0f766e' : '#f59e0b'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                    <title>{`${anchor.labelKo} (${anchor.state})`}</title>
                  </g>
                ))}
              </g>

              {/* Trajectory vector arrows */}
              <g data-testid="extended-motion-vector-arrows">
                {pose.vectorArrows.map((arrow) => (
                  <g key={arrow.id} data-vector-arrow-id={arrow.id}>
                    <line
                      x1={arrow.from.x}
                      y1={arrow.from.y}
                      x2={arrow.to.x}
                      y2={arrow.to.y}
                      stroke={arrow.color}
                      strokeWidth={2.5}
                      strokeDasharray="4 2"
                      markerEnd={`url(#${baseId}-arrow-head)`}
                    />
                    <title>{arrow.labelKo}</title>
                  </g>
                ))}
              </g>
            </svg>

            <p
              data-testid="extended-motion-phase-cue"
              style={{
                marginTop: '8px',
                marginBottom: '6px',
                fontSize: '0.82rem',
                color: '#1e293b',
              }}
            >
              <strong>국면 큐:</strong> {pose.phaseCueKo}
            </p>
            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
              <strong>지지 앵커:</strong>{' '}
              {pose.supportAnchors.map((a) => a.labelKo).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* 출처·근거 대조 원장 요약 (Rendered for ALL exercises) */}
      <div
        data-testid="extended-source-audit-summary"
        style={{
          padding: '12px',
          borderRadius: '10px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          fontSize: '0.82rem',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
          출처·근거 대조 원장 요약 ({exercise.id})
        </div>

        {auditBundle.verifiedReferenceAuditRecord && (
          <div
            data-testid="verified-reference-audit-card"
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '8px',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <div style={{ overflowWrap: 'anywhere' }}>
              <strong>출처 레퍼런스 대장 ID:</strong>{' '}
              <code>{auditBundle.verifiedReferenceAuditRecord.referenceId}</code> (
              {auditBundle.verifiedReferenceAuditRecord.originalVerificationStatus} →{' '}
              <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                {auditBundle.verifiedReferenceAuditRecord.auditConclusionStatus}
              </code>
              )
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong>원문/출처:</strong> {auditBundle.verifiedReferenceAuditRecord.publisher} ·{' '}
              <a
                href={auditBundle.verifiedReferenceAuditRecord.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '44px',
                  padding: '6px 0',
                  overflowWrap: 'anywhere',
                }}
              >
                {auditBundle.verifiedReferenceAuditRecord.titleKo} (
                {auditBundle.verifiedReferenceAuditRecord.originalTitle})
              </a>
            </div>
            <div style={{ marginTop: '3px', color: '#166534' }}>
              {auditBundle.verifiedReferenceAuditRecord.reviewedScopeKo} ·{' '}
              {auditBundle.verifiedReferenceAuditRecord.biomechanicalAlignmentNoteKo}
            </div>
            <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#475569' }}>
              레코드 SHA-256:{' '}
              <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                {auditBundle.verifiedReferenceAuditRecord.factualRecordSha256}
              </code>
            </div>
          </div>
        )}

        {auditBundle.clearedYoutubeReplacementAudit && (
          <div
            data-testid="cleared-youtube-replacement-audit-card"
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              marginBottom: '8px',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <div>
              <strong>
                오연결 YouTube 제거 및 대체 출처 대조 기록 (
                {auditBundle.clearedYoutubeReplacementAudit.exerciseId}):
              </strong>
            </div>
            <div style={{ marginTop: '3px', color: '#92400e' }}>
              {auditBundle.clearedYoutubeReplacementAudit.clearedReasonKo}
            </div>
            <ul style={{ margin: '6px 0 4px 18px', padding: 0 }}>
              {auditBundle.clearedYoutubeReplacementAudit.replacementReferences.map((ref) => (
                <li key={ref.referenceId} style={{ marginBottom: '4px' }}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '44px',
                      padding: '6px 0',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    [{ref.referenceId}] {ref.publisher} — {ref.title}
                  </a>{' '}
                  ({ref.alignmentNoteKo})
                </li>
              ))}
            </ul>
            <div style={{ fontSize: '0.75rem', color: '#475569' }}>
              대체 감사 SHA-256:{' '}
              <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                {auditBundle.clearedYoutubeReplacementAudit.factualRecordSha256}
              </code>
            </div>
          </div>
        )}

        {auditBundle.previouslyUnboundMotionModel && (
          <div
            data-testid="previously-unbound-model-audit-card"
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              marginBottom: '8px',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <div>
              <strong>
                연속 모션 도해 원문 바인딩 ({auditBundle.previouslyUnboundMotionModel.modelId}):
              </strong>{' '}
              {auditBundle.previouslyUnboundMotionModel.titleKo}
            </div>
            <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#1e3a8a' }}>
              바인딩 SHA-256:{' '}
              <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                {auditBundle.previouslyUnboundMotionModel.factualRecordSha256}
              </code>
            </div>
          </div>
        )}

        <div
          data-testid="extended-verification-boundary-notice"
          style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px dashed #cbd5e1',
            fontSize: '0.76rem',
            color: '#475569',
            overflowWrap: 'anywhere',
          }}
        >
          전문의·외부 임상 승인 0건 · 해부학적 정밀성 가정 안 함 · 원장 레코드 SHA-256 해시 일치:{' '}
          <strong>
            {auditBundle.sha256IntegrityVerified
              ? '일치 (내용 정확성·전문가 검증 아님)'
              : '불일치'}
          </strong>{' '}
          (
          <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
            {auditBundle.primaryFactualRecordSha256}
          </code>
          )
        </div>
      </div>
    </section>
  );
}
