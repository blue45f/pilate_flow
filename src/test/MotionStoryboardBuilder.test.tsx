import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionStoryboardBuilder } from "../components/MotionStoryboardBuilder";
import type {
  MotionStoryboardBuilderProps,
  MotionStoryboardFigureProps,
} from "../components/MotionStoryboardBuilder";
import {
  encodeStoryboardJson,
  makeMotionBlock,
} from "../utils/motionStoryboard";

const drafts: MotionStoryboardBuilderProps["drafts"] = [
  {
    id: "both",
    title: "양쪽 제안",
    sideMode: "bilateral",
    status: "variant-proposal",
    expertReviewCount: 0,
    supportNote: "일반 의자 지지 필요",
    variant: "양손 지지 변형",
    matched: ["기본 이동 대조"],
    unknown: ["관절 경로·안전성 미검토"],
    sources: [{ label: "출처 A", url: "https://example.org/source-a" }],
  },
  {
    id: "one",
    title: "한쪽 제안",
    sideMode: "unilateral",
    status: "variant-proposal",
    expertReviewCount: 0,
    supportNote: "머리 베개 필요",
    unknown: ["베개 정합성 미확인"],
    sources: [
      {
        label: "출처 B",
        url: "https://example.org/source-b",
        context: "특정 증상 대상 자료 · 일반 적합성 미확인",
        factualRecordSha256: "d".repeat(64),
      },
      { label: "잘못된 링크", url: "javascript:alert(1)" },
    ],
  },
];
const renderFigure = ({
  draftId,
  progress,
  activeSide,
  mirrored,
}: MotionStoryboardFigureProps) => (
  <svg
    role="img"
    aria-label={`${draftId} 미검토 도해`}
    data-draft={draftId}
    data-progress={progress}
    data-side={activeSide}
    data-mirrored={mirrored}
  >
    <circle
      data-testid="animated-joint"
      cx={20 + progress * 100}
      cy="30"
      r="10"
    />
  </svg>
);
let callbacks: Map<number, FrameRequestCallback>;
let serial: number;
let reducedMotion: boolean;
const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");

beforeEach(() => {
  callbacks = new Map();
  serial = 0;
  reducedMotion = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => false,
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      callbacks.set(++serial, callback);
      return serial;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => callbacks.delete(id)),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return reducedMotion;
      },
      addEventListener() {},
      removeEventListener() {},
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalHidden) Object.defineProperty(document, "hidden", originalHidden);
  else Reflect.deleteProperty(document, "hidden");
});
function frame(timestamp: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(timestamp));
  });
}
function advanceFrames(from: number, to: number) {
  for (let timestamp = from + 500; timestamp < to; timestamp += 500) {
    frame(timestamp);
  }
  frame(to);
}
function compose() {
  fireEvent.click(screen.getByRole("button", { name: "블록 구성" }));
}
function preview() {
  fireEvent.click(screen.getByRole("button", { name: "재생 화면" }));
}
function addMotion(id: string) {
  compose();
  fireEvent.change(screen.getByLabelText("추가할 미검토 제안"), {
    target: { value: id },
  });
  fireEvent.click(screen.getByRole("button", { name: "모션 추가" }));
}
function rows() {
  return within(
    screen.getByRole("list", { name: "직접 구성한 표시 블록" }),
  ).getAllByRole("listitem");
}
function settings(index: number) {
  compose();
  const row = rows()[index];
  const details = row.querySelector("details")!;
  if (!details.open) fireEvent.click(within(row).getByText(/표시 설정/));
  return within(row);
}

