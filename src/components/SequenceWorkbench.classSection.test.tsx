import { cleanup, render } from "@testing-library/react";
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
});
