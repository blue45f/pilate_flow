import React, { useMemo, useState } from 'react';
import { CalendarDays, Globe2, Plus, Search, Sparkles } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  PILATES_SCHOOL_LABELS,
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
  WORLD_REPERTOIRE_STATS,
  type PilatesSchoolTag,
  type WorldPilatesExercise,
} from '../data/worldPilatesRepertoire1000';
import { CURATED_MULTI_WEEK_PROGRAMS, type MultiWeekProgram } from '../utils/composableHierarchyEngine';
import { formatDifficultyMeta } from '../utils/instructorUxHelpers';
import { ensureWorldExercisesInStore } from '../utils/registerAllStudioAdapters';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, DifficultyLevel, PilatesExercise, SequenceStep } from '../types/pilates';
import { NaturalVoiceSpeakButton } from './NaturalVoiceSpeakButton';
import { SpringVisualPills } from './SpringVisualPills';

export interface WorldRepertoireExplorerBarProps {
  readonly onOpenDetail?: (exercise: PilatesExercise) => void;
  readonly onAppliedProgram?: (message: string) => void;
  readonly defaultExpanded?: boolean;
}

type ExplorerScope = 'repertoire' | 'programs';
type SchoolFilter = 'all' | 'traditional' | 'fusion' | PilatesSchoolTag;

const APPARATUS_CHIPS: readonly { readonly id: 'all' | ApparatusType; readonly labelKo: string }[] = [
  { id: 'all', labelKo: '전체 기구' },
  { id: 'reformer', labelKo: '리포머' },
  { id: 'mat', labelKo: '매트' },
  { id: 'cadillac', labelKo: '캐딜락' },
  { id: 'chair', labelKo: '체어' },
  { id: 'barrel', labelKo: '바렐' },
];

const SCHOOL_CHIPS: readonly { readonly id: SchoolFilter; readonly labelKo: string }[] = [
  { id: 'all', labelKo: '전체 유파' },
  { id: 'traditional', labelKo: '정통 · 모던' },
  { id: 'fusion', labelKo: '응용 퓨전 (바레·기능성·가동성)' },
  { id: 'fusion-barre', labelKo: '바레 퓨전' },
  { id: 'fusion-athletic', labelKo: '기능성·애슬레틱' },
  { id: 'fusion-mobility', labelKo: '가동성·모빌리티' },
];

const LEVEL_CHIPS: readonly { readonly id: 'all' | DifficultyLevel; readonly labelKo: string }[] = [
  { id: 'all', labelKo: '전체 난이도' },
  { id: '1.0', labelKo: '입문 ★☆☆' },
  { id: '1.5', labelKo: '중급 ★★☆' },
  { id: '2.0', labelKo: '심화 ★★★' },
];

