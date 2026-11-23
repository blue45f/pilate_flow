import { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Layers,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { PilatesExercise, ReformerBrand, SequenceStep } from '../types/pilates';
import {
  COMFORT_GUARD_META,
  COMFORT_GUARD_ORDER,
  DEFAULT_PRIVATE_PROFILE,
  SAFE_MEMBER_ALIAS_PRESETS,
  adaptSequenceForPrivateProfile,
  analyzeGroupFlowTransitions,
  applyPrivateAdaptationsToSteps,
  buildGroupLayeringMatrix,
  buildMemberRecapCard,
  downloadMemberRecapCardImage,
  type ComfortGuardArea,
  type LessonFormatMode,
  type PrivateMemberProfile,
} from '../utils/lessonFormatEngine';
import '../styles/lesson-mode-studio.css';

export interface LessonModeSwitchPanelProps {
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly sequenceTitle?: string;
  readonly sessionDateIso?: string;
  readonly brand?: ReformerBrand;
  readonly mode?: LessonFormatMode;
  readonly defaultMode?: LessonFormatMode;
  readonly onModeChange?: (mode: LessonFormatMode) => void;
  readonly groupClassSize?: number;
  readonly initialProfile?: Partial<PrivateMemberProfile>;
  readonly onApplyPrivateLayers?: (nextSteps: SequenceStep[]) => void;
  readonly onReplaceStepExercise?: (stepId: string, nextExerciseId: string) => void;
  readonly onOpenCameraGuide?: () => void;
  readonly className?: string;
}

async function copyTextSafely(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

export function LessonModeSwitchPanel({
  steps,
  exercises,
  sequenceTitle,
  sessionDateIso,
  brand = 'intopilates',
  mode: controlledMode,
  defaultMode = 'private-1on1',
  onModeChange,
  groupClassSize = 6,
  initialProfile,
  onApplyPrivateLayers,
  onReplaceStepExercise,
  onOpenCameraGuide,
  className = '',
}: LessonModeSwitchPanelProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<LessonFormatMode>(defaultMode);
  const activeMode = controlledMode ?? uncontrolledMode;

  const [aliasInput, setAliasInput] = useState<string>(
    initialProfile?.alias ?? DEFAULT_PRIVATE_PROFILE.alias,
  );
  const [focusGoalInput, setFocusGoalInput] = useState<string>(
    initialProfile?.focusGoal ?? DEFAULT_PRIVATE_PROFILE.focusGoal,
  );
  const [comfortGuards, setComfortGuards] = useState<ComfortGuardArea[]>(() => [
    ...(initialProfile?.comfortGuards ?? []),
  ]);
  const [showAllMatrixRows, setShowAllMatrixRows] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const handleSelectMode = (nextMode: LessonFormatMode) => {
    setFeedbackMessage(null);
    if (controlledMode === undefined) {
      setUncontrolledMode(nextMode);
    }
    onModeChange?.(nextMode);
  };

  const toggleComfortGuard = (area: ComfortGuardArea) => {
    setFeedbackMessage(null);
    setComfortGuards((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area],
    );
  };

  const rawProfile: PrivateMemberProfile = useMemo(
    () => ({
      alias: aliasInput,
      focusGoal: focusGoalInput,
      comfortGuards,
      recentNotes: initialProfile?.recentNotes ?? '',
    }),
    [aliasInput, focusGoalInput, comfortGuards, initialProfile?.recentNotes],
  );

  const privateAdaptation = useMemo(
    () => adaptSequenceForPrivateProfile(steps, exercises, rawProfile, exercises),
    [steps, exercises, rawProfile],
  );

  const recapCard = useMemo(
    () =>
      buildMemberRecapCard({
        steps,
        exercises,
        profile: rawProfile,
        sequenceTitle,
        sessionDateIso,
      }),
    [steps, exercises, rawProfile, sequenceTitle, sessionDateIso],
  );

  const groupMatrix = useMemo(
    () => buildGroupLayeringMatrix(steps, exercises, { classSize: groupClassSize, brand }),
    [steps, exercises, groupClassSize, brand],
  );

  const groupFlow = useMemo(
    () => analyzeGroupFlowTransitions(steps, exercises, { classSize: groupClassSize }),
    [steps, exercises, groupClassSize],
  );

  const flaggedAdaptations = useMemo(
    () => privateAdaptation.stepAdaptations.filter((item) => item.matchedGuards.length > 0),
    [privateAdaptation.stepAdaptations],
  );

  const bottleneckTransitions = useMemo(
    () =>
      groupFlow.transitions.filter(
        (item) => item.status === 'bottleneck' || item.status === 'watch',
      ),
    [groupFlow.transitions],
  );

  const visibleMatrixRows = showAllMatrixRows
    ? groupMatrix.rows
    : groupMatrix.rows.slice(0, 4);

  const handleCopyRecapText = async () => {
    const ok = await copyTextSafely(recapCard.kakaoShareText);
    setFeedbackMessage(
      ok
        ? '카톡 공유용 수업 리캡 텍스트를 복사했어요.'
        : '클립보드 복사가 제한되어 있어요. 위 리캡 내용을 길게 눌러 복사해 주세요.',
    );
  };

  const handleDownloadRecapImage = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      const result = await downloadMemberRecapCardImage(
        recapCard,
        `pilates-recap-${recapCard.sessionDateLabelKo.replace(/\./g, '')}`,
      );
      setFeedbackMessage(
        `회원 소통 카드(${result.format.toUpperCase()})를 저장했어요.`,
      );
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleApplyPrivateEasyLayers = () => {
    if (!onApplyPrivateLayers) return;
    const nextSteps = applyPrivateAdaptationsToSteps(steps, privateAdaptation);
    onApplyPrivateLayers(nextSteps);
    setFeedbackMessage('배려가 필요한 동작을 편안한(완화) 단계로 맞췄어요.');
  };

  const handleCopyGroupCueSheet = async () => {
    const ok = await copyTextSafely(groupMatrix.copyableCueSheetText);
    setFeedbackMessage(
      ok
        ? `${groupMatrix.classSize}:1 3단계 동시 큐 시트를 복사했어요.`
        : '클립보드 복사가 제한되어 있어요.',
    );
  };

  return (
    <section
      className={`lms-panel ${className}`.trim()}
      aria-label="레슨 형태 맞춤 스튜디오"
    >
      <header className="lms-header">
        <div className="lms-header-top">
          <div>
            <h2 className="lms-title">레슨 형태 맞춤</h2>
            <p className="lms-subtitle">
              {activeMode === 'private-1on1'
                ? '부위 배려 팁과 수업 후 회원 소통 카드를 한 번에 준비해요.'
                : `${groupClassSize}:1 동시 3단계 큐와 스프링 유지 구간을 한눈에 봐요.`}
            </p>
          </div>
          {onOpenCameraGuide && (
            <button
              type="button"
              className="lms-btn lms-btn-compact"
              onClick={onOpenCameraGuide}
            >
              <Camera size={16} aria-hidden="true" />
              <span>정렬 거울</span>
            </button>
          )}
        </div>

        <div className="lms-segment-track" role="tablist" aria-label="레슨 형태 전환">
          <button
            type="button"
            role="tab"
            id="lms-tab-private"
            aria-selected={activeMode === 'private-1on1'}
            aria-controls="lms-tabpanel-private"
            className="lms-segment-btn"
            onClick={() => handleSelectMode('private-1on1')}
          >
            <User size={16} aria-hidden="true" />
            <span>1:1 개인 레슨</span>
          </button>
          <button
            type="button"
            role="tab"
            id="lms-tab-group"
            aria-selected={activeMode === 'group-class'}
            aria-controls="lms-tabpanel-group"
            className="lms-segment-btn"
            onClick={() => handleSelectMode('group-class')}
          >
            <Users size={16} aria-hidden="true" />
            <span>그룹 레슨</span>
          </button>
        </div>
      </header>

      {feedbackMessage && (
        <p className="lms-feedback-banner" role="status" aria-live="polite">
          {feedbackMessage}
        </p>
      )}

      {activeMode === 'private-1on1' ? (
        <div
          id="lms-tabpanel-private"
          role="tabpanel"
          aria-labelledby="lms-tab-private"
          className="lms-body"
        >
          {/* 1. Non-identifying Alias & Today Focus */}
          <div className="lms-section">
            <div className="lms-section-head">
              <h3 className="lms-section-title">비식별 별칭 · 오늘 포커스</h3>
              <span className="lms-section-meta">실명·연락처 저장 안 함</span>
            </div>

            <div className="lms-preset-row" aria-label="별칭 빠른 선택">
              {SAFE_MEMBER_ALIAS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="lms-preset-chip"
                  aria-pressed={aliasInput === preset}
                  onClick={() => setAliasInput(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="lms-field-grid">
              <label className="lms-field">
                <span className="lms-label">회원 별칭 (비식별)</span>
                <input
                  type="text"
                  className="lms-input"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="예: 회원 A · 금요 2시 개인"
                  maxLength={36}
                />
              </label>

              <label className="lms-field">
                <span className="lms-label">오늘의 운동 포커스</span>
                <input
                  type="text"
                  className="lms-input"
                  value={focusGoalInput}
                  onChange={(e) => setFocusGoalInput(e.target.value)}
                  placeholder="예: 코어 안정과 편안한 호흡 리듬"
                  maxLength={64}
                />
              </label>
            </div>

            {privateAdaptation.privacyNoticeKo && (
              <p className="lms-privacy-notice" role="status">
                {privateAdaptation.privacyNoticeKo}
              </p>
            )}
          </div>

          {/* 2. One-Tap Comfort Guard Chips */}
          <div className="lms-section">
            <div className="lms-section-head">
              <h3 className="lms-section-title">불편 부위 원탭 배려</h3>
              <span className="lms-section-meta">
                {comfortGuards.length > 0
                  ? `${comfortGuards.length}개 선택`
                  : '필요한 부위만 탭'}
              </span>
            </div>

            <div className="lms-chip-grid" role="group" aria-label="불편 부위 배려 선택">
              {COMFORT_GUARD_ORDER.map((area) => {
                const meta = COMFORT_GUARD_META[area];
                const selected = comfortGuards.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    className="lms-chip"
                    aria-pressed={selected}
                    onClick={() => toggleComfortGuard(area)}
                  >
                    {selected && <Check size={15} aria-hidden="true" />}
                    <span>{meta.chipLabelKo}</span>
                  </button>
                );
              })}
            </div>

            <p className="lms-summary-line">{privateAdaptation.summaryKo}</p>

            {flaggedAdaptations.length > 0 && (
              <>
                <ul className="lms-tip-list">
                  {flaggedAdaptations.map((item) => (
                    <li key={item.stepId} className="lms-tip-row">
                      <div className="lms-tip-row-head">
                        <span className="lms-tip-step-name">
                          <span className="lms-num">{item.order}번</span> · {item.exerciseNameKo}
                        </span>
                        <span className="lms-guard-tags">
                          {item.matchedGuards.map((g) => (
                            <span key={g} className="lms-keycap">
                              {COMFORT_GUARD_META[g].shortKo}
                            </span>
                          ))}
                        </span>
                      </div>
                      <p className="lms-tip-text">{item.comfortTipKo}</p>
                      {item.suggestedAlternative && onReplaceStepExercise && (
                        <div className="lms-tip-swap-row">
                          <span className="lms-tip-swap-label">
                            편안한 대안: {item.suggestedAlternative.nameKo} (
                            {item.suggestedAlternative.apparatusLabelKo})
                          </span>
                          <button
                            type="button"
                            className="lms-btn lms-btn-compact"
                            onClick={() => {
                              onReplaceStepExercise(
                                item.stepId,
                                item.suggestedAlternative!.exerciseId,
                              );
                              setFeedbackMessage(
                                `${item.suggestedAlternative!.nameKo} 동작으로 교체했어요.`,
                              );
                            }}
                          >
                            이 동작으로 바꾸기
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {onApplyPrivateLayers && (
                  <div className="lms-action-row-single">
                    <button
                      type="button"
                      className="lms-btn lms-btn-compact"
                      onClick={handleApplyPrivateEasyLayers}
                    >
                      <Sparkles size={15} aria-hidden="true" />
                      <span>배려 동작 완화(초보) 단계 일괄 적용</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. Post-Class Instructor-Member Communication Card */}
          <div className="lms-section">
            <div className="lms-section-head">
              <h3 className="lms-section-title">수업 후 회원 소통 카드</h3>
              <span className="lms-section-meta">카톡 텍스트 · 1장 이미지</span>
            </div>

            <div className="lms-recap-sheet" aria-label="회원 소통 카드 미리보기">
              <div className="lms-recap-head">
                <span className="lms-recap-alias">{recapCard.memberAlias}</span>
                <span className="lms-recap-date">
                  {recapCard.sessionDateLabelKo} · {recapCard.primaryApparatusLabelKo}{' '}
                  {recapCard.totalMinutes}분
                </span>
              </div>

              <div className="lms-recap-block">
                <span className="lms-recap-kicker">오늘의 핵심 포커스</span>
                <p className="lms-recap-focus">{recapCard.todayFocusKo}</p>
                {recapCard.comfortSummaryKo && (
                  <p className="lms-summary-line">{recapCard.comfortSummaryKo}</p>
                )}
              </div>

              <div className="lms-recap-block">
                <span className="lms-recap-kicker">
                  척추 4평면 밸런스 ({recapCard.coveredPlaneCount}/4)
                </span>
                <div className="lms-plane-grid">
                  {recapCard.spinalBalance.map((plane) => (
                    <div key={plane.plane} className="lms-plane-cell">
                      <div className="lms-plane-top">
                        <span>{plane.shortLabelKo}</span>
                        <span className="lms-num">{plane.count}회</span>
                      </div>
                      <div className="lms-plane-track" aria-hidden="true">
                        <div
                          className="lms-plane-fill"
                          style={{ width: `${plane.ratioPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="lms-summary-line">{recapCard.spinalBalanceNoteKo}</p>
              </div>

              <div className="lms-recap-block">
                <span className="lms-recap-kicker">잘 따라온 동작 2개</span>
                <ul className="lms-recap-list">
                  {recapCard.highlightMoves.length > 0 ? (
                    recapCard.highlightMoves.map((move) => (
                      <li key={move.exerciseId} className="lms-recap-item">
                        <div className="lms-recap-item-head">
                          <span className="lms-recap-item-title">{move.nameKo}</span>
                          <span className="lms-recap-item-meta">{move.apparatusLabelKo}</span>
                        </div>
                        <p className="lms-recap-item-desc">{move.praiseNoteKo}</p>
                      </li>
                    ))
                  ) : (
                    <li className="lms-recap-item">
                      <p className="lms-recap-item-desc">
                        시퀀스에 동작을 담으면 대표 동작 2가지가 자동으로 채워져요.
                      </p>
                    </li>
                  )}
                </ul>
              </div>

              <div className="lms-recap-block">
                <span className="lms-recap-kicker">집에서 3분 매트 홈케어 참고</span>
                <ul className="lms-recap-list">
                  {recapCard.homeCareTips.map((tip) => (
                    <li key={tip.titleKo} className="lms-recap-item">
                      <div className="lms-recap-item-head">
                        <span className="lms-recap-item-title">{tip.titleKo}</span>
                        <span className="lms-recap-item-meta">{tip.durationKo}</span>
                      </div>
                      <p className="lms-recap-item-desc">{tip.cueKo}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="lms-disclaimer">{recapCard.coachingDisclaimerKo}</p>
            </div>

            <div className="lms-action-row">
              <button
                type="button"
                className="lms-btn lms-btn-primary"
                onClick={handleCopyRecapText}
              >
                <Copy size={16} aria-hidden="true" />
                <span>카톡 텍스트 복사</span>
              </button>
              <button
                type="button"
                className="lms-btn"
                disabled={isExportingImage}
                onClick={handleDownloadRecapImage}
              >
                <Download size={16} aria-hidden="true" />
                <span>{isExportingImage ? '저장 중…' : '카드 이미지 저장'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="lms-tabpanel-group"
          role="tabpanel"
          aria-labelledby="lms-tab-group"
          className="lms-body"
        >
          {/* 1. Group Spring & Flow Transition Summary */}
          <div className="lms-section">
            <div className="lms-section-head">
              <h3 className="lms-section-title">
                {groupFlow.classSize}:1 스프링 · 전환 흐름
              </h3>
              <span className="lms-section-meta">
                동작 {groupFlow.exerciseCount}개 기준
              </span>
            </div>

            <div className="lms-kpi-strip" aria-label="그룹 스프링 전환 요약">
              <div className="lms-kpi-cell">
                <span className="lms-kpi-label">스프링 변경</span>
                <strong className="lms-kpi-value">{groupFlow.springChangeCount}회</strong>
              </div>
              <div className="lms-kpi-cell">
                <span className="lms-kpi-label">예상 전환</span>
                <strong className="lms-kpi-value">
                  {groupFlow.totalEstimatedTransitionLabelKo}
                </strong>
              </div>
              <div className="lms-kpi-cell">
                <span className="lms-kpi-label">스프링 유지</span>
                <strong className="lms-kpi-value">
                  {groupFlow.longestSpringKeepStreak
                    ? `최대 ${groupFlow.longestSpringKeepStreak.stepCount}동작`
                    : '단일 구간'}
                </strong>
              </div>
            </div>

            <p className="lms-summary-line">{groupFlow.summaryKo}</p>

            {groupFlow.springKeepStreaks.length > 0 && (
              <div className="lms-streak-list" aria-label="스프링 그대로 유지 구간">
                {groupFlow.springKeepStreaks.map((streak) => (
                  <div
                    key={`${streak.startOrder}-${streak.endOrder}`}
                    className="lms-streak-pill"
                  >
                    <span>스프링 그대로 유지 · {streak.labelKo}</span>
                    <span className="lms-keycap">{streak.springCode}</span>
                  </div>
                ))}
              </div>
            )}

            {bottleneckTransitions.length > 0 && (
              <ul className="lms-bottleneck-list" aria-label="그룹 전환 여유 필요 구간">
                {bottleneckTransitions.map((item) => (
                  <li key={item.stepId} className="lms-bottleneck-row">
                    <div className="lms-bottleneck-head">
                      <span>
                        <span className="lms-num">{item.order}번</span> {item.exerciseNameKo}
                      </span>
                      <span className="lms-num">약 {item.estimatedGroupSec}초</span>
                    </div>
                    <span>{item.changedItemsKo.join(' · ')}</span>
                    <span>{item.coachTipKo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. Simultaneous 3-Tier Layering Cue Sheet */}
          <div className="lms-section">
            <div className="lms-section-head">
              <h3 className="lms-section-title">3단계 동시 큐 (초보 · 기본 · 심화)</h3>
              <button
                type="button"
                className="lms-btn lms-btn-compact"
                onClick={handleCopyGroupCueSheet}
              >
                <Layers size={15} aria-hidden="true" />
                <span>큐 시트 복사</span>
              </button>
            </div>

            {groupMatrix.rows.length === 0 ? (
              <p className="lms-summary-line">{groupMatrix.summaryKo}</p>
            ) : (
              <>
                <ol className="lms-matrix-list">
                  {visibleMatrixRows.map((row) => (
                    <li key={row.stepId} className="lms-matrix-card">
                      <div className="lms-matrix-head">
                        <div className="lms-matrix-title-group">
                          <span className="lms-step-num">
                            {String(row.order).padStart(2, '0')}
                          </span>
                          <span className="lms-matrix-name">{row.exerciseNameKo}</span>
                        </div>
                        <div className="lms-matrix-badges">
                          <span className="lms-keycap">{row.springCode}</span>
                          <span className="lms-section-meta">{row.durationMin}분</span>
                        </div>
                      </div>

                      <dl className="lms-tier-list">
                        <div className="lms-tier-row">
                          <dt className="lms-tier-label">완화(초보)</dt>
                          <dd className="lms-tier-desc">{row.tiers.easy}</dd>
                        </div>
                        <div className="lms-tier-row">
                          <dt className="lms-tier-label lms-tier-label-standard">기본</dt>
                          <dd className="lms-tier-desc">{row.tiers.standard}</dd>
                        </div>
                        <div className="lms-tier-row">
                          <dt className="lms-tier-label lms-tier-label-hard">심화</dt>
                          <dd className="lms-tier-desc">{row.tiers.hard}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>

                {groupMatrix.rows.length > 4 && (
                  <button
                    type="button"
                    className="lms-btn"
                    onClick={() => setShowAllMatrixRows((prev) => !prev)}
                  >
                    {showAllMatrixRows
                      ? '처음 4개 동작만 보기'
                      : `전체 ${groupMatrix.rows.length}개 동작 큐 모두 보기`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
