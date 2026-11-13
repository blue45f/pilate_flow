import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePilatesStore } from "../store/usePilatesStore";
import { syntheticPlanningExercise } from "../test/planningFixtures";
import { createEmptyInstructorSchedule } from "../types/instructorSchedule";
import type { AutoGenerateCriteria, SequenceStep } from "../types/pilates";
import { SequenceWorkbench } from "./SequenceWorkbench";

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const exercises = [
  syntheticPlanningExercise("mat", "extension", "alpha", false),
  syntheticPlanningExercise("mat", "cooldown", "alpha", false),
  syntheticPlanningExercise("mat", "bridging", "alpha", false),
];
const assignedSteps: SequenceStep[] = [
  {
    stepId: "role-label-preparation",
    order: 1,
    exerciseId: exercises[0].id,
    blockCategory: "extension",
    classSection: "preparation",
    durationMin: 4,
    selectedLayer: "standard",
  },
  {
    stepId: "role-label-main",
    order: 2,
    exerciseId: exercises[1].id,
    blockCategory: "cooldown",
    classSection: "main",
    durationMin: 3,
    selectedLayer: "standard",
  },
  {
    stepId: "role-label-cooldown",
    order: 3,
    exerciseId: exercises[2].id,
    blockCategory: "bridging",
    classSection: "cooldown",
    durationMin: 3,
    selectedLayer: "standard",
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: "mat",
  availableEquipment: ["mat"],
  ownedApparatus: ["mat"],
  level: "1.0",
  preferredProps: ["none"],
  focusPreset: "full-body",
  excludeDaysWindow: 0,
  targetMinutes: 10,
  defaultLayer: "standard",
};

function renderWorkbench() {
  return render(
    <SequenceWorkbench
      planningMode="manual"
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );
}

function visibleGroups(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll(".flow-sections > .flow-section"),
  ).map((section) => {
    const label = section.querySelector(".flow-section-label")!;
    return {
      english: label.firstElementChild?.firstChild?.textContent,
      korean: label.querySelector("strong")?.textContent,
      duration: label.lastElementChild?.textContent,
      names: Array.from(section.querySelectorAll(".step-title strong")).map(
        (name) => name.textContent,
      ),
      restCount: section.querySelectorAll(".rest-step-card").length,
    };
  });
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 390,
  });
  usePilatesStore.setState(
    {
      ...original,
      activeTab: "workbench",
      activeSequenceId: "role-label-synthetic-plan",
      activeTitle: "Synthetic class-role heading QA",
      activeSteps: assignedSteps,
      activeTargetMinutes: 10,
      activeApparatus: "mat",
      activeLevel: "1.0",
      exercises,
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ["mat"],
      ownedApparatus: ["mat"],
      ownedProps: [],
      savedSequences: [],
      historyLogs: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalWidth,
  });
});

