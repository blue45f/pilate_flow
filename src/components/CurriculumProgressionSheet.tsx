import React, { useMemo, useState } from 'react';
import { ArrowRight, BookmarkPlus, CalendarRange, Check, Layers } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, DifficultyLevel } from '../types/pilates';
import {
  buildSavedSequenceFromWeekDraft,
  CURRICULUM_THEME_OPTIONS,
  generateFourWeekCurriculum,
  type CurriculumThemeId,
  type ProgressiveWeekDraft,
} from '../utils/fourWeekProgressionEngine';
import { PfBadge, PfButton, PfInput, PfSelect } from '../design-system';

interface CurriculumProgressionSheetProps {
  onSavedBatch?: (message: string) => void;
  onOpenedWeekInWorkbench?: (message: string) => void;
}

export const CurriculumProgressionSheet: React.FC<CurriculumProgressionSheetProps> = ({
  onSavedBatch,
  onOpenedWeekInWorkbench,
}) => {
  const exercises = usePilatesStore((s) => s.exercises);
  const classGroups = usePilatesStore((s) => s.classGroups);
  const activeTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);
  const applyPresetDraft = usePilatesStore((s) => s.applyPresetDraft);
  const setActiveTab = usePilatesStore((s) => s.setActiveTab);

  const [themeId, setThemeId] = useState<CurriculumThemeId>('posture-core');
  const [apparatus, setApparatus] = useState<ApparatusType>('reformer');
  const [baseLevel, setBaseLevel] = useState<DifficultyLevel>('1.0');
  const [groupLabelKo, setGroupLabelKo] = useState<string>(
    classGroups[0]?.name ?? '화·목 저녁 A반',
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const curriculum = useMemo(
    () =>
      generateFourWeekCurriculum({
        exercises,
        themeId,
        apparatus,
        baseLevel,
        targetMinutes: activeTargetMinutes || 50,
        groupLabelKo,
      }),
    [exercises, themeId, apparatus, baseLevel, activeTargetMinutes, groupLabelKo],
  );

  const handleSaveAllFourWeeks = () => {
    if (!curriculum) return;
    const nowMs = Date.now();
    const created = curriculum.weeks.map((wk, idx) =>
      buildSavedSequenceFromWeekDraft(
        wk,
        new Date(nowMs + idx * 1000).toISOString(),
      ),
    );
    usePilatesStore.setState((prev) => ({
      savedSequences: [...created.reverse(), ...prev.savedSequences],
      saveFeedback: `‘${curriculum.groupLabelKo}’ 4주 커리큘럼(1~4주차 총 4개 시퀀스)을 보관함에 일괄 저장했습니다.`,
    }));
    const msg = `‘${curriculum.groupLabelKo}’ 1~4주차 점진 커리큘럼 4개 시퀀스를 보관함에 저장했습니다.`;
    setSavedNotice(msg);
    onSavedBatch?.(msg);
  };

  const handleLoadSingleWeek = (week: ProgressiveWeekDraft) => {
    const expected = usePilatesStore.getState();
    const res = applyPresetDraft(
      {
        steps: week.steps,
        title: week.title,
        subtitle: week.subtitle,
        targetMinutes: week.targetMinutes,
      },
      'replace',
      expected,
    );
    if (res.success) {
      onOpenedWeekInWorkbench?.(res.message);
      setActiveTab('workbench');
    } else {
      setSavedNotice(res.message);
    }
  };

  if (!curriculum) return null;

  return (
    <section
      className="pf-v70-curriculum-card"
      data-testid="curriculum-progression-sheet"
      aria-label="4주 점진 커리큘럼 자동 편성"
    >
      <div className="pf-v70-curriculum-head">
        <div>
          <span className="pf-studio-kicker-pill">4-WEEK PROGRESSIVE CURRICULUM</span>
          <h3>4주 점진 클래스 커리큘럼 원클릭 생성</h3>
          <p className="muted">
            1주차 정렬·인지부터 4주차 통합 플로우까지 난이도와 레이어가 자연스럽게 이어지는 4회차 시퀀스 묶음을 한 번에 보관합니다.
          </p>
        </div>
        <PfButton
          variant="primary"
          data-testid="curriculum-save-all-4weeks-btn"
          onClick={handleSaveAllFourWeeks}
        >
          <BookmarkPlus size={16} /> 1~4주차 시퀀스 일괄 보관
        </PfButton>
      </div>

      <div className="pf-v70-curriculum-controls">
        <label className="pf-v70-field">
          <span>커리큘럼 테마</span>
          <PfSelect
            data-testid="curriculum-theme-select"
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as CurriculumThemeId)}
          >
            {CURRICULUM_THEME_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.labelKo}
              </option>
            ))}
          </PfSelect>
        </label>

        <label className="pf-v70-field">
          <span>주력 기구</span>
          <PfSelect
            data-testid="curriculum-apparatus-select"
            value={apparatus}
            onChange={(e) => setApparatus(e.target.value as ApparatusType)}
          >
            {(['reformer', 'cadillac', 'chair', 'barrel', 'mat'] as const).map((app) => (
              <option key={app} value={app}>
                {APPARATUS_LABELS[app].ko}
              </option>
            ))}
          </PfSelect>
        </label>

        <label className="pf-v70-field">
          <span>시작 난이도 (1주차)</span>
          <PfSelect
            data-testid="curriculum-level-select"
            value={baseLevel}
            onChange={(e) => setBaseLevel(e.target.value as DifficultyLevel)}
          >
            <option value="1.0">Lv 1.0 입문 → Lv 1.5 중급</option>
            <option value="1.5">Lv 1.5 중급 → Lv 2.0 심화</option>
            <option value="2.0">Lv 2.0 마스터리 집중</option>
          </PfSelect>
        </label>

        <label className="pf-v70-field">
          <span>대상 반·프로그램 별칭</span>
          <PfInput
            data-testid="curriculum-group-input"
            maxLength={40}
            value={groupLabelKo}
            onChange={(e) => setGroupLabelKo(e.target.value)}
            placeholder="예: 화·목 저녁 체형교정반"
          />
        </label>
      </div>

      <div className="pf-v70-week-grid" data-testid="curriculum-week-cards">
        {curriculum.weeks.map((wk) => (
          <div
            key={wk.weekNumber}
            className="pf-v70-week-card"
            data-testid={`curriculum-week-card-${wk.weekNumber}`}
          >
            <div className="pf-v70-week-top">
              <img
                src={wk.leadThumb3dUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="pf-v70-week-thumb"
              />
              <div>
                <div className="pf-v70-week-badges">
                  <PfBadge tone={wk.weekNumber >= 3 ? 'brand' : 'sage'}>
                    {wk.weekBadgeKo}
                  </PfBadge>
                  <span className="pf-v70-layer-pill">
                    Lv {wk.level} ·{' '}
                    {wk.defaultLayer === 'easy'
                      ? '완화 레이어'
                      : wk.defaultLayer === 'hard'
                        ? '챌린지 레이어'
                        : '표준 레이어'}
                  </span>
                </div>
                <h4>{wk.phaseFocusKo}</h4>
                <p className="muted">{wk.coachingGoalKo}</p>
              </div>
            </div>

            <div className="pf-v70-week-moves">
              <Layers size={13} aria-hidden="true" />
              <span>{wk.movementNamesKo.slice(0, 4).join(' → ')} 외 {Math.max(0, wk.movementNamesKo.length - 4)}동작</span>
            </div>

            <div className="pf-v70-week-actions">
              <PfButton
                variant="secondary"
                data-testid={`curriculum-open-week-${wk.weekNumber}-btn`}
                onClick={() => handleLoadSingleWeek(wk)}
              >
                {wk.weekNumber}주차 작업대로 열기 <ArrowRight size={14} />
              </PfButton>
            </div>
          </div>
        ))}
      </div>

      <p className="pf-v70-honest-caption">
        <CalendarRange size={13} aria-hidden="true" /> {curriculum.honestNoteKo}
      </p>

      {savedNotice && (
        <p className="pf-v70-inline-status" role="status" data-testid="curriculum-saved-notice">
          <Check size={14} aria-hidden="true" /> {savedNotice}
        </p>
      )}
    </section>
  );
};
