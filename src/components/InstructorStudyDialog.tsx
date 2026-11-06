import { useMemo, useState } from 'react';
import { Bookmark, Check, Eye, EyeOff, Search } from 'lucide-react';
import { CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import type { PilatesExercise, LayerMode } from '../types/pilates';
import type { InstructorStudyState } from '../types/instructorStudy';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
import { LightDismissDialog } from './LightDismissDialog';
import { MotionReferencePlayer } from './MotionReferencePlayer';
import '../styles/instructor-study.css';

const INSTRUCTOR_TUTORIAL_TASKS = [
  {
    id: 'conditions',
    title: '다음 수업 조건 준비',
    body: '계획의 수업 조건에서 반·장소의 보유 장비, 목표 시간과 휴식을 정합니다. 반별 조건은 명시적으로 저장·적용하며, 나이는 난이도를 자동으로 정하지 않습니다.',
  },
  {
    id: 'compose',
    title: '블록을 조합하고 검토',
    body: '직접 등록·검토한 동작을 추가하고 순서·좌우·횟수·시간을 편집합니다. 필요한 블록은 잠근 뒤 나머지만 다시 추천할 수 있습니다. 전체 시간에는 설명·전환·휴식을 포함합니다.',
  },
  {
    id: 'rehearse',
    title: '리허설로 흐름 숙지',
    body: '전체 수업 계획 미리보기에서 항목·구간을 선택하고 느린 속도로 시간표를 연습합니다. 정확한 모션이 없는 동작은 제작 대기로 표시합니다. 동작 라이브러리의 관련 제작 초안에서는 미검토 도해의 선택 구간을 따로 연습할 수 있습니다. 리허설 기록이 운동 검수나 실제 수업 기록이 되지는 않습니다.',
  },
  {
    id: 'teach-record',
    title: '수업 진행과 기록 보관',
    body: '시간과 검토 조건이 맞는 수업안을 수업 모드로 진행합니다. 휴식도 시간에 포함되며 일시정지·다음 항목으로 이동할 수 있습니다. 종료 후 실제 시간·체감 강도·회고를 기록하고 백업을 보관합니다.',
  },
] as const;

interface InstructorStudyDialogProps {
  exercises: readonly PilatesExercise[];
  study: InstructorStudyState;
  onToggleBookmark: (exerciseId: string) => void;
  onCueHiddenChange: (hidden: boolean) => void;
  onTutorialTaskChange: (taskId: string, complete: boolean) => void;
  onOpenReview: (exercise: PilatesExercise) => void;
  onClose: () => void;
  initialExerciseId?: string;
  initialMode?: 'study' | 'guide';
}

export function InstructorStudyDialog({
  exercises,
  study,
  onToggleBookmark,
  onCueHiddenChange,
  onTutorialTaskChange,
  onOpenReview,
  onClose,
  initialExerciseId,
  initialMode = 'study',
}: InstructorStudyDialogProps) {
  const [mode, setMode] = useState(initialMode);
  const [search, setSearch] = useState('');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(initialExerciseId ?? exercises[0]?.id ?? '');
  const [layer, setLayer] = useState<LayerMode>('standard');
  const [limit, setLimit] = useState({ signature: '', count: 6 });
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const filtered = useMemo(() => {
    const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return exercises.filter(
      (exercise) =>
        (!bookmarksOnly || study.bookmarkedExerciseIds.includes(exercise.id)) &&
        terms.every((term) =>
          `${exercise.nameKo} ${exercise.nameEn}`.toLocaleLowerCase().includes(term),
        ),
    );
  }, [exercises, search, bookmarksOnly, study.bookmarkedExerciseIds]);
  const selected = filtered.find((exercise) => exercise.id === selectedId) ?? filtered[0];
  const reviewed = selected && getExerciseReviewState(selected) === 'approved';
  const signature = JSON.stringify([search, bookmarksOnly]);
  const count = limit.signature === signature ? limit.count : 6;
  const task = INSTRUCTOR_TUTORIAL_TASKS[tutorialIndex];
  const taskComplete = study.completedTutorialTaskIds.includes(task.id);

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      title="강사 연습실"
      subtitle="동작 자료를 기억하고, 수업 준비 과정을 짧게 연습하세요."
      maxWidth="900px"
    >
      <div className="instructor-study">
        <div className="study-modes" role="group" aria-label="연습실 보기">
          <button type="button" aria-pressed={mode === 'study'} onClick={() => setMode('study')}>
            동작 숙지
          </button>
          <button type="button" aria-pressed={mode === 'guide'} onClick={() => setMode('guide')}>
            사용법 다시 보기
          </button>
        </div>
        {mode === 'guide' ? (
          <section className="study-guide" aria-label="수업 준비 사용법">
            <p className="study-step-counter">
              {tutorialIndex + 1} / {INSTRUCTOR_TUTORIAL_TASKS.length} · 과업별 안내
            </p>
            <h3>{task.title}</h3>
            <p>{task.body}</p>
            <label className="study-task-check">
              <input
                type="checkbox"
                checked={taskComplete}
                onChange={(event) => onTutorialTaskChange(task.id, event.target.checked)}
              />
              이 기능을 직접 해봤어요
            </label>
            <p className="muted">
              개인 사용법 체크입니다. 전문가 자격이나 동작·모션 검수 완료를 뜻하지 않습니다.
            </p>
            <nav className="study-guide-navigation" aria-label="사용법 단계">
              <button
                type="button"
                className="btn-secondary"
                disabled={tutorialIndex === 0}
                onClick={() => setTutorialIndex((index) => index - 1)}
              >
                이전
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={tutorialIndex === INSTRUCTOR_TUTORIAL_TASKS.length - 1}
                onClick={() => setTutorialIndex((index) => index + 1)}
              >
                다음
              </button>
            </nav>
          </section>
        ) : (
          <div className="study-layout">
            <aside className="study-browser" aria-label="숙지할 동작 선택">
              <label className="study-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">연습할 동작 검색</span>
                <input
                  type="search"
                  value={search}
                  placeholder="동작 이름 검색"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="study-bookmark-filter"
                aria-pressed={bookmarksOnly}
                onClick={() => setBookmarksOnly((value) => !value)}
              >
                <Bookmark size={15} /> 북마크만{' '}
                {
                  study.bookmarkedExerciseIds.filter((id) =>
                    exercises.some((exercise) => exercise.id === id),
                  ).length
                }
              </button>
              <p className="muted" role="status">
                {filtered.length}개 동작 노트
              </p>
              <div className="study-exercise-list">
                {filtered.slice(0, count).map((exercise) => (
                  <button
                    type="button"
                    key={exercise.id}
                    aria-pressed={selected?.id === exercise.id}
                    onClick={() => {
                      setSelectedId(exercise.id);
                      setLayer('standard');
                    }}
                  >
                    <span>{exercise.nameKo}</span>
                    {study.bookmarkedExerciseIds.includes(exercise.id) && (
                      <Bookmark size={14} aria-label="북마크" />
                    )}
                  </button>
                ))}
              </div>
              {filtered.length === 0 && (
                <p>조건에 맞는 동작이 없습니다. 검색어나 북마크 조건을 바꿔 주세요.</p>
              )}
              {filtered.length > count && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setLimit({ signature, count: count + 6 })}
                >
                  {Math.min(6, filtered.length - count)}개 더 보기
                </button>
              )}
            </aside>
            {selected ? (
              <section className="study-detail" aria-label="선택한 동작 숙지">
                <header>
                  <div>
                    <span className="eyebrow">MOVEMENT STUDY</span>
                    <h3>{selected.nameKo}</h3>
                    <p className="muted">{selected.nameEn}</p>
                  </div>
                  <button
                    type="button"
                    className="study-save-bookmark"
                    aria-pressed={study.bookmarkedExerciseIds.includes(selected.id)}
                    onClick={() => onToggleBookmark(selected.id)}
                  >
                    <Bookmark size={17} />
                    {study.bookmarkedExerciseIds.includes(selected.id) ? '북마크됨' : '북마크'}
                  </button>
                </header>
                <p className="study-metadata">
                  계획 노트 역할 ·{' '}
                  {CANONICAL_BLOCKS.find((block) => block.category === selected.blockCategory)
                    ?.nameKo ?? selected.blockCategory}{' '}
                  · 이 분류는 수업 효과나 개인 적합성의 보장이 아닙니다.
                </p>
                <MotionReferencePlayer
                  key={selected.id}
                  exerciseId={selected.id}
                  exerciseName={selected.nameKo}
                />
                <ExerciseEvidencePanel exercise={selected} />
                {reviewed ? (
                  <section className="study-recall" aria-label="티칭 큐 기억 연습">
                    <div className="study-recall-heading">
                      <h4>내가 검토한 티칭 메모</h4>
                      <button
                        type="button"
                        className="btn-secondary"
                        aria-expanded={!study.rehearsalCueHidden}
                        onClick={() => onCueHiddenChange(!study.rehearsalCueHidden)}
                      >
                        {study.rehearsalCueHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {study.rehearsalCueHidden ? '큐 확인하기' : '큐 숨기기'}
                      </button>
                    </div>
                    {study.rehearsalCueHidden ? (
                      <p>호흡·큐·난이도 대안을 먼저 떠올린 뒤 확인해 보세요.</p>
                    ) : (
                      <div className="study-revealed-cues">
                        <p>
                          <strong>호흡 메모</strong> {selected.breathPattern || '미입력'}
                        </p>
                        <ul>
                          {selected.cues.map((cue, index) => (
                            <li key={`${index}-${cue}`}>{cue}</li>
                          ))}
                        </ul>
                        <label className="form-field">
                          <span>강사가 작성한 난이도 대안</span>
                          <select
                            value={layer}
                            onChange={(event) => setLayer(event.target.value as LayerMode)}
                          >
                            <option value="easy">쉬운 대안</option>
                            <option value="standard">기본 대안</option>
                            <option value="hard">진행 대안</option>
                          </select>
                        </label>
                        <p>{selected.layers[layer] || '이 대안은 작성하지 않았습니다.'}</p>
                        <p>
                          <strong>주의 메모</strong> {selected.precautions || '미입력'}
                        </p>
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="study-review-needed">
                    <h4>설정·호흡·큐는 강사 검토 후 숙지</h4>
                    <p>
                      현재 노트는 미검토이거나 내용 변경 후 재검토가 필요합니다. 개인 검토와 실제
                      전문가 자격 확인은 별개입니다.
                    </p>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(event) => {
                        event.currentTarget.closest('dialog')?.close();
                        onOpenReview(selected);
                      }}
                    >
                      동작 노트에서 직접 검토
                    </button>
                  </div>
                )}
                <p className="study-learning-boundary">
                  <Check size={15} aria-hidden="true" />
                  북마크·큐 연습·사용법 체크는 동작 검토나 자격 인증 상태를 바꾸지 않습니다. 정확한
                  모션이 없는 동작은 임의 시범으로 대체하지 않습니다.
                </p>
              </section>
            ) : (
              <section>
                <h3>숙지할 동작을 선택하세요</h3>
                <p>동작 노트를 직접 등록하면 이곳에서 다시 확인할 수 있습니다.</p>
              </section>
            )}
          </div>
        )}
      </div>
    </LightDismissDialog>
  );
}
