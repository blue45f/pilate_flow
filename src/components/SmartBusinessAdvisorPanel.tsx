import React, { useId, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarCheck2,
  Check,
  ClipboardCopy,
  RotateCcw,
  Sparkles,
  Undo2,
  UserCheck,
} from 'lucide-react';
import type { ApparatusType, ClassHistoryLog } from '../types/pilates';
import {
  computeStudioBusinessSummary,
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_WEEKLY_STUDIO_SLOTS,
  formatKrw,
  getApparatusLabelKo,
  recommendMakeupSlots,
  sanitizeAdvisorAliasKo,
} from '../utils/studioBusinessAdvisorEngine';
import type {
  AbsenceRequest,
  BusinessAdvisorRoleMode,
  ExerciseLevel,
  PreferredTimeBand,
  ScheduledMakeupSlot,
} from '../utils/studioBusinessAdvisorEngine';
import '../styles/smart-biz-makeup.css';

export interface SmartBusinessAdvisorPanelProps {
  readonly historyLogs?: readonly ClassHistoryLog[];
  readonly activeApparatus?: ApparatusType | 'mixed';
  readonly roleMode?: BusinessAdvisorRoleMode;
}

type AdvisorTabId = 'revenue' | 'makeup';

interface TemporaryMakeupAssignment {
  readonly assignmentId: string;
  readonly slotId: string;
  readonly slotLabelKo: string;
  readonly memberAliasKo: string;
}

const ROLE_LABELS_KO: Readonly<Record<BusinessAdvisorRoleMode, string>> = {
  freelance: '프리랜서 강사 기준',
  'solo-owner': '1인 스튜디오 기준',
  'center-manager': '다강사 센터 기준',
};

const ROLE_DEFAULT_SLOT_CAPACITY: Readonly<Record<BusinessAdvisorRoleMode, number>> = {
  freelance: 4,
  'solo-owner': 6,
  'center-manager': 10,
};

const APPARATUS_OPTIONS: ReadonlyArray<{ id: ApparatusType; labelKo: string }> = [
  { id: 'reformer', labelKo: '리포머' },
  { id: 'cadillac', labelKo: '캐딜락' },
  { id: 'chair', labelKo: '운다 체어' },
  { id: 'barrel', labelKo: '바렐' },
  { id: 'mat', labelKo: '매트' },
];

const LEVEL_OPTIONS: ReadonlyArray<{ id: ExerciseLevel; labelKo: string }> = [
  { id: '1.0', labelKo: 'Lv 1.0 입문' },
  { id: '1.5', labelKo: 'Lv 1.5 중급' },
  { id: '2.0', labelKo: 'Lv 2.0 심화' },
];

const TIME_BAND_OPTIONS: ReadonlyArray<{ id: PreferredTimeBand; labelKo: string }> = [
  { id: 'any', labelKo: '시간대 무관' },
  { id: 'morning', labelKo: '오전' },
  { id: 'afternoon', labelKo: '오후' },
  { id: 'evening', labelKo: '저녁' },
];

function resolveInitialApparatus(activeApparatus?: ApparatusType | 'mixed'): ApparatusType {
  if (activeApparatus && activeApparatus !== 'mixed') {
    return activeApparatus;
  }
  return 'reformer';
}

