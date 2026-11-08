import { MotionDraftSegmentRehearsal } from './MotionDraftSegmentRehearsal';
import { MotionDraftReviewWorksheet } from './MotionDraftReviewWorksheet';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  EXTENDED_CANDIDATE_JOINT_KEYS,
  EXTENDED_CANDIDATE_MOTION_MODELS,
} from '../data/extendedMotionVerificationCatalog';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import { groupMotionDraftOptions } from '../data/motionDraftIndex';
import { useMotionDraftPlayback } from '../hooks/useMotionDraftPlayback';
import { MOTION_REVIEW_COMPARISON_NOTES_SCOPE } from '../utils/motionReviewWorksheet';
import type { AnatomicalSide, MotionDraftId } from '../models/types';
import { MotionDraftFigure } from './MotionDraftFigure';
import {
  MotionStoryboardBuilder,
  type MotionStoryboardFigureProps,
} from './MotionStoryboardBuilder';
import '../styles/motion-draft-lab.css';

export interface MotionDraftLabDialogProps {
  open: boolean;
  onClose: () => void;
  initialDraftId?: MotionDraftId;
}

/** Independent design-review lab. It never supplies an exercise asset or writes planning data. */
export function MotionDraftLabDialog({
  open,
  onClose,
  initialDraftId = 'supported-heel-raise',
}: MotionDraftLabDialogProps) {
  if (!open) return null;
  return (
    <OpenMotionDraftLab key={initialDraftId} initialDraftId={initialDraftId} onClose={onClose} />
  );
}

