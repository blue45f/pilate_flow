import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { groupMotionDraftOptions } from "../data/motionDraftIndex";
import { useMotionStoryboardPlayback } from "../hooks/useMotionStoryboardPlayback";
import type { StoryboardPlaybackSpeed } from "../hooks/useMotionStoryboardPlayback";
import {
  buildStoryboardTimeline,
  decodeStoryboardJson,
  encodeStoryboardJson,
  formatStoryboardTime,
  makeMotionBlock,
  makeRestBlock,
  resolveStoryboardPosition,
  STORYBOARD_MAX_BLOCKS,
  STORYBOARD_MAX_JSON_BYTES,
} from "../utils/motionStoryboard";
import type {
  MotionStoryboardDraft,
  StoryboardBlock,
  StoryboardMotionBlock,
} from "../utils/motionStoryboard";
import "../styles/motion-storyboard.css";

export type { MotionStoryboardDraft } from "../utils/motionStoryboard";

export interface MotionStoryboardFigureProps {
  draftId: string;
  progress: number;
  activeSide: "left" | "right";
  mirrored: boolean;
}

interface StoryboardDraftFacts extends MotionStoryboardDraft {
  readonly variant?: string;
  readonly supportNote?: string;
  readonly variantRequirements?: readonly {
    readonly id: string;
    readonly label: string;
    readonly basis: string;
  }[];
  readonly matched?: readonly string[];
  readonly unknown?: readonly string[];
  readonly mismatched?: readonly string[];
  readonly sources?: readonly {
    label: string;
    url: string;
    context?: string;
    factualRecordSha256?: string;
  }[];
}

export interface MotionStoryboardBuilderProps {
  drafts: readonly StoryboardDraftFacts[];
  renderFigure: (props: MotionStoryboardFigureProps) => ReactNode;
  active: boolean;
}

function snapshotOf(
  drafts: readonly StoryboardDraftFacts[],
  blocks: readonly StoryboardBlock[],
) {
  try {
    return JSON.stringify({ drafts, blocks });
  } catch {
    return null;
  }
}