async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function parseNonNegativeNumber(raw: string, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export const SmartBusinessAdvisorPanel: React.FC<SmartBusinessAdvisorPanelProps> = ({
  historyLogs,
  activeApparatus,
  roleMode = 'solo-owner',
}) => {
  const uid = useId();
  const effectiveHistoryLogs = useMemo(() => historyLogs ?? [], [historyLogs]);
  const initialDailyCapacity =
    ROLE_DEFAULT_SLOT_CAPACITY[roleMode] ?? DEFAULT_BUSINESS_SETTINGS.dailyRoomSlotCapacity;

  const [activeTab, setActiveTab] = useState<AdvisorTabId>('revenue');

  // Tab 1: Revenue & utilization parameters (pure React state — never writes to localStorage on mount)
  const [groupFeePerMemberKrw, setGroupFeePerMemberKrw] = useState<number>(
    DEFAULT_BUSINESS_SETTINGS.groupFeePerMemberKrw,
  );
  const [privateFeePerSessionKrw, setPrivateFeePerSessionKrw] = useState<number>(
    DEFAULT_BUSINESS_SETTINGS.privateFeePerSessionKrw,
  );
  const [dailyRoomSlotCapacity, setDailyRoomSlotCapacity] = useState<number>(initialDailyCapacity);
  const [avgGroupAttendance, setAvgGroupAttendance] = useState<number>(
    DEFAULT_BUSINESS_SETTINGS.avgGroupAttendance,
  );
  const [briefCopied, setBriefCopied] = useState<boolean>(false);

  // Tab 2: Absence makeup state & simulated seat assignment ledger
  const [studioSlots, setStudioSlots] = useState<ScheduledMakeupSlot[]>(() =>
    DEFAULT_WEEKLY_STUDIO_SLOTS.map((slot) => ({ ...slot })),
  );
  const [memberAliasInput, setMemberAliasInput] = useState<string>('수요 오전반 회원 A');
  const [originalApparatus, setOriginalApparatus] = useState<ApparatusType>(() =>
    resolveInitialApparatus(activeApparatus),
  );
  const [originalLevel, setOriginalLevel] = useState<ExerciseLevel>('1.5');
  const [preferredTimeBand, setPreferredTimeBand] = useState<PreferredTimeBand>('any');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TemporaryMakeupAssignment[]>([]);
  const [assignmentSeq, setAssignmentSeq] = useState<number>(1);
  const [makeupStatusKo, setMakeupStatusKo] = useState<string | null>(null);

  const sanitizedAlias = useMemo(
    () => sanitizeAdvisorAliasKo(memberAliasInput),
    [memberAliasInput],
  );

  const summary = useMemo(
    () =>
      computeStudioBusinessSummary({
        historyLogs: effectiveHistoryLogs,
        scheduledSessions: studioSlots,
        groupFeePerMemberKrw,
        privateFeePerSessionKrw,
        dailyRoomSlotCapacity,
        avgGroupAttendance,
      }),
    [
      effectiveHistoryLogs,
      studioSlots,
      groupFeePerMemberKrw,
      privateFeePerSessionKrw,
      dailyRoomSlotCapacity,
      avgGroupAttendance,
    ],
  );

  const absenceRequest: AbsenceRequest = useMemo(
    () => ({
      memberAliasKo: memberAliasInput,
      originalApparatus,
      originalLevel,
      preferredTimeBand,
      reasonKo: reasonInput.trim() || undefined,
    }),
    [memberAliasInput, originalApparatus, originalLevel, preferredTimeBand, reasonInput],
  );

  const recommendations = useMemo(
    () => recommendMakeupSlots(absenceRequest, studioSlots),
    [absenceRequest, studioSlots],
  );

  const handleResetBusinessInputs = () => {
    setGroupFeePerMemberKrw(DEFAULT_BUSINESS_SETTINGS.groupFeePerMemberKrw);
    setPrivateFeePerSessionKrw(DEFAULT_BUSINESS_SETTINGS.privateFeePerSessionKrw);
    setDailyRoomSlotCapacity(initialDailyCapacity);
    setAvgGroupAttendance(DEFAULT_BUSINESS_SETTINGS.avgGroupAttendance);
    setBriefCopied(false);
  };

  const handleCopyDailyBrief = async () => {
    await copyTextSafely(summary.dailyBriefMessageKo);
    setBriefCopied(true);
  };

  const handleCopyMakeupDraft = async (slotId: string, draftMessageKo: string) => {
    await copyTextSafely(draftMessageKo);
    setCopiedSlotId(slotId);
  };

  const handleAssignMakeupSlot = (slot: ScheduledMakeupSlot) => {
    if (slot.bookedCount >= slot.capacity) return;

    setStudioSlots((prev) =>
      prev.map((item) =>
        item.slotId === slot.slotId && item.bookedCount < item.capacity
          ? { ...item, bookedCount: item.bookedCount + 1 }
          : item,
      ),
    );

    const newAssignment: TemporaryMakeupAssignment = {
      assignmentId: `assign-${assignmentSeq}`,
      slotId: slot.slotId,
      slotLabelKo: `${slot.dateLabelKo} ${slot.timeLabel} · ${getApparatusLabelKo(slot.apparatus)} (Lv ${slot.level})`,
      memberAliasKo: sanitizedAlias.textKo,
    };
    setAssignmentSeq((n) => n + 1);
    setAssignments((prev) => [newAssignment, ...prev]);
    setMakeupStatusKo(
      `${sanitizedAlias.textKo}님을 ${slot.dateLabelKo} ${slot.timeLabel} 수업에 임시 배정했어요 (잔여 1석 차감).`,
    );
  };

  const handleUndoAssignment = (assignment: TemporaryMakeupAssignment) => {
    setStudioSlots((prev) =>
      prev.map((item) =>
        item.slotId === assignment.slotId && item.bookedCount > 0
          ? { ...item, bookedCount: item.bookedCount - 1 }
          : item,
      ),
    );
    setAssignments((prev) =>
      prev.filter((item) => item.assignmentId !== assignment.assignmentId),
    );
    setMakeupStatusKo(`${assignment.slotLabelKo} 임시 배정을 되돌려 잔여석을 복원했어요.`);
  };

  const handleUndoAllAssignments = () => {
    setStudioSlots(DEFAULT_WEEKLY_STUDIO_SLOTS.map((slot) => ({ ...slot })));
    setAssignments([]);
    setMakeupStatusKo('임시 배정한 보강 슬롯을 모두 원래 잔여석으로 되돌렸어요.');
  };

  const isSimulation = summary.dataSourceMode === 'simulation';

  return (
    <section
      className="sba-panel"
      aria-label="스마트 스튜디오 경영 비서 및 결석 보강 추천"
      data-testid="smart-business-advisor-panel"
      data-role-mode={roleMode}
      data-source-mode={summary.dataSourceMode}
    >
      <header className="sba-header">
        <div className="sba-header-row">
          <div className="sba-header-copy">
            <p className="sba-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              <span>스마트 경영 비서</span>
            </p>
            <h2 className="sba-title">매출 · 가동률 브리핑 &amp; 결석 보강 자동 추천</h2>
            <p className="sba-subtitle">
              수업 기록과 시간표 잔여석을 바탕으로 오늘 챙길 운영 지표와 보강 안내를 바로 정리합니다.
            </p>
          </div>

          <div className="sba-header-badges">
            <span className="sba-role-tag">{ROLE_LABELS_KO[roleMode]}</span>
            <span
              className={`sba-source-badge ${
                isSimulation ? 'sba-source-badge--simulation' : 'sba-source-badge--recorded'
              }`}
              data-testid="sba-data-source-badge"
            >
              {summary.dataSourceBadgeKo}
            </span>
          </div>
        </div>
      </header>

      <div className="sba-tabs" role="tablist" aria-label="스마트 경영 비서 메뉴">
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-revenue`}
          aria-selected={activeTab === 'revenue'}
          aria-controls={`${uid}-panel-revenue`}
          className="sba-tab-btn"
          onClick={() => setActiveTab('revenue')}
        >
          <BarChart3 size={16} aria-hidden="true" />
          <span>일일 매출 · 가동률 비서</span>
        </button>
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-makeup`}
          aria-selected={activeTab === 'makeup'}
          aria-controls={`${uid}-panel-makeup`}
          className="sba-tab-btn"
          onClick={() => setActiveTab('makeup')}
        >
          <CalendarCheck2 size={16} aria-hidden="true" />
          <span>결석 보강 자동 추천</span>
        </button>
      </div>

      {activeTab === 'revenue' && (
        <div
          role="tabpanel"
          id={`${uid}-panel-revenue`}
          aria-labelledby={`${uid}-tab-revenue`}
          className="sba-tabpanel"
        >
          <div
            className={`sba-source-banner ${
              isSimulation ? 'sba-source-banner--simulation' : 'sba-source-banner--recorded'
            }`}
          >
            <p className="sba-source-banner-text">
              {isSimulation ? (
                <>
                  <strong>{summary.dataSourceBadgeKo}:</strong> 저장된 로컬 수업 기록이 없어 주간
                  예시 시간표({studioSlots.length}개 슬롯)로 계산한 시뮬레이션 수치입니다. 실측
                  매출이 아니며, 수업 진행 기록이 쌓이면 실제 기록 기준으로 자동 전환됩니다.
                </>
              ) : (
                <>
                  <strong>{summary.dataSourceBadgeKo}:</strong> 로컬에 저장된 실제 수업 기록{' '}
                  <span className="sba-num">{effectiveHistoryLogs.length}건</span>과 아래 단가
                  설정을 반영해 산출한 예상 운영 수치입니다.
                </>
              )}
            </p>
          </div>

          <div className="sba-section">
            <div className="sba-section-head">
              <div>
                <h3 className="sba-section-title">단가 · 룸 정원 간편 조절</h3>
                <p className="sba-section-caption">
                  스튜디오 기준 단가와 룸 운영 슬롯을 바꾸면 예상 매출과 가동률이 즉시 다시 계산됩니다.
                </p>
              </div>
              <button
                type="button"
                className="sba-btn sba-btn--ghost"
                onClick={handleResetBusinessInputs}
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span>기본값 복원</span>
              </button>
            </div>

            <div className="sba-controls-grid">
              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-group-fee`}>
                  그룹 1인 단가 (원)
                </label>
                <input
                  id={`${uid}-group-fee`}
                  className="sba-input"
                  type="number"
                  min={0}
                  step={1000}
                  value={groupFeePerMemberKrw}
                  onChange={(event) => {
                    setGroupFeePerMemberKrw(
                      parseNonNegativeNumber(event.target.value, groupFeePerMemberKrw),
                    );
                    setBriefCopied(false);
                  }}
                />
              </div>

              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-private-fee`}>
                  개인 1:1 단가 (원)
                </label>
                <input
                  id={`${uid}-private-fee`}
                  className="sba-input"
                  type="number"
                  min={0}
                  step={5000}
                  value={privateFeePerSessionKrw}
                  onChange={(event) => {
                    setPrivateFeePerSessionKrw(
                      parseNonNegativeNumber(event.target.value, privateFeePerSessionKrw),
                    );
                    setBriefCopied(false);
                  }}
                />
              </div>

              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-slot-capacity`}>
                  일일 룸 슬롯 수
                </label>
                <input
                  id={`${uid}-slot-capacity`}
                  className="sba-input"
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  value={dailyRoomSlotCapacity}
                  onChange={(event) => {
                    setDailyRoomSlotCapacity(
                      Math.max(1, parseNonNegativeNumber(event.target.value, dailyRoomSlotCapacity)),
                    );
                    setBriefCopied(false);
                  }}
                />
              </div>

              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-avg-attendance`}>
                  평균 그룹 인원 (명)
                </label>
                <input
                  id={`${uid}-avg-attendance`}
                  className="sba-input"
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={avgGroupAttendance}
                  onChange={(event) => {
                    setAvgGroupAttendance(
                      parseNonNegativeNumber(event.target.value, avgGroupAttendance),
                    );
                    setBriefCopied(false);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="sba-kpi-grid" aria-label="예상 매출 및 룸 가동률 요약">
            <article className="sba-kpi-tile">
              <p className="sba-kpi-label">일일 예상 매출</p>
              <p className="sba-kpi-value sba-num" data-testid="sba-daily-revenue">
                {formatKrw(summary.dailyEstimatedRevenueKrw)}
              </p>
              <p className="sba-kpi-sub">{isSimulation ? '예시 하루 평균' : '기록일 평균 기준'}</p>
            </article>

            <article className="sba-kpi-tile">
              <p className="sba-kpi-label">주간 예상 매출</p>
              <p className="sba-kpi-value sba-num" data-testid="sba-weekly-revenue">
                {formatKrw(summary.weeklyEstimatedRevenueKrw)}
              </p>
              <p className="sba-kpi-sub">{isSimulation ? '주간 시간표 합산' : '주 6일 환산 기준'}</p>
            </article>

            <article className="sba-kpi-tile sba-kpi-tile--accent">
              <p className="sba-kpi-label">월간 예상 매출</p>
              <p className="sba-kpi-value sba-num" data-testid="sba-monthly-revenue">
                {formatKrw(summary.monthlyProjectedRevenueKrw)}
              </p>
              <p className="sba-kpi-sub">4주 운영 환산 기준</p>
            </article>

            <article className="sba-kpi-tile">
              <p className="sba-kpi-label">룸 가동률</p>
              <p className="sba-kpi-value sba-num" data-testid="sba-utilization-pct">
                {summary.utilizationPct}%
              </p>
              <div
                className="sba-meter-track"
                role="progressbar"
                aria-label="룸 가동률"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.utilizationPct}
              >
                <div
                  className="sba-meter-fill"
                  style={{ width: `${summary.utilizationPct}%` }}
                />
              </div>
            </article>
          </div>

          <div className="sba-insight-strip">
            <div className="sba-insight-item">
              <span className="sba-insight-key">인기 기구</span>
              <span className="sba-insight-val" data-testid="sba-top-apparatus">
                {summary.topApparatusKo}
              </span>
            </div>
            <div className="sba-insight-item">
              <span className="sba-insight-key">피크 시간대</span>
              <span className="sba-insight-val" data-testid="sba-peak-time-band">
                {summary.peakTimeBandKo}
              </span>
            </div>
          </div>

          <div className="sba-section">
            <div className="sba-section-head">
              <h3 className="sba-section-title">오늘의 운영 액션 3가지</h3>
            </div>
            <ol className="sba-brief-list" data-testid="sba-actionable-briefs">
              {summary.actionableBriefsKo.map((brief, index) => (
                <li key={brief} className="sba-brief-item">
                  <span className="sba-brief-index sba-num">0{index + 1}</span>
                  <p className="sba-brief-text">{brief}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="sba-section">
            <div className="sba-section-head">
              <h3 className="sba-section-title">일일 브리핑 복사 미리보기</h3>
            </div>
            <pre className="sba-preview-box">{summary.dailyBriefMessageKo}</pre>
            <div className="sba-actions-row">
              <button
                type="button"
                className="sba-btn sba-btn--primary"
                onClick={handleCopyDailyBrief}
              >
                {briefCopied ? (
                  <>
                    <Check size={16} aria-hidden="true" />
                    <span>일일 브리핑 복사 완료</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy size={16} aria-hidden="true" />
                    <span>일일 브리핑 복사</span>
                  </>
                )}
              </button>
              {briefCopied && (
                <span className="sba-status-feedback" role="status">
                  일일 브리핑 요약문을 클립보드에 복사했어요.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'makeup' && (
        <div
          role="tabpanel"
          id={`${uid}-panel-makeup`}
          aria-labelledby={`${uid}-tab-makeup`}
          className="sba-tabpanel"
        >
          <div className="sba-makeup-form">
            <div className="sba-makeup-inputs">
              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-member-alias`}>
                  비식별 회원 별칭
                </label>
                <input
                  id={`${uid}-member-alias`}
                  className="sba-input"
                  type="text"
                  value={memberAliasInput}
                  placeholder="예: 수요 오전반 회원 A"
                  onChange={(event) => setMemberAliasInput(event.target.value)}
                />
              </div>

              <div className="sba-field">
                <label className="sba-label" htmlFor={`${uid}-absence-reason`}>
                  결석 사유 메모 (선택)
                </label>
                <input
                  id={`${uid}-absence-reason`}
                  className="sba-input"
                  type="text"
                  value={reasonInput}
                  placeholder="예: 개인 일정, 출장"
                  onChange={(event) => setReasonInput(event.target.value)}
                />
              </div>
            </div>

            {sanitizedAlias.wasSanitized && sanitizedAlias.noticeKo && (
              <p className="sba-privacy-notice" role="status">
                {sanitizedAlias.noticeKo}
              </p>
            )}

            <div className="sba-field">
              <span className="sba-label">원 수업 기구</span>
              <div className="sba-chip-group" role="group" aria-label="원 수업 기구 선택">
                {APPARATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="sba-chip-btn"
                    aria-pressed={originalApparatus === option.id}
                    onClick={() => setOriginalApparatus(option.id)}
                  >
                    {option.labelKo}
                  </button>
                ))}
              </div>
            </div>

            <div className="sba-field">
              <span className="sba-label">원 수업 난이도</span>
              <div className="sba-chip-group" role="group" aria-label="원 수업 난이도 선택">
                {LEVEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="sba-chip-btn"
                    aria-pressed={originalLevel === option.id}
                    onClick={() => setOriginalLevel(option.id)}
                  >
                    {option.labelKo}
                  </button>
                ))}
              </div>
            </div>

            <div className="sba-field">
              <span className="sba-label">선호 보강 시간대</span>
              <div className="sba-chip-group" role="group" aria-label="선호 보강 시간대 선택">
                {TIME_BAND_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="sba-chip-btn"
                    aria-pressed={preferredTimeBand === option.id}
                    onClick={() => setPreferredTimeBand(option.id)}
                  >
                    {option.labelKo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {makeupStatusKo && (
            <p className="sba-status-feedback" role="status">
              <UserCheck size={16} aria-hidden="true" />
              <span>{makeupStatusKo}</span>
            </p>
          )}

          {assignments.length > 0 && (
            <div className="sba-assigned-tray" aria-label="임시 보강 배정 내역">
              <div className="sba-section-head">
                <h3 className="sba-section-title">
                  임시 보강 배정 내역 (<span className="sba-num">{assignments.length}건</span>)
                </h3>
                <button
                  type="button"
                  className="sba-btn sba-btn--ghost"
                  onClick={handleUndoAllAssignments}
                >
                  <Undo2 size={15} aria-hidden="true" />
                  <span>임시 배정 전체 되돌리기</span>
                </button>
              </div>
              <ul className="sba-assigned-list">
                {assignments.map((assignment) => (
                  <li key={assignment.assignmentId} className="sba-assigned-item">
                    <div className="sba-assigned-copy">
                      <span className="sba-assigned-title">{assignment.slotLabelKo}</span>
                      <span className="sba-assigned-meta">
                        배정 대상: {assignment.memberAliasKo} · 잔여 1석 임시 차감됨
                      </span>
                    </div>
                    <button
                      type="button"
                      className="sba-btn sba-btn--secondary"
                      onClick={() => handleUndoAssignment(assignment)}
                    >
                      <Undo2 size={15} aria-hidden="true" />
                      <span>배정 되돌리기</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="sba-section">
            <div className="sba-section-head">
              <div>
                <h3 className="sba-section-title">
                  최적 보강 슬롯 TOP{' '}
                  <span className="sba-num">{recommendations.length}</span>
                </h3>
                <p className="sba-section-caption">
                  잔여석이 남은 수업만 추려 기구·난이도·시간대 적합도 순으로 추천합니다.
                </p>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="sba-empty-state">
                <p className="sba-empty-text">
                  현재 잔여석이 남은 보강 슬롯이 없습니다. 임시 배정한 자리를 되돌리거나 시간표
                  여석을 확인해 주세요.
                </p>
                {assignments.length > 0 && (
                  <button
                    type="button"
                    className="sba-btn sba-btn--secondary"
                    onClick={handleUndoAllAssignments}
                  >
                    <Undo2 size={15} aria-hidden="true" />
                    <span>임시 배정 전체 되돌리기</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="sba-rec-list" data-testid="sba-makeup-recommendations">
                {recommendations.map((rec, index) => {
                  const isCopied = copiedSlotId === rec.slot.slotId;
                  return (
                    <article
                      key={rec.slot.slotId}
                      className="sba-rec-card"
                      data-testid={`sba-rec-card-${rec.slot.slotId}`}
                    >
                      <div className="sba-rec-head">
                        <div className="sba-rec-title-group">
                          <span className="sba-rec-rank sba-num">추천 {index + 1}순위</span>
                          <h4 className="sba-rec-title">
                            {rec.slot.dateLabelKo}{' '}
                            <span className="sba-num">{rec.slot.timeLabel}</span> ·{' '}
                            {getApparatusLabelKo(rec.slot.apparatus)} (Lv{' '}
                            <span className="sba-num">{rec.slot.level}</span>)
                          </h4>
                          <p className="sba-rec-meta">
                            {rec.slot.roomLabelKo} · {rec.slot.instructorAliasKo} ·{' '}
                            <strong className="sba-num">잔여 {rec.remainingSeats}석</strong> (
                            <span className="sba-num">
                              {rec.slot.bookedCount}/{rec.slot.capacity}명
                            </span>
                            )
                          </p>
                        </div>
                        <span className="sba-score-badge sba-num">
                          매칭 {rec.matchScore}점
                        </span>
                      </div>

                      <ul className="sba-reasons-list" aria-label="추천 근거">
                        {rec.matchReasonsKo.map((reason) => (
                          <li key={reason} className="sba-reason-tag">
                            {reason}
                          </li>
                        ))}
                      </ul>

                      <pre className="sba-preview-box">{rec.draftMessageKo}</pre>

                      <div className="sba-actions-row">
                        <button
                          type="button"
                          className="sba-btn sba-btn--primary"
                          onClick={() => handleCopyMakeupDraft(rec.slot.slotId, rec.draftMessageKo)}
                        >
                          {isCopied ? (
                            <>
                              <Check size={16} aria-hidden="true" />
                              <span>보강 안내 멘트 복사 완료</span>
                            </>
                          ) : (
                            <>
                              <ClipboardCopy size={16} aria-hidden="true" />
                              <span>보강 안내 멘트 복사</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="sba-btn sba-btn--secondary"
                          onClick={() => handleAssignMakeupSlot(rec.slot)}
                        >
                          <UserCheck size={16} aria-hidden="true" />
                          <span>보강 임시 배정</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