export const WorldRepertoireExplorerBar: React.FC<WorldRepertoireExplorerBarProps> = ({
  onOpenDetail,
  onAppliedProgram,
  defaultExpanded = false,
}) => {
  const [open, setOpen] = useState(defaultExpanded);
  const [scope, setScope] = useState<ExplorerScope>('repertoire');
  const [apparatus, setApparatus] = useState<'all' | ApparatusType>('all');
  const [school, setSchool] = useState<SchoolFilter>('all');
  const [level, setLevel] = useState<'all' | DifficultyLevel>('all');
  const [tierMode, setTierMode] = useState<'atomic' | 'all'>('atomic');
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(12);
  const [feedback, setFeedback] = useState('');

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WORLD_PILATES_EXERCISES.filter((ex) => {
      if (tierMode === 'atomic' && ex.tier !== 'atomic' && !q) return false;
      if (apparatus !== 'all' && ex.apparatus !== apparatus) return false;
      if (level !== 'all' && ex.level !== level) return false;
      if (school !== 'all') {
        const meta = PILATES_SCHOOL_LABELS[ex.schoolTag];
        if (school === 'traditional' && meta.group !== 'traditional') return false;
        if (school === 'fusion' && meta.group !== 'fusion') return false;
        if (school !== 'traditional' && school !== 'fusion' && ex.schoolTag !== school) return false;
      }
      if (!q) return true;
      const hay = [
        ex.nameKo,
        ex.nameEn,
        ...ex.targetMuscles,
        ...ex.anatomyInsight.benefitsKo,
        PILATES_SCHOOL_LABELS[ex.schoolTag].ko,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [apparatus, level, query, school, tierMode]);

  const visibleItems = useMemo(
    () => filteredExercises.slice(0, pageSize),
    [filteredExercises, pageSize],
  );

  const fusionCount =
    (WORLD_REPERTOIRE_STATS.bySchool['fusion-barre'] ?? 0) +
    (WORLD_REPERTOIRE_STATS.bySchool['fusion-athletic'] ?? 0) +
    (WORLD_REPERTOIRE_STATS.bySchool['fusion-mobility'] ?? 0);

  const handleAddWorldExercise = (ex: WorldPilatesExercise) => {
    ensureWorldExercisesInStore([ex]);
    usePilatesStore.getState().appendExerciseToSequence(ex.id, ex.blockCategory);
    setFeedback(`‘${ex.nameKo}’을 현재 수업에 담았습니다.`);
  };

  const handleApplyProgramWeek1 = (program: MultiWeekProgram) => {
    const week1 = program.weeks[0];
    if (!week1) return;
    const resolved: WorldPilatesExercise[] = [];
    for (const id of week1.exerciseIds) {
      const ex = WORLD_PILATES_BY_ID.get(id);
      if (ex) resolved.push(ex);
    }
    if (resolved.length === 0) return;

    ensureWorldExercisesInStore(resolved);
    const steps: SequenceStep[] = resolved.map((ex, index) => ({
      stepId: `prog-${program.id}-w1-${index + 1}-${Date.now().toString(36)}`,
      order: index + 1,
      blockCategory: ex.blockCategory,
      exerciseId: ex.id,
      durationMin: ex.defaultDurationMin || 5,
      selectedLayer: program.level === '1.0' ? 'easy' : program.level === '2.0' ? 'hard' : 'standard',
      instructorNote: `${program.titleKo} · 1주차 (${week1.themeKo})`,
    }));

    const resolvedApparatus: ApparatusType | 'mixed' =
      program.apparatus.length === 1 ? program.apparatus[0] : 'mixed';

    usePilatesStore.setState({
      activeTitle: `${program.titleKo} · 1주차`,
      activeSubtitle: week1.themeKo,
      activeApparatus: resolvedApparatus,
      activeLevel: program.level,
      activeTargetMinutes: program.targetMinutesPerClass,
      activeSteps: steps,
      activeTab: 'workbench',
    });
    const msg = `‘${program.titleKo}’ 1주차(${resolved.length}동작)를 수업 만들기에 불러왔습니다.`;
    setFeedback(msg);
    onAppliedProgram?.(msg);
  };

  return (
    <section
      className="pf-world-repertoire-panel"
      data-testid="world-repertoire-explorer"
      aria-label="통합 동작 카탈로그 및 4·8주 프로그램"
    >
      <div className="pf-world-repertoire-panel__head">
        <div>
          <span className="pf-world-repertoire-panel__kicker">
            <Globe2 size={14} strokeWidth={1.6} aria-hidden="true" /> 통합 동작 카탈로그 ·{' '}
            {WORLD_REPERTOIRE_STATS.totalCount.toLocaleString('ko-KR')}종 · 퓨전{' '}
            {fusionCount}종 · 프로그램 {CURATED_MULTI_WEEK_PROGRAMS.length}개
          </span>
          <h3>중·상급 심화 · 바레/기능성 퓨전 &amp; 4·8주 프로그램</h3>
        </div>
        <button
          type="button"
          className={`pf-world-toggle-btn ${open ? 'is-open' : ''}`}
          data-testid="toggle-world-repertoire-btn"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? '접기' : '프로그램 · 통합 동작 펼치기'}
        </button>
      </div>

      {feedback && (
        <p className="pf-world-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {open && (
        <div className="pf-world-repertoire-panel__body">
          <div className="pf-world-scope-tabs" role="group" aria-label="통합 탐색 구분">
            <button
              type="button"
              aria-pressed={scope === 'repertoire'}
              className={scope === 'repertoire' ? 'is-active' : ''}
              onClick={() => setScope('repertoire')}
            >
              <Sparkles size={14} strokeWidth={1.6} aria-hidden="true" />
              통합 동작 ({WORLD_REPERTOIRE_STATS.totalCount.toLocaleString('ko-KR')})
            </button>
            <button
              type="button"
              aria-pressed={scope === 'programs'}
              className={scope === 'programs' ? 'is-active' : ''}
              onClick={() => setScope('programs')}
            >
              <CalendarDays size={14} strokeWidth={1.6} aria-hidden="true" />
              4·8주 프로그램 ({CURATED_MULTI_WEEK_PROGRAMS.length})
            </button>
          </div>

          {scope === 'repertoire' ? (
            <>
              <div className="pf-world-controls">
                <label className="pf-world-search">
                  <Search size={15} strokeWidth={1.6} aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPageSize(12);
                    }}
                    placeholder="동작명, 부위, 바레·팔로프 등 검색"
                    aria-label="글로벌 동작 검색"
                  />
                </label>

                <div className="pf-world-chip-row" role="group" aria-label="기구 선택">
                  {APPARATUS_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={apparatus === chip.id ? 'is-active' : ''}
                      onClick={() => {
                        setApparatus(chip.id);
                        setPageSize(12);
                      }}
                    >
                      {chip.labelKo}
                    </button>
                  ))}
                </div>

                <div className="pf-world-chip-row" role="group" aria-label="유파 및 퓨전 선택">
                  {SCHOOL_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={school === chip.id ? 'is-active' : ''}
                      onClick={() => {
                        setSchool(chip.id);
                        setPageSize(12);
                      }}
                    >
                      {chip.labelKo}
                    </button>
                  ))}
                </div>

                <div className="pf-world-chip-row" role="group" aria-label="난이도 및 계층 선택">
                  {LEVEL_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={level === chip.id ? 'is-active' : ''}
                      onClick={() => {
                        setLevel(chip.id);
                        setPageSize(12);
                      }}
                    >
                      {chip.labelKo}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={tierMode === 'all' ? 'is-active' : ''}
                    onClick={() => setTierMode((prev) => (prev === 'atomic' ? 'all' : 'atomic'))}
                  >
                    {tierMode === 'atomic' ? '대표 동작만 보기' : '변주 포함 전체 보기'}
                  </button>
                </div>
              </div>

              <p className="pf-world-count">
                표시 중 <strong>{visibleItems.length}</strong> / 조건 일치{' '}
                <strong>{filteredExercises.length.toLocaleString('ko-KR')}</strong>종
              </p>

              <div className="pf-world-card-grid">
                {visibleItems.map((ex) => {
                  const diff = formatDifficultyMeta(ex.level);
                  const schoolMeta = PILATES_SCHOOL_LABELS[ex.schoolTag];
                  return (
                    <article key={ex.id} className="pf-world-card">
                      <div className="pf-world-card__meta">
                        <span>{APPARATUS_LABELS[ex.apparatus].short}</span>
                        <span className={`pf-difficulty-badge is-${diff.tone}`}>
                          {diff.fullLabel}
                        </span>
                        <span className="pf-world-card__school">{schoolMeta.shortKo}</span>
                      </div>
                      <h4 className="pf-world-card__title">{ex.nameKo}</h4>
                      <p className="pf-world-card__benefit">
                        {ex.anatomyInsight.benefitsKo[0]}
                      </p>
                      <div className="pf-world-card__spring-row">
                        <SpringVisualPills springs={ex.springs} />
                        <small>{ex.anatomyInsight.agonistsKo.slice(0, 2).join(' · ')}</small>
                      </div>
                      <div className="pf-world-card__actions">
                        <NaturalVoiceSpeakButton
                          exercise={ex}
                          variant="compact"
                          labelKo="음성"
                          showProgressBar={false}
                          showQualityBadge={false}
                        />
                        {onOpenDetail && (
                          <button
                            type="button"
                            className="pf-world-btn-ghost"
                            onClick={() => onOpenDetail(ex)}
                          >
                            자세히
                          </button>
                        )}
                        <button
                          type="button"
                          className="pf-world-btn-primary"
                          onClick={() => handleAddWorldExercise(ex)}
                        >
                          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span>담기</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {visibleItems.length < filteredExercises.length && (
                <button
                  type="button"
                  className="pf-world-load-more"
                  onClick={() => setPageSize((prev) => prev + 16)}
                >
                  더 보기 ({filteredExercises.length - visibleItems.length}종 남음)
                </button>
              )}
            </>
          ) : (
            <div className="pf-world-program-grid">
              {CURATED_MULTI_WEEK_PROGRAMS.map((program) => {
                const diff = formatDifficultyMeta(program.level);
                return (
                  <article key={program.id} className="pf-world-program-card">
                    <div className="pf-world-card__meta">
                      <span>
                        {program.apparatus.length > 1
                          ? program.apparatus.map((a) => APPARATUS_LABELS[a].short).join(' + ')
                          : APPARATUS_LABELS[program.apparatus[0]].short}{' '}
                        · {program.durationWeeks}주 ({program.targetMinutesPerClass}분)
                      </span>
                      <span className={`pf-difficulty-badge is-${diff.tone}`}>
                        {diff.fullLabel}
                      </span>
                    </div>
                    <h4>{program.titleKo}</h4>
                    <p>{program.subtitleKo}</p>
                    <ul className="pf-world-program-weeks">
                      {program.weeks.slice(0, 4).map((w) => (
                        <li key={w.weekNumber}>
                          <strong>{w.weekNumber}주차</strong> {w.themeKo}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="pf-world-btn-primary is-full"
                      onClick={() => handleApplyProgramWeek1(program)}
                    >
                      1주차 수업 만들기에 바로 적용
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