function OpenMotionDraftLab({ initialDraftId, onClose }: Omit<MotionDraftLabDialogProps, 'open'>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const [selectedId, setSelectedId] = useState<MotionDraftId | null>(
    () => getMotionDraft(initialDraftId)?.id ?? null,
  );
  const [activeSide, setActiveSide] = useState<AnatomicalSide>('right');
  const [mirrored, setMirrored] = useState(false);
  const [mode, setMode] = useState<'single' | 'storyboard'>('single');
  const [singlePanel, setSinglePanel] = useState<'whole' | 'segment'>('whole');
  const wholeActive = mode === 'single' && singlePanel === 'whole';
  const previousPanel = useRef(singlePanel);
  const { state, controller, reducedMotion } = useMotionDraftPlayback(
    dialogRef,
    sceneRef,
    wholeActive ? selectedId : null,
    wholeActive,
  );
  const id = useId();
  const selected = getMotionDraft(selectedId);
  const phase =
    selected?.phases.find((item) => state.progress < item.end) ?? selected?.phases.at(-1);
  useLayoutEffect(() => {
    if (previousPanel.current === singlePanel) return;
    previousPanel.current = singlePanel;
    if (mode !== 'single') return;
    const destination =
      singlePanel === 'segment'
        ? dialogRef.current?.querySelector<HTMLElement>('.motion-draft-segment-rehearsal')
        : sceneRef.current;
    destination?.focus({ preventScroll: true });
    const dialog = dialogRef.current;
    if (dialog && destination) {
      const header = dialog.querySelector<HTMLElement>('.mdl-header');
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      // Keep the selected tool beneath the sticky close/title row on narrow screens.
      dialog.scrollTop +=
        destination.getBoundingClientRect().top -
        dialog.getBoundingClientRect().top -
        headerHeight -
        16;
    }
  }, [mode, singlePanel]);
  const closeOnce = () => {
    if (closing.current) return;
    closing.current = true;
    if (opener.current?.isConnected) opener.current.focus();
    onClose();
  };
  const close = () => {
    controller.pause();
    if (dialogRef.current?.open) dialogRef.current.close();
    closeOnce();
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    closing.current = false;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      closing.current = true;
      controller.destroy();
      if (dialog?.open) dialog.close();
      if (opener.current?.isConnected) opener.current.focus();
    };
  }, [controller]);

  const selectDraft = (next: MotionDraftId) => {
    controller.reset();
    setActiveSide('right');
    setMirrored(false);
    setSelectedId(next);
  };
  return (
    <dialog
      ref={dialogRef}
      className="motion-draft-lab"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={(event) => {
        if (event.currentTarget.open) return;
        controller.pause();
        closeOnce();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !event.currentTarget.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !event.currentTarget.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || 'closedBy' in HTMLDialogElement.prototype)
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          close();
      }}
    >
      <div className="mdl-shell">
        <header className="mdl-header">
          <div>
            <p className="mdl-eyebrow">설계 검토 도구 · DESIGN LAB</p>
            <h2 id={`${id}-title`}>모션 변형 제안 검토</h2>
          </div>
          <button
            type="button"
            className="mdl-secondary"
            onClick={close}
            aria-label="모션 설계 검토 닫기"
          >
            닫기
          </button>
        </header>
        <p className="mdl-description" id={`${id}-description`}>
          원본 모션 {MOTION_DRAFTS.length}종의 미검토 제작 초안입니다. 완성된 운동 시범이 아닙니다.
        </p>
        <div className="mdl-boundary" aria-label="모션 제안 검토 범위">
          <span>전문가 검토 0건</span>
          <span>완성 자산 0건</span>
          <span>안전성 미평가 · 자동 추천 제외</span>
        </div>
        <div className="mdl-modes" role="group" aria-label="제작 미리보기 종류">
          <button
            type="button"
            aria-pressed={mode === 'single'}
            onClick={() => {
              controller.reset();
              setMode('single');
            }}
          >
            개별 동작
          </button>
          <button
            type="button"
            aria-pressed={mode === 'storyboard'}
            onClick={() => {
              controller.reset();
              setMode('storyboard');
            }}
          >
            조합 미리보기
          </button>
        </div>
        <div hidden={mode !== 'storyboard'}>
          <MotionStoryboardBuilder
            drafts={MOTION_DRAFTS}
            renderFigure={renderStoryboardFigure}
            active={mode === 'storyboard'}
          />
        </div>
        {mode === 'single' && (
          <>
            <div className="mdl-picker">
              <label htmlFor={`${id}-draft`}>제작 초안 선택</label>
              <select
                id={`${id}-draft`}
                aria-label="제작 초안 선택"
                value={selectedId ?? ''}
                onChange={(event) => {
                  const next = getMotionDraft(event.target.value);
                  if (next) selectDraft(next.id);
                }}
              >
                {!selected && <option value="">동작을 선택하세요</option>}
                {groupMotionDraftOptions(MOTION_DRAFTS).map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((draft) => (
                      <option key={draft.id} value={draft.id}>
                        {draft.title} · 미검토
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {selected ? (
              <>
                <section className="mdl-selected" aria-label="선택한 변형 제안">
                  <h3>{selected.title}</h3>
                  <p className="mdl-support">{selected.supportSummary ?? selected.supportNote}</p>
                </section>
                {singlePanel === 'segment' ? (
                  <MotionDraftSegmentRehearsal
                    key={selected.id}
                    draft={selected}
                    active={mode === 'single'}
                    activeSide={activeSide}
                    mirrored={mirrored}
                    onExit={() => setSinglePanel('whole')}
                  />
                ) : (
                  <>
                    <div
                      ref={sceneRef}
                      className="mdl-scene"
                      role="group"
                      aria-label="개별 모션 도해"
                      tabIndex={-1}
                    >
                      <MotionDraftFigure
                        draftId={selected.id}
                        progress={state.progress}
                        activeSide={activeSide}
                        mirrored={mirrored}
                      />
                    </div>
                    <div className="mdl-playback-heading">
                      <p role="status" aria-live="polite">
                        {state.playing
                          ? '재생 중 · 도해 한 주기'
                          : state.progress === 1
                            ? '한 주기 종료 · 일시정지'
                            : '일시정지 · 자동 재생 없음'}
                      </p>
                      <span>
                        {phase?.labelKo ?? phase?.label} · {Math.round(state.progress * 100)}%
                      </span>
                    </div>
                    <div className="mdl-playback" role="group" aria-label="도해 재생 제어">
                      <button
                        type="button"
                        disabled={state.playing || reducedMotion}
                        onClick={() => controller.play()}
                      >
                        한 주기 재생
                      </button>
                      <button
                        type="button"
                        className="mdl-secondary"
                        disabled={!state.playing}
                        onClick={() => controller.pause()}
                      >
                        일시정지
                      </button>
                      <button
                        type="button"
                        className="mdl-secondary"
                        onClick={() => controller.reset()}
                      >
                        처음으로
                      </button>
                      <label>
                        도해 재생 속도
                        <select
                          aria-label="도해 재생 속도"
                          aria-describedby={`${id}-display-timing`}
                          value={state.speed}
                          onChange={(event) => controller.setSpeed(Number(event.target.value))}
                        >
                          <option value={0.5}>0.5×</option>
                          <option value={0.75}>0.75×</option>
                          <option value={1}>1×</option>
                        </select>
                      </label>
                    </div>
                    <p className="mdl-description" id={`${id}-display-timing`}>
                      시간·속도는 도해 표시용입니다. 실제 운동의 권장 속도·횟수·운동량이 아닙니다.
                    </p>
                    <label className="mdl-progress">
                      도해 위치
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={1}
                        value={Math.round(state.progress * 1000)}
                        onChange={(event) => controller.seek(Number(event.target.value) / 1000)}
                      />
                    </label>
                    <div className="mdl-phases" role="group" aria-label="다섯 단계 정지 그림">
                      {selected.phases.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="mdl-secondary"
                          onClick={() => controller.seek(item.sample)}
                        >
                          {item.labelKo ?? item.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mdl-secondary"
                      onClick={() => {
                        controller.pause();
                        setSinglePanel('segment');
                      }}
                    >
                      선택 구간 연습 열기
                    </button>
                  </>
                )}
                <div className="mdl-view-options">
                  <label>
                    {selected.sideMode === 'bilateral'
                      ? '양쪽 함께 · 좌우 분리 없음'
                      : (selected.sideControlLabel ?? '움직이는 쪽')}
                    <select
                      aria-label={
                        selected.sideMode === 'bilateral'
                          ? '양쪽 함께 · 좌우 분리 없음'
                          : (selected.sideControlLabel ?? '움직이는 쪽')
                      }
                      value={selected.sideMode === 'bilateral' ? 'together' : activeSide}
                      disabled={selected.sideMode === 'bilateral'}
                      onChange={(event) => {
                        controller.reset();
                        setActiveSide(event.target.value as AnatomicalSide);
                      }}
                    >
                      {selected.sideMode === 'bilateral' ? (
                        <option value="together">양쪽 함께</option>
                      ) : (
                        <>
                          <option value="right">몸의 오른쪽</option>
                          <option value="left">몸의 왼쪽</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="mdl-checkbox">
                    <input
                      type="checkbox"
                      checked={mirrored}
                      onChange={(event) => {
                        controller.reset();
                        setMirrored(event.target.checked);
                      }}
                    />
                    화면만 반전 · 몸의 좌우 유지
                  </label>
                </div>
                <p className="mdl-description">
                  {selected.sideMode === 'unilateral'
                    ? selected.sideRole === 'moving-leg'
                      ? `움직이는 다리는 몸의 ${sideKo(activeSide)}, 반대쪽 다리는 지지면에 둡니다. `
                      : selected.sideRole === 'moving-arm'
                        ? `움직이는 팔은 몸의 ${sideKo(activeSide)}입니다. 지지 조건은 제안 정보에서 확인하세요. `
                        : `위쪽은 몸의 ${sideKo(activeSide)}, 아래쪽은 반대쪽입니다. `
                    : '실선은 몸의 왼쪽, 점선은 몸의 오른쪽입니다. '}
                  화면 반전은 해부학적 쪽을 바꾸지 않습니다.
                </p>
                {reducedMotion && (
                  <p className="mdl-static-note">
                    동작 줄이기 설정 · 정지 단계와 위치 조절만 표시합니다.
                  </p>
                )}
                <p className="mdl-description">
                  8초 한 주기는 그림 검토를 위한 표시값입니다. 실제 수행 시간·횟수·세트·호흡·가동
                  범위를 권하지 않습니다. 화면 밖·백그라운드·닫기 시 재생을 멈춥니다.
                </p>
                <MotionDraftReviewWorksheet key={`review-${selected.id}`} draft={selected} />
                <details className="mdl-evidence">
                  <summary>출처·카탈로그 대조 · 일치·미확인·불일치</summary>
                  <section>
                    <h4>변형의 연결 정보</h4>
                    <p>{selected.variant}</p>
                    <p>
                      의도한 카탈로그 ID: <code>{selected.intendedExerciseId}</code>
                    </p>
                    <p>{selected.supportNote}</p>
                    {selected.variantRequirements && (
                      <>
                        <h4>이 제안의 준비물 · 기존 계획 조건과 별도</h4>
                        <ul>
                          {selected.variantRequirements.map((item) => (
                            <li key={item.id}>
                              {item.label} ·{' '}
                              {item.basis === 'source-text'
                                ? '원문 기재'
                                : item.basis === 'author-choice'
                                  ? '저작 선택'
                                  : '원문과 저작 선택 구분 필요'}
                            </li>
                          ))}
                        </ul>
                        <p>정확한 원문 변형 미대조 · 전문가 검토 필요</p>
                      </>
                    )}
                  </section>
                  <section>
                    <h4>참고 패턴·대조 메모</h4>
                    <p>{MOTION_REVIEW_COMPARISON_NOTES_SCOPE}</p>
                    <ul>
                      {selected.matched.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4>미확인</h4>
                    <ul>
                      {selected.unknown.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4>불일치·누락</h4>
                    {selected.mismatched.length ? (
                      <ul>
                        {selected.mismatched.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        직접적인 설명 모순은 찾지 못했으나, 위의 미확인 요구 조건이 해결된 것은
                        아닙니다.
                      </p>
                    )}
                  </section>
                  <section>
                    <h4>보존된 원문 출처</h4>
                    {selected.sources.map((source) => (
                      <div key={source.sourceId ?? source.url} className="mdl-source-record">
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.label}
                        </a>
                        {source.context && <p>{source.context}</p>}
                        {source.factualRecordSha256 && (
                          <p className="mdl-source-hash">
                            사실 기록 해시 · {source.factualRecordSha256.slice(0, 12)}… · 모션 검수
                            해시가 아닙니다.
                          </p>
                        )}
                      </div>
                    ))}
                    <p>
                      원문 확인일(UTC): {selected.sourceFactsCheckedAt ?? '2026-11-04'}. 조건별 임상
                      자료가 포함되어 있으며 일반 성인의 적합성을 확인한 것은 아닙니다. 원문 매체는
                      복제·추적하지 않았고, 원문 사실 확인은 이 도해의 전문 검토가 아닙니다.
                    </p>
                  </section>
                </details>
              </>
            ) : (
              <p className="mdl-support">
                선택한 변형 제안을 찾을 수 없습니다. 위 목록에서 명시된 제안을 직접 선택하세요.
              </p>
            )}
          </>
        )}
        <ExtendedCandidateLabSection />
        <footer className="mdl-footer">
          <p>제안 상태만 유지합니다. 계획 검토·자격·모션 전문가 승인 상태를 변경하지 않습니다.</p>
          <button type="button" className="mdl-secondary" onClick={close}>
            검토 도구 닫기
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function ExtendedCandidateLabSection() {
  const [candidateId, setCandidateId] = useState<string>(
    EXTENDED_CANDIDATE_MOTION_MODELS[0]?.candidateId ?? 'prone-baby-swan',
  );
  const [candidateProgressPct, setCandidateProgressPct] = useState<number>(50);

  const candidateModel =
    EXTENDED_CANDIDATE_MOTION_MODELS.find((m) => m.candidateId === candidateId) ??
    EXTENDED_CANDIDATE_MOTION_MODELS[0];

  const pose = candidateModel.samplePose(candidateProgressPct / 100);

  return (
    <details className="mdl-evidence" data-testid="extended-candidate-models-lab-section">
      <summary>매트 미완 후보 8종 연속·3단계 모션 스터디 대조 (확장 카탈로그)</summary>
      <div style={{ paddingTop: '8px' }}>
        <p className="mdl-description">
          MOTION_DRAFTS 17종과 별도로 관리되는 매트 후보 8종의 연속·3단계 모션 도해 및 SHA-256 원문 사실 대조 섹션입니다 (전문가 모션 검토 0건 · 해부학적 정밀성 가정 안 함).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <label>
            확장 후보 모션 선택{' '}
            <select
              aria-label="확장 후보 모션 선택"
              data-testid="extended-candidate-select"
              value={candidateModel.candidateId}
              onChange={(e) => {
                setCandidateId(e.target.value);
                setCandidateProgressPct(50);
              }}
            >
              {EXTENDED_CANDIDATE_MOTION_MODELS.map((item) => (
                <option key={item.candidateId} value={item.candidateId}>
                  {item.titleKo} ({item.candidateId})
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="mdl-secondary"
              onClick={() => setCandidateProgressPct(0)}
            >
              후보 시작 0%
            </button>
            <button
              type="button"
              className="mdl-secondary"
              onClick={() => setCandidateProgressPct(50)}
            >
              후보 정점 50%
            </button>
            <button
              type="button"
              className="mdl-secondary"
              onClick={() => setCandidateProgressPct(100)}
            >
              후보 복귀 100%
            </button>
          </div>
        </div>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          확장 후보 연속 진행률 ({candidateProgressPct}%)
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            aria-label="확장 후보 연속 진행률"
            data-testid="extended-candidate-progress-range"
            value={candidateProgressPct}
            onChange={(e) => setCandidateProgressPct(Number(e.target.value))}
          />
        </label>
        <svg
          data-testid="extended-lab-candidate-svg"
          data-candidate-id={candidateModel.candidateId}
          data-exercise-id={candidateModel.exerciseId}
          data-phase-id={pose.phaseId}
          data-progress={pose.progress}
          viewBox={candidateModel.viewBox}
          aria-label={`${candidateModel.titleKo} ${pose.phaseLabelKo}`}
          style={{
            width: '100%',
            maxHeight: '200px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
          }}
        >
          <line x1={70} y1={252} x2={590} y2={252} stroke="#64748b" strokeWidth={4} />
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
          {EXTENDED_CANDIDATE_JOINT_KEYS.map((jk) => (
            <circle
              key={jk}
              cx={pose.joints[jk].x}
              cy={pose.joints[jk].y}
              r={3}
              fill="#ffffff"
              stroke="#0f172a"
            />
          ))}
        </svg>
        <p data-testid="extended-lab-candidate-cue">
          <strong>{pose.phaseLabelKo}:</strong> {pose.phaseCueKo}
        </p>
        <p data-testid="extended-lab-candidate-sha256">
          대조 카탈로그 ID: <code>{candidateModel.exerciseId}</code> · 사실 기록 해시(SHA-256):{' '}
          <code>{candidateModel.factualRecordSha256}</code> · 확인일: {candidateModel.checkedAt}
        </p>
        <ul>
          {candidateModel.sources.map((src) => (
            <li key={src.sourceId}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.publisher} · {src.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

const sideKo = (side: AnatomicalSide) => (side === 'right' ? '오른쪽' : '왼쪽');

function renderStoryboardFigure(props: MotionStoryboardFigureProps) {
  const draft = getMotionDraft(props.draftId);
  return draft ? (
    <MotionDraftFigure {...props} draftId={draft.id} />
  ) : (
    <p>연결된 제작 초안이 없습니다.</p>
  );
}