describe("workbench class-role headings", () => {
  it("honors assigned roles over conflicting movement categories without changing order, budgets or stored steps", () => {
    const before = usePilatesStore.getState();
    const snapshot = JSON.stringify(before.activeSteps);
    const { container } = renderWorkbench();

    expect(visibleGroups(container)).toEqual([
      {
        english: "WARM-UP",
        korean: "준비",
        duration: "04:00",
        names: [exercises[0].nameKo],
        restCount: 0,
      },
      {
        english: "MAIN FLOW",
        korean: "본운동",
        duration: "03:00",
        names: [exercises[1].nameKo],
        restCount: 0,
      },
      {
        english: "COOL-DOWN",
        korean: "마무리",
        duration: "03:00",
        names: [exercises[2].nameKo],
        restCount: 0,
      },
    ]);
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(usePilatesStore.getState().activeSteps)).toBe(
      snapshot,
    );
  });

  it("preserves category-derived legacy headings and the dedicated rest group even when rest has an explicit role", () => {
    const legacyExercises = [
      syntheticPlanningExercise("mat", "warmup", "alpha", false),
      syntheticPlanningExercise("mat", "core", "alpha", false),
      syntheticPlanningExercise("mat", "cooldown", "alpha", false),
    ];
    const legacySteps: SequenceStep[] = legacyExercises.map(
      (exercise, index) => ({
        stepId: `role-label-legacy-${index}`,
        order: index + 1,
        exerciseId: exercise.id,
        blockCategory: exercise.blockCategory,
        durationMin: [2, 3, 4][index],
        selectedLayer: "standard",
      }),
    );
    legacySteps.splice(1, 0, {
      stepId: "role-label-dedicated-rest",
      order: 2,
      kind: "rest",
      exerciseId: "",
      blockCategory: "warmup",
      classSection: "preparation",
      durationMin: 1,
      selectedLayer: "standard",
    });
    legacySteps.forEach((step, index) => {
      step.order = index + 1;
    });
    usePilatesStore.setState({
      activeSteps: legacySteps,
      exercises: legacyExercises,
    });
    const before = usePilatesStore.getState();
    const snapshot = JSON.stringify(before.activeSteps);
    const { container } = renderWorkbench();

    expect(visibleGroups(container)).toEqual([
      {
        english: "WARM-UP",
        korean: "준비",
        duration: "02:00",
        names: [legacyExercises[0].nameKo],
        restCount: 0,
      },
      {
        english: "REST",
        korean: "중간 휴식",
        duration: "01:00",
        names: [],
        restCount: 1,
      },
      {
        english: "MAIN FLOW",
        korean: "본운동",
        duration: "03:00",
        names: [legacyExercises[1].nameKo],
        restCount: 0,
      },
      {
        english: "COOL-DOWN",
        korean: "마무리",
        duration: "04:00",
        names: [legacyExercises[2].nameKo],
        restCount: 0,
      },
    ]);
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(usePilatesStore.getState().activeSteps)).toBe(
      snapshot,
    );
  });

  it("keeps three canonical sections without duplicate MAIN FLOW headers after reordering a step across section boundaries", () => {
    const fourExercises = [
      syntheticPlanningExercise("mat", "warmup", "alpha", false),
      syntheticPlanningExercise("mat", "core", "alpha", false),
      syntheticPlanningExercise("mat", "extension", "beta", false),
      syntheticPlanningExercise("mat", "cooldown", "alpha", false),
    ];
    // Simulate state after dragging step 0 (preparation) between m1 and m2
    const reorderedSteps: SequenceStep[] = [
      {
        stepId: "reordered-m1",
        order: 1,
        exerciseId: fourExercises[1].id,
        blockCategory: "core",
        classSection: "main",
        durationMin: 3,
        selectedLayer: "standard",
      },
      {
        stepId: "reordered-w1",
        order: 2,
        exerciseId: fourExercises[0].id,
        blockCategory: "warmup",
        classSection: "preparation",
        durationMin: 2,
        selectedLayer: "standard",
      },
      {
        stepId: "reordered-m2",
        order: 3,
        exerciseId: fourExercises[2].id,
        blockCategory: "extension",
        classSection: "main",
        durationMin: 4,
        selectedLayer: "standard",
      },
      {
        stepId: "reordered-c1",
        order: 4,
        exerciseId: fourExercises[3].id,
        blockCategory: "cooldown",
        classSection: "cooldown",
        durationMin: 2,
        selectedLayer: "standard",
      },
    ];
    usePilatesStore.setState({
      activeSteps: reorderedSteps,
      exercises: fourExercises,
    });
    const { container } = renderWorkbench();
    const groups = visibleGroups(container);
    expect(groups.map((g) => g.korean)).toEqual(["준비", "본운동", "마무리"]);
    expect(groups[1]?.names).toEqual([
      fourExercises[0].nameKo,
      fourExercises[2].nameKo,
    ]);
  });

  it("announces the new target position on reorder and announces restoration on Undo in a polite live region", () => {
    const { container, getByRole } = renderWorkbench();
    const downBtn = getByRole("button", {
      name: `1번 ${exercises[0].nameKo} 아래로 이동`,
    });
    fireEvent.click(downBtn);
    const feedback = container.querySelector("[data-plan-feedback]");
    expect(feedback).toHaveAttribute("role", "status");
    expect(feedback).toHaveAttribute("aria-live", "polite");
    expect(feedback).toHaveTextContent("2번째 위치로 바꿨어요. 되돌릴 수 있습니다.");

    const undoBtn = getByRole("button", { name: "되돌리기" });
    fireEvent.click(undoBtn);
    expect(container.querySelector("[data-plan-feedback]")).toHaveTextContent(
      "마지막 변경을 되돌렸어요. 현재 3개 항목 · 10:00입니다.",
    );
    expect(usePilatesStore.getState().activeSteps[0]?.stepId).toBe(
      "role-label-preparation",
    );
  });
});


