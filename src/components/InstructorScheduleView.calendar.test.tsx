import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePilatesStore } from "../store/usePilatesStore";
import {
  revisionAssigned,
  revisionExercise,
  revisionSchedule,
  revisionSource,
} from "../test/datedRevisionFixtures";
import { InstructorScheduleView } from "./InstructorScheduleView";

const original = usePilatesStore.getState();
beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      activeTab: "schedule",
      activeTitle: "보존하는 초안",
      activeSteps: structuredClone(revisionSource().steps),
      exercises: [revisionExercise],
      savedSequences: [revisionSource()],
      instructorSchedule: revisionSchedule(),
      datedSequencePlanning: revisionAssigned().planning,
      generationError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

const openMonth = () => {
  fireEvent.click(screen.getByRole("button", { name: "월간 준비 보기" }));
  return within(screen.getByRole("dialog", { name: "주·월 시퀀스 계획" }));
};

describe("existing monthly planner and schedule date handoff", () => {
  it("opens the existing month directly, exposing real preparation states without another calendar", () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const dialog = openMonth();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(dialog.getByRole("button", { name: "월간" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      dialog.getByRole("region", { name: "월간 계획 날짜 선택" }),
    ).toBeVisible();
    const prepared = dialog.getByRole("button", {
      name: "2026-11-02 예정 1회 계획 1개",
    });
    expect(prepared).toHaveAccessibleDescription(/준비 표시 1회/);
    expect(
      dialog.getByRole("button", { name: "2026-11-09 예정 1회 계획 0개" }),
    ).toHaveAccessibleDescription(/날짜별 계획 미지정 1회/);
  });

  it("supports keyboard date movement with one tabbable date, across month and year edges", () => {
    render(<InstructorScheduleView today="2026-12-31" />);
    const dialog = openMonth();
    const lastDay = dialog.getByRole("button", { name: /^2026-12-31 예정/ });
    lastDay.focus();
    fireEvent.keyDown(lastDay, { key: "ArrowRight" });
    expect(dialog.getByLabelText("계획 기준 날짜")).toHaveValue("2027-01-01");
    const next = dialog.getByRole("button", { name: /^2027-01-01 예정/ });
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute("tabindex", "0");
    expect(
      document.querySelectorAll('[data-planning-date][tabindex="0"]'),
    ).toHaveLength(1);
    fireEvent.keyDown(next, { key: "PageDown" });
    expect(dialog.getByLabelText("계획 기준 날짜")).toHaveValue("2027-02-01");
    expect(
      dialog.getByRole("button", { name: /^2027-02-01 예정/ }),
    ).toHaveFocus();
  });

  it("closes native first, restores the opener, then focuses the selected daily heading while all data stays identical", () => {
    const before = usePilatesStore.getState();
    const restored: boolean[] = [];
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      expect(this.querySelector(".dated-planning")).not.toBeNull();
      const opener = screen.getByRole("button", { name: "월간 준비 보기" });
      this.removeAttribute("open");
      // jsdom lacks native focus restoration, so model it before the next-view effect.
      opener.focus();
      restored.push(document.activeElement === opener);
    });
    render(<InstructorScheduleView today="2026-11-04" />);
    const dialog = openMonth();
    fireEvent.click(
      dialog.getByRole("button", { name: "2026-11-23 예정 1회 계획 0개" }),
    );
    fireEvent.click(
      dialog.getByRole("button", { name: "선택 날짜 일정 열기" }),
    );
    expect(restored).toEqual([true]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("기준 날짜")).toHaveValue("2026-11-23");
    expect(
      screen.getByRole("heading", { name: "11월 23일 (월)" }),
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "일간 보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "주간 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "일간 보기" }));
    expect(screen.getByLabelText("기준 날짜")).toHaveValue("2026-11-23");
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeSteps[0]).toBe(before.activeSteps[0]);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.instructorSchedule).toBe(before.instructorSchedule);
    expect(after.datedSequencePlanning).toBe(before.datedSequencePlanning);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.historyLogs).toBe(before.historyLogs);
    fireEvent.click(screen.getByRole("button", { name: "오늘로" }));
    expect(screen.getByLabelText("기준 날짜")).toHaveValue("2026-11-04");
  });

  it("keeps an empty leap-day view and the allowed end date navigable", () => {
    const { unmount } = render(<InstructorScheduleView today="2024-02-29" />);
    let dialog = openMonth();
    const leap = dialog.getByRole("button", {
      name: "2024-02-29 예정 0회 계획 0개",
    });
    expect(
      dialog.queryByRole("button", { name: /^2024-02-30/ }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(leap, { key: "PageDown" });
    expect(dialog.getByLabelText("계획 기준 날짜")).toHaveValue("2024-03-29");
    unmount();
    render(<InstructorScheduleView today="2199-12-31" />);
    dialog = openMonth();
    fireEvent.keyDown(
      dialog.getByRole("button", { name: /^2199-12-31 예정/ }),
      { key: "ArrowRight" },
    );
    expect(dialog.getByLabelText("계획 기준 날짜")).toHaveValue("2199-12-31");
  });
});