describe("explicit local storyboard authoring", () => {
  it("starts empty/paused, labels boundaries, and leaves all source metadata unchanged without network or storage writes", () => {
    const before = JSON.stringify(drafts);
    const fetch = vi.spyOn(globalThis, "fetch");
    const store = vi.spyOn(Storage.prototype, "setItem");
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    expect(screen.getByText(/아직 블록이 없습니다/)).toBeInTheDocument();
    expect(
      screen.getByText("완성 자산 0건 · 전문가 검토 0건 · 자동 추천 제외"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "재생 화면" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "조합 재생" })).toBeNull();
    expect(screen.getByLabelText("조합 표시 속도")).toHaveValue("1");
    expect(screen.getByLabelText("조합 표시 속도")).toHaveAccessibleDescription(
      /도해 표시용/,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(callbacks.size).toBe(0);
    expect(document.querySelector("video,iframe,img")).toBeNull();
    expect(screen.queryByRole("button", { name: /승인|수업 시작/ })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
    expect(JSON.stringify(drafts)).toBe(before);
  });

  it("animates actual per-cycle figure geometry, cuts to rest and distinct drafts, then finishes without looping", () => {
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    fireEvent.change(settings(0).getByLabelText("표시 주기 수"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "쉼 추가" }));
    fireEvent.change(settings(1).getByLabelText("쉼 표시 초 (1–120)"), {
      target: { value: "3" },
    });
    addMotion("one");
    expect(screen.getByLabelText("조합 표시 시간")).toHaveTextContent(
      "전체 표시 0:27모션 0:24 · 쉼 0:03",
    );
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 4000);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.5");
    expect(screen.getByTestId("animated-joint")).toHaveAttribute("cx", "70");
    advanceFrames(4000, 8000);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0");
    expect(screen.getByText(/2번째 표시 주기/)).toBeInTheDocument();
    advanceFrames(8000, 16000);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("쉼 표시")).toBeInTheDocument();
    advanceFrames(16000, 19000);
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "one");
    advanceFrames(19000, 23000);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.5");
    advanceFrames(23000, 27000);
    expect(screen.getByRole("status")).toHaveTextContent("조합 끝");
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "1");
    expect(callbacks.size).toBe(0);
  });

  it("steps at rest and distinct motion blocks while keeping repeated cycles continuous and all authoring local", () => {
    const before = JSON.stringify(drafts);
    const fetch = vi.spyOn(globalThis, "fetch");
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
    const storage = [
      vi.spyOn(Storage.prototype, "getItem"),
      vi.spyOn(Storage.prototype, "setItem"),
      vi.spyOn(Storage.prototype, "removeItem"),
      vi.spyOn(Storage.prototype, "clear"),
    ];
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    fireEvent.change(settings(0).getByLabelText("표시 주기 수"), {
      target: { value: "2" },
    });
    fireEvent.change(settings(0).getByLabelText("한 주기 표시 초 (2–30)"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "쉼 추가" }));
    fireEvent.change(settings(1).getByLabelText("쉼 표시 초 (1–120)"), {
      target: { value: "2" },
    });
    addMotion("one");
    fireEvent.change(settings(2).getByLabelText("한 주기 표시 초 (2–30)"), {
      target: { value: "2" },
    });
    expect(screen.getByLabelText("조합 표시 시간")).toHaveTextContent(
      "전체 표시 0:08모션 0:06 · 쉼 0:02",
    );
    preview();
    const step = screen.getByRole("checkbox", { name: "블록마다 멈추기" });
    expect(step).toHaveAttribute("type", "checkbox");
    expect(step).not.toBeChecked();
    fireEvent.click(step);
    expect(step).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 2000);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0");
    expect(screen.getByText(/2번째 표시 주기/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("조합 재생 중");
    expect(callbacks.size).toBe(1);
    advanceFrames(2000, 4500);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "4",
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("쉼 표시")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "다음 블록 시작 전 · 재생을 눌러 이어 보세요.",
    );
    expect(callbacks.size).toBe(0);
    frame(90_000);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "4",
    );
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(100_000);
    advanceFrames(100_000, 101_000);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "5",
    );
    expect(screen.getByText("쉼 표시")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("조합 재생 중");
    advanceFrames(101_000, 102_500);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "6",
    );
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "one");
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0");
    expect(screen.getByRole("status")).toHaveTextContent("다음 블록 시작 전");
    expect(callbacks.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(200_000);
    advanceFrames(200_000, 200_500);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.25");
    expect(screen.getByRole("status")).toHaveTextContent("조합 재생 중");
    advanceFrames(200_500, 202_000);
    expect(screen.getByRole("status")).toHaveTextContent("조합 끝");
    expect(callbacks.size).toBe(0);
    expect(step).toBeChecked();
    expect(screen.getByRole("button", { name: "재생 화면" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    storage.forEach((method) => expect(method).not.toHaveBeenCalled());
    expect(JSON.stringify(drafts)).toBe(before);
  });

  it("pauses native step-option changes without resetting position, speed or preview mode", () => {
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    addMotion("one");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 1500);
    const step = screen.getByRole("checkbox", { name: "블록마다 멈추기" });
    fireEvent.click(step);
    expect(step).toBeChecked();
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1.5",
    );
    expect(screen.getByRole("status")).toHaveTextContent("일시정지");
    fireEvent.change(screen.getByLabelText("조합 표시 속도"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(100_000);
    frame(100_500);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1.75",
    );
    fireEvent.click(step);
    expect(step).not.toBeChecked();
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1.75",
    );
    expect(screen.getByLabelText("조합 표시 속도")).toHaveValue("0.5");
    expect(screen.getByRole("button", { name: "재생 화면" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "블록 구성" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows a frame-delay reason in the native dialog, preserves the last figure and resumes without catchup", () => {
    render(
      <dialog open>
        <MotionStoryboardBuilder
          drafts={drafts}
          renderFigure={renderFigure}
          active
        />
      </dialog>,
    );
    addMotion("both");
    preview();
    expect(
      screen.getByRole("checkbox", { name: "블록마다 멈추기" }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 1000);
    frame(2001);
    expect(screen.getByRole("status")).toHaveTextContent(
      "화면 갱신이 지연되어 멈췄습니다. 재생을 눌러 이어 보세요.",
    );
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1",
    );
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.125");
    expect(screen.getByTestId("animated-joint")).toHaveAttribute("cx", "32.5");
    expect(callbacks.size).toBe(0);
    frame(90_000);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1",
    );
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(100_000);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "1",
    );
    frame(100_500);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.1875");
    expect(screen.getByRole("status")).toHaveTextContent("조합 재생 중");
    expect(callbacks.size).toBe(1);
  });

  it("keeps anatomical side independent of mirror and pauses/resets every edit, reorder and removal", () => {
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    expect(settings(0).getByLabelText("몸의 좌우")).toBeDisabled();
    addMotion("one");
    fireEvent.change(settings(1).getByLabelText("몸의 좌우"), {
      target: { value: "left" },
    });
    fireEvent.click(settings(1).getByLabelText("화면만 반전 · 몸의 좌우 유지"));
    fireEvent.click(screen.getByRole("button", { name: "2번 한쪽 제안 보기" }));
    expect(screen.getByRole("img")).toHaveAttribute("data-side", "left");
    expect(screen.getByRole("img")).toHaveAttribute("data-mirrored", "true");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 2000);
    fireEvent.change(settings(1).getByLabelText("한 주기 표시 초 (2–30)"), {
      target: { value: "10" },
    });
    preview();
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "0",
    );
    expect(callbacks.size).toBe(0);
    compose();
    fireEvent.click(screen.getByRole("button", { name: "2번 한쪽 제안 위로" }));
    preview();
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "one");
    compose();
    fireEvent.click(screen.getByRole("button", { name: "1번 한쪽 제안 삭제" }));
    expect(rows()).toHaveLength(1);
    preview();
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "both");
    fireEvent.change(settings(0).getByLabelText("한 주기 표시 초 (2–30)"), {
      target: { value: "" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("표시 설정");
    expect(screen.getByRole("button", { name: "재생 화면" })).toBeDisabled();
  });

  it("pauses manual navigation, seek, speed and static phases and resets on draft definition changes", () => {
    const view = render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    addMotion("one");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    advanceFrames(0, 2000);
    fireEvent.click(screen.getByRole("button", { name: "다음 표시 구간" }));
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "one");
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "현재 모션 정지 단계" }),
      ).getByRole("button", { name: "중간" }),
    );
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.5");
    fireEvent.change(screen.getByLabelText("조합 표시 속도"), {
      target: { value: "0.75" },
    });
    expect(callbacks.size).toBe(0);
    fireEvent.change(screen.getByRole("slider", { name: "조합 표시 위치" }), {
      target: { value: "2" },
    });
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "both");
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.25");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    frame(1000);
    view.rerender(
      <MotionStoryboardBuilder
        drafts={drafts.map((draft) => ({
          ...draft,
          supportNote: "변경된 지지 정의",
        }))}
        renderFigure={renderFigure}
        active
      />,
    );
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole("slider", { name: "조합 표시 위치" })).toHaveValue(
      "0",
    );
    expect(screen.getByRole("status")).toHaveTextContent("일시정지");
  });

  it("offers static steps in reduced motion, gates active false and native dialog closure, and cancels unmount RAF", () => {
    reducedMotion = true;
    const view = render(
      <StrictMode>
        <dialog open>
          <MotionStoryboardBuilder
            drafts={drafts}
            renderFigure={renderFigure}
            active
          />
        </dialog>
      </StrictMode>,
    );
    addMotion("both");
    preview();
    expect(screen.getByRole("button", { name: "조합 재생" })).toBeDisabled();
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "현재 모션 정지 단계" }),
      ).getByRole("button", { name: "중간" }),
    );
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.5");
    view.unmount();
    reducedMotion = false;
    const second = render(
      <dialog open>
        <MotionStoryboardBuilder
          drafts={drafts}
          renderFigure={renderFigure}
          active
        />
      </dialog>,
    );
    addMotion("both");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    frame(0);
    const nativeDialog = screen.getByRole("dialog");
    nativeDialog.removeAttribute("open");
    frame(1000);
    expect(callbacks.size).toBe(0);
    nativeDialog.setAttribute("open", "");
    second.rerender(
      <dialog open>
        <MotionStoryboardBuilder
          drafts={drafts}
          renderFigure={renderFigure}
          active={false}
        />
      </dialog>,
    );
    expect(screen.getByRole("button", { name: "조합 재생" })).toBeDisabled();
    second.rerender(
      <dialog open>
        <MotionStoryboardBuilder
          drafts={drafts}
          renderFigure={renderFigure}
          active
        />
      </dialog>,
    );
    preview();
    fireEvent.click(screen.getByRole("button", { name: "조합 재생" }));
    expect(callbacks.size).toBe(1);
    second.unmount();
    expect(callbacks.size).toBe(0);
  });

  it("keeps current proposal support/source facts tied to the current block and drops unsafe source links", () => {
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    addMotion("one");
    fireEvent.click(screen.getByRole("button", { name: "2번 한쪽 제안 보기" }));
    fireEvent.click(screen.getByText("현재 제안의 지지·출처·미확인 정보"));
    expect(screen.getByText("머리 베개 필요")).toBeInTheDocument();
    expect(screen.getByText("베개 정합성 미확인")).toBeInTheDocument();
    expect(
      screen.getByText("특정 증상 대상 자료 · 일반 적합성 미확인"),
    ).toBeInTheDocument();
    expect(screen.getByText(/모션 검수 해시가 아닙니다/)).toBeInTheDocument();
    expect(screen.queryByText("일반 의자 지지 필요")).toBeNull();
    expect(screen.getByRole("link", { name: "출처 B" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.queryByRole("link", { name: "잘못된 링크" })).toBeNull();
  });

  it("atomically imports review-only JSON, keeps existing blocks after rejection, and avoids imported ID collisions", async () => {
    render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("one");
    fireEvent.click(screen.getByText("제작 조합 저장·불러오기"));
    const input = screen.getByLabelText("제작 조합 JSON 파일");
    const load = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "선택한 제작 조합 불러오기" }),
      );
    fireEvent.change(input, {
      target: {
        files: [new File(["{}"], "bad.json", { type: "application/json" })],
      },
    });
    load();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("현재 조합을 유지"),
    );
    expect(rows()).toHaveLength(1);
    preview();
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "one");
    compose();
    const encoded = encodeStoryboardJson(
      [makeMotionBlock("motion-2", drafts[0])],
      drafts,
    );
    if (!encoded.ok) throw new Error(encoded.error);
    fireEvent.change(input, {
      target: {
        files: [
          new File([encoded.json], "review.json", { type: "application/json" }),
        ],
      },
    });
    load();
    await waitFor(() =>
      expect(
        screen.getByText(/미검토 제작 조합을 불러왔습니다/),
      ).toBeInTheDocument(),
    );
    preview();
    expect(screen.getByRole("img")).toHaveAttribute("data-draft", "both");
    expect(callbacks.size).toBe(0);
    addMotion("one");
    expect(rows()).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("downloads only versioned review JSON and releases blob URLs on replacement and unmount", () => {
    const create = vi
      .fn()
      .mockReturnValueOnce("blob:review-1")
      .mockReturnValueOnce("blob:review-2");
    const revoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revoke,
    });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    const view = render(
      <MotionStoryboardBuilder
        drafts={drafts}
        renderFigure={renderFigure}
        active
      />,
    );
    addMotion("both");
    fireEvent.click(screen.getByText("제작 조합 저장·불러오기"));
    fireEvent.click(
      screen.getByRole("button", { name: "제작 조합 JSON 저장" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "제작 조합 JSON 저장" }),
    );
    expect(clicked).toEqual([
      "motion-storyboard-review-only-v1.json",
      "motion-storyboard-review-only-v1.json",
    ]);
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(revoke).toHaveBeenCalledWith("blob:review-1");
    view.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:review-2");
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });
});