function isSourceUrl(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Local authoring preview only. No class, asset, registry, approval or remote write path. */
export function MotionStoryboardBuilder({
  drafts,
  renderFigure,
  active,
}: MotionStoryboardBuilderProps) {
  const id = useId();
  const serial = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<readonly StoryboardBlock[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [workspace, setWorkspace] = useState<"compose" | "preview">("compose");
  const [pauseBeforeBlocks, setPauseBeforeBlocks] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [fileMessage, setFileMessage] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const importRequest = useRef(0);
  const downloadUrl = useRef<string | null>(null);
  const timeline = buildStoryboardTimeline(blocks, drafts);
  const snapshot = snapshotOf(drafts, blocks);
  const latestSnapshot = useRef(snapshot);
  useLayoutEffect(() => {
    latestSnapshot.current = snapshot;
  }, [snapshot]);
  useEffect(
    () => () => {
      importRequest.current += 1;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    },
    [],
  );
  const playable =
    active && workspace === "preview" && timeline.valid && snapshot !== null;
  const { state, controller, reducedMotion } = useMotionStoryboardPlayback({
    totalSeconds:
      timeline.valid && snapshot !== null ? timeline.totalSeconds : 0,
    snapshotKey: snapshot ?? "invalid-storyboard-snapshot",
    active: playable,
    sceneRef,
    blockStarts: timeline.segments
      .filter(
        (segment, index, segments) =>
          index > 0 && segment.blockIndex !== segments[index - 1].blockIndex,
      )
      .map((segment) => segment.startSeconds),
    pauseBeforeBlocks,
    guardFrameGaps: true,
  });
  useLayoutEffect(() => {
    if (!active) return;
    const dialog = sceneRef.current?.closest("dialog");
    dialog?.scrollTo?.({ top: 0 });
    if (workspace === "preview")
      sceneRef.current?.focus({ preventScroll: true });
    else document.getElementById(`${id}-draft`)?.focus({ preventScroll: true });
  }, [active, id, workspace]);
  const changeWorkspace = (next: "compose" | "preview") => {
    controller.pause();
    setWorkspace(next);
  };
  const position = resolveStoryboardPosition(timeline, state.elapsedSeconds);
  const segment = position?.segment;
  const currentDraft =
    segment?.kind === "motion"
      ? drafts.find((draft) => draft.id === segment.draftId)
      : null;
  const atEnd =
    timeline.totalSeconds > 0 && state.elapsedSeconds >= timeline.totalSeconds;
  const cycleLabel =
    segment?.kind === "motion"
      ? `${segment.cycleIndex + 1}번째 표시 주기 · ${segment.side === "together" ? "양쪽 함께" : segment.side === "left" ? "몸의 왼쪽" : "몸의 오른쪽"}`
      : "쉼 블록";
  const edit = (next: readonly StoryboardBlock[]) => {
    controller.reset();
    setBlocks(next);
  };
  const nextId = (kind: "motion" | "rest") => {
    let candidate = `${kind}-${++serial.current}`;
    while (blocks.some((block) => block.id === candidate))
      candidate = `${kind}-${++serial.current}`;
    return candidate;
  };
  const exportFile = () => {
    controller.pause();
    const result = encodeStoryboardJson(blocks, drafts);
    if (!result.ok) {
      setFileMessage({ error: true, text: result.error });
      return;
    }
    if (typeof URL.createObjectURL !== "function") {
      setFileMessage({
        error: true,
        text: "이 환경에서는 파일 다운로드를 사용할 수 없습니다.",
      });
      return;
    }
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = URL.createObjectURL(
      new Blob([result.json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl.current;
    link.download = "motion-storyboard-review-only-v1.json";
    document.body.append(link);
    link.click();
    link.remove();
    setFileMessage({
      error: false,
      text: "미검토 제작 조합 JSON을 다운로드했습니다.",
    });
  };
  const importSelectedFile = () => {
    controller.pause();
    if (!importFile) return;
    if (importFile.size > STORYBOARD_MAX_JSON_BYTES) {
      setFileMessage({
        error: true,
        text: "제작 조합 파일은 64KiB 이하여야 합니다.",
      });
      return;
    }
    const request = ++importRequest.current;
    const initialSnapshot = snapshot;
    setImportPending(true);
    setFileMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (request !== importRequest.current) return;
      setImportPending(false);
      if (latestSnapshot.current !== initialSnapshot) {
        setFileMessage({
          error: true,
          text: "불러오는 동안 제안이나 조합이 바뀌었습니다. 현재 조합을 유지했습니다.",
        });
        return;
      }
      const result = decodeStoryboardJson(
        typeof reader.result === "string" ? reader.result : "",
        drafts,
      );
      if (!result.ok) {
        setFileMessage({
          error: true,
          text: `${result.error} 현재 조합을 유지했습니다.`,
        });
        return;
      }
      edit(result.blocks);
      setFileMessage({
        error: false,
        text: "미검토 제작 조합을 불러왔습니다. 일시정지 상태입니다.",
      });
    };
    reader.onerror = () => {
      if (request !== importRequest.current) return;
      setImportPending(false);
      setFileMessage({
        error: true,
        text: "파일을 읽지 못했습니다. 현재 조합을 유지했습니다.",
      });
    };
    reader.readAsText(importFile);
  };
  const update = (
    blockId: string,
    patch: Partial<StoryboardMotionBlock> | { seconds: number },
  ) => {
    edit(
      blocks.map((block) =>
        block.id === blockId
          ? ({ ...block, ...patch } as StoryboardBlock)
          : block,
      ),
    );
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    edit(next);
  };
  const navigate = (direction: -1 | 1) => {
    if (!segment) return;
    const next = timeline.segments[segment.index + direction];
    controller.seek(
      next?.startSeconds ?? (direction === 1 ? timeline.totalSeconds : 0),
    );
  };
  const staticPhase = (progress: number) => {
    if (!segment || segment.kind !== "motion") return;
    controller.seek(segment.startSeconds + segment.seconds * progress);
  };

  return (
    <section className="motion-storyboard" aria-labelledby={`${id}-title`}>
      <header className="msb-intro">
        <h3 id={`${id}-title`}>조합 미리보기</h3>
        <p className="msb-boundary">
          완성 자산 0건 · 전문가 검토 0건 · 자동 추천 제외
        </p>
        <p id={`${id}-timing`}>
          시간·주기·속도는 도해 표시용입니다. 실제 운동의 권장
          속도·횟수·운동량이나 수업 계획이 아닙니다.
        </p>
      </header>
      <div
        className="msb-workspace-nav"
        role="group"
        aria-label="조합 작업 단계"
      >
        <button
          type="button"
          aria-pressed={workspace === "compose"}
          onClick={() => changeWorkspace("compose")}
        >
          블록 구성
        </button>
        <button
          type="button"
          aria-pressed={workspace === "preview"}
          disabled={!blocks.length || !timeline.valid || snapshot === null}
          onClick={() => changeWorkspace("preview")}
        >
          재생 화면
        </button>
      </div>
      <p className="msb-totals" aria-label="조합 표시 시간">
        전체 표시 <strong>{formatStoryboardTime(timeline.totalSeconds)}</strong>
        <span>
          모션 {formatStoryboardTime(timeline.motionSeconds)} · 쉼{" "}
          {formatStoryboardTime(timeline.restSeconds)}
        </span>
      </p>
      <div className="msb-compose" hidden={workspace !== "compose"}>
        <p className="msb-local-note">
          모션과 쉼을 놓고 재생 화면에서 확인하세요. 개별 동작을 살펴본 뒤에도
          조합을 유지합니다. 창을 닫기 전 보관하려면 제작 조합 JSON을
          저장하세요.
        </p>
        <div className="msb-add" role="group" aria-label="조합에 블록 추가">
          <label htmlFor={`${id}-draft`}>
            추가할 미검토 제안
            <select
              id={`${id}-draft`}
              aria-label="추가할 미검토 제안"
              value={selectedDraftId}
              onChange={(event) => setSelectedDraftId(event.target.value)}
            >
              <option value="">제안을 선택하세요</option>
              {groupMotionDraftOptions(drafts).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((draft, index) => (
                    <option key={`${draft.id}-${index}`} value={draft.id}>
                      {draft.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              !timeline.valid ||
              blocks.length >= STORYBOARD_MAX_BLOCKS ||
              !drafts.some((draft) => draft.id === selectedDraftId)
            }
            onClick={() => {
              const draft = drafts.find((item) => item.id === selectedDraftId);
              if (draft)
                edit([...blocks, makeMotionBlock(nextId("motion"), draft)]);
            }}
          >
            모션 추가
          </button>
          <button
            type="button"
            className="msb-secondary"
            disabled={!timeline.valid || blocks.length >= STORYBOARD_MAX_BLOCKS}
            onClick={() => edit([...blocks, makeRestBlock(nextId("rest"))])}
          >
            쉼 추가
          </button>
        </div>

        {blocks.length === 0 ? (
          <p className="msb-empty">
            아직 블록이 없습니다. 제안을 선택해 모션을 추가하거나 쉼을
            추가하세요.
          </p>
        ) : (
          <ol className="msb-blocks" aria-label="직접 구성한 표시 블록">
            {blocks.map((block, index) => {
              const draft =
                block.kind === "motion"
                  ? drafts.find((item) => item.id === block.draftId)
                  : null;
              const title =
                block.kind === "rest" ? "쉼" : (draft?.title ?? "제안 미확인");
              const blockLabel = `${index + 1}번 ${title}`;
              return (
                <li
                  key={block.id}
                  className={
                    segment?.blockId === block.id
                      ? "msb-block msb-current"
                      : "msb-block"
                  }
                >
                  <div className="msb-block-row">
                    <button
                      type="button"
                      className="msb-block-title msb-secondary"
                      onClick={() => {
                        const first = timeline.segments.find(
                          (item) => item.blockId === block.id,
                        );
                        if (first) {
                          controller.seek(first.startSeconds);
                          setWorkspace("preview");
                        }
                      }}
                      disabled={!timeline.valid}
                      aria-label={`${blockLabel} 보기`}
                    >
                      <span>{index + 1}</span>
                      <strong>{title}</strong>
                      <small>
                        {block.kind === "rest"
                          ? `${block.seconds}초`
                          : `${block.cycles}주기 × ${block.secondsPerCycle}초`}
                      </small>
                    </button>
                    <div
                      className="msb-order"
                      role="group"
                      aria-label={`${blockLabel} 순서`}
                    >
                      <button
                        type="button"
                        className="msb-secondary"
                        aria-label={`${blockLabel} 위로`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="msb-secondary"
                        aria-label={`${blockLabel} 아래로`}
                        disabled={index === blocks.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="msb-secondary"
                        aria-label={`${blockLabel} 삭제`}
                        onClick={() =>
                          edit(blocks.filter((item) => item.id !== block.id))
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <details className="msb-editor">
                    <summary>{blockLabel} 표시 설정</summary>
                    <div className="msb-fields">
                      {block.kind === "motion" ? (
                        <>
                          <label htmlFor={`${id}-${block.id}-side`}>
                            몸의 좌우
                            <select
                              id={`${id}-${block.id}-side`}
                              value={block.side}
                              disabled={draft?.sideMode === "bilateral"}
                              onChange={(event) => {
                                const side = event.target.value;
                                if (side === "left" || side === "right")
                                  update(block.id, { side });
                              }}
                            >
                              {draft?.sideMode === "bilateral" ? (
                                <option value="together">양쪽 함께</option>
                              ) : (
                                <>
                                  <option value="right">몸의 오른쪽</option>
                                  <option value="left">몸의 왼쪽</option>
                                </>
                              )}
                            </select>
                          </label>
                          <label htmlFor={`${id}-${block.id}-cycles`}>
                            표시 주기 수
                            <select
                              id={`${id}-${block.id}-cycles`}
                              value={block.cycles}
                              aria-describedby={`${id}-timing`}
                              onChange={(event) => {
                                const cycles = Number(event.target.value);
                                if (
                                  cycles === 1 ||
                                  cycles === 2 ||
                                  cycles === 3
                                )
                                  update(block.id, { cycles });
                              }}
                            >
                              <option value="1">1주기</option>
                              <option value="2">2주기</option>
                              <option value="3">3주기</option>
                            </select>
                          </label>
                          <label htmlFor={`${id}-${block.id}-seconds`}>
                            한 주기 표시 초 (2–30)
                            <input
                              id={`${id}-${block.id}-seconds`}
                              type="number"
                              inputMode="numeric"
                              min="2"
                              max="30"
                              step="1"
                              value={
                                Number.isFinite(block.secondsPerCycle)
                                  ? block.secondsPerCycle
                                  : ""
                              }
                              aria-describedby={`${id}-timing`}
                              onChange={(event) =>
                                update(block.id, {
                                  secondsPerCycle: event.target.valueAsNumber,
                                })
                              }
                            />
                          </label>
                          <label className="msb-checkbox">
                            <input
                              type="checkbox"
                              checked={block.mirrored}
                              onChange={(event) =>
                                update(block.id, {
                                  mirrored: event.target.checked,
                                })
                              }
                            />
                            화면만 반전 · 몸의 좌우 유지
                          </label>
                        </>
                      ) : (
                        <label htmlFor={`${id}-${block.id}-seconds`}>
                          쉼 표시 초 (1–120)
                          <input
                            id={`${id}-${block.id}-seconds`}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="120"
                            step="1"
                            value={
                              Number.isFinite(block.seconds)
                                ? block.seconds
                                : ""
                            }
                            aria-describedby={`${id}-timing`}
                            onChange={(event) =>
                              update(block.id, {
                                seconds: event.target.valueAsNumber,
                              })
                            }
                          />
                        </label>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}

        {blocks.length > 0 && (
          <button
            type="button"
            disabled={!timeline.valid || snapshot === null}
            onClick={() => changeWorkspace("preview")}
          >
            조합 재생 화면으로
          </button>
        )}
      </div>
      {(!timeline.valid || snapshot === null) && (
        <div role="alert" className="msb-error">
          표시 설정을 확인하세요. 재생은 일시정지됩니다.
          <ul>
            {timeline.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
            {snapshot === null && (
              <li>제안 정의를 읽을 수 없어 재생할 수 없습니다.</li>
            )}
          </ul>
        </div>
      )}

      <div className="msb-preview" hidden={workspace !== "preview"}>
        <div
          className="msb-scene"
          ref={sceneRef}
          aria-label="현재 조합 도해"
          role="group"
          tabIndex={-1}
        >
          {segment?.kind === "motion" && currentDraft && position ? (
            <>
              {renderFigure({
                draftId: currentDraft.id,
                progress: position.progress,
                activeSide: segment.side === "left" ? "left" : "right",
                mirrored: segment.mirrored,
              })}
              <div className="msb-scene-caption">
                <strong>{currentDraft.title}</strong>
                <span>
                  {cycleLabel} · {Math.round(position.progress * 100)}%
                </span>
              </div>
            </>
          ) : segment?.kind === "rest" ? (
            <div className="msb-rest">
              <strong>쉼 표시</strong>
              <span>
                {formatStoryboardTime(
                  Math.ceil(segment.seconds * (1 - (position?.progress ?? 0))),
                )}{" "}
                남음
              </span>
              <p>연결 동작은 표현하지 않습니다.</p>
            </div>
          ) : (
            <div className="msb-rest">
              <strong>모션을 추가해 미리보기를 구성하세요</strong>
              <p>자동 구성·자동 재생 없음</p>
            </div>
          )}
        </div>

        <div className="msb-playback-status">
          <p role="status" aria-live="polite">
            {state.playing
              ? "조합 재생 중"
              : atEnd
                ? "조합 끝 · 일시정지"
                : state.pauseReason === "frame-delay"
                  ? "화면 갱신이 지연되어 멈췄습니다. 재생을 눌러 이어 보세요."
                  : state.pauseReason === "block-boundary"
                    ? "다음 블록 시작 전 · 재생을 눌러 이어 보세요."
                    : "일시정지 · 자동 재생 없음"}
          </p>
          <span>
            {formatStoryboardTime(state.elapsedSeconds)} /{" "}
            {formatStoryboardTime(timeline.totalSeconds)}
          </span>
        </div>
        <div
          className="msb-controls"
          role="group"
          aria-label="조합 도해 재생 제어"
        >
          <button
            type="button"
            disabled={
              !playable ||
              !timeline.totalSeconds ||
              state.playing ||
              reducedMotion
            }
            onClick={controller.play}
          >
            {atEnd ? "조합 다시 재생" : "조합 재생"}
          </button>
          <button
            type="button"
            className="msb-secondary"
            disabled={!state.playing}
            onClick={controller.pause}
          >
            일시정지
          </button>
          <button
            type="button"
            className="msb-secondary"
            disabled={!segment}
            onClick={() => navigate(-1)}
          >
            이전 표시 구간
          </button>
          <button
            type="button"
            className="msb-secondary"
            disabled={!segment}
            onClick={() => navigate(1)}
          >
            다음 표시 구간
          </button>
          <button
            type="button"
            className="msb-secondary"
            disabled={!timeline.totalSeconds}
            onClick={controller.reset}
          >
            조합 처음으로
          </button>
          <label htmlFor={`${id}-speed`}>
            조합 표시 속도
            <select
              id={`${id}-speed`}
              value={state.speed}
              aria-describedby={`${id}-timing`}
              onChange={(event) =>
                controller.setSpeed(
                  Number(event.target.value) as StoryboardPlaybackSpeed,
                )
              }
            >
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
            </select>
          </label>
        </div>
        <label className="msb-checkbox msb-step-control">
          <input
            type="checkbox"
            checked={pauseBeforeBlocks}
            onChange={(event) => {
              controller.pause();
              setPauseBeforeBlocks(event.target.checked);
            }}
          />
          블록마다 멈추기
        </label>
        <p className="msb-step-help">
          반복 주기는 이어 보고, 다음 모션·쉼 블록 시작 전에 멈춥니다. 화면
          갱신이 오래 지연되면 현재 위치에서 일시정지합니다.
        </p>
        <label className="msb-seek" htmlFor={`${id}-seek`}>
          조합 표시 위치
          <input
            id={`${id}-seek`}
            type="range"
            min="0"
            max={timeline.totalSeconds || 1}
            step="0.01"
            value={state.elapsedSeconds}
            disabled={!timeline.totalSeconds}
            aria-valuetext={`${formatStoryboardTime(state.elapsedSeconds)} / ${formatStoryboardTime(timeline.totalSeconds)}`}
            onChange={(event) => controller.seek(event.target.valueAsNumber)}
          />
        </label>
        {reducedMotion && (
          <p className="msb-cut-notice">
            동작 줄이기 설정 중입니다. 아래 정지 단계와 이전·다음 구간으로
            살펴보세요.
          </p>
        )}
        <div
          className="msb-static"
          role="group"
          aria-label="현재 모션 정지 단계"
        >
          {[
            ["시작", 0],
            ["1/4", 0.25],
            ["중간", 0.5],
            ["3/4", 0.75],
            ["끝 직전", 0.999],
          ].map(([label, progress]) => (
            <button
              key={label}
              type="button"
              className="msb-secondary"
              disabled={segment?.kind !== "motion"}
              onClick={() => staticPhase(Number(progress))}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="msb-cut-notice">
          블록·주기 경계는 바로 전환합니다. 연결 동작이나 자세 전환의 적합성을
          표현하지 않습니다.
        </p>
      </div>
      <details className="msb-files">
        <summary>제작 조합 저장·불러오기</summary>
        <p id={`${id}-file-note`}>
          미검토 제작 조합 전용 JSON입니다. 실제 수업·강의 이력·전체 사용자
          백업과 별개입니다. 최대 50블록·64KiB, 현재 제안 ID만 허용합니다.
        </p>
        <div className="msb-file-controls">
          <button
            type="button"
            className="msb-secondary"
            disabled={!timeline.valid || snapshot === null || importPending}
            onClick={exportFile}
          >
            제작 조합 JSON 저장
          </button>
          <label htmlFor={`${id}-file`}>
            제작 조합 JSON 파일
            <input
              id={`${id}-file`}
              type="file"
              accept=".json,application/json"
              aria-describedby={`${id}-file-note`}
              disabled={importPending}
              onChange={(event) => {
                setImportFile(event.target.files?.[0] ?? null);
                setFileMessage(null);
              }}
            />
          </label>
          <button
            type="button"
            className="msb-secondary"
            disabled={!importFile || importPending}
            onClick={importSelectedFile}
          >
            {importPending ? "파일 읽는 중" : "선택한 제작 조합 불러오기"}
          </button>
        </div>
        {fileMessage && (
          <p role={fileMessage.error ? "alert" : "status"}>
            {fileMessage.text}
          </p>
        )}
      </details>

      {currentDraft && (
        <details className="msb-facts" key={currentDraft.id}>
          <summary>현재 제안의 지지·출처·미확인 정보</summary>
          <h4>{currentDraft.title}</h4>
          <p>{currentDraft.variant ?? "변형 조건 미확인"}</p>
          <p className="msb-cut-notice">
            {currentDraft.supportNote ?? "필요한 지지·준비물 미확인"}
          </p>
          {currentDraft.variantRequirements && (
            <>
              <h5>이 제안의 준비물 · 기존 계획 조건과 별도</h5>
              <ul>
                {currentDraft.variantRequirements.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            </>
          )}
          {(["matched", "unknown", "mismatched"] as const).map((key) => (
            <div key={key}>
              <h5>
                {key === "matched"
                  ? "본문 확인 사실"
                  : key === "unknown"
                    ? "미확인"
                    : "불일치"}
              </h5>
              <ul>
                {currentDraft[key]?.length ? (
                  currentDraft[key].map((fact, index) => (
                    <li key={index}>{fact}</li>
                  ))
                ) : (
                  <li>
                    {key === "unknown"
                      ? "개인별 적합성·안전성은 미검토입니다."
                      : "제공된 대조 항목 없음"}
                  </li>
                )}
              </ul>
            </div>
          ))}
          <h5>참고 출처</h5>
          {currentDraft.sources?.length ? (
            <ul>
              {currentDraft.sources.map((source, index) => (
                <li key={index}>
                  {isSourceUrl(source.url) ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.label}
                    </a>
                  ) : (
                    <span>{source.label} · 링크 미확인</span>
                  )}
                  {source.context && <p>{source.context}</p>}
                  {source.factualRecordSha256 && (
                    <p className="msb-local-note">
                      사실 기록 {source.factualRecordSha256.slice(0, 12)}… ·
                      모션 검수 해시가 아닙니다.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>출처 정보 미확인</p>
          )}
        </details>
      )}
      <p className="msb-local-note">
        이 조합은 현재 창의 미리보기에만 사용합니다. 실제 수업·기록·날짜별
        계획·승인에 반영하지 않습니다.
      </p>
    </section>
  );
}
