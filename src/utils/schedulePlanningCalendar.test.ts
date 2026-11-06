import { describe, expect, it } from "vitest";
import {
  revisionAssigned,
  revisionExercise,
  revisionSchedule,
  revisionSource,
} from "../test/datedRevisionFixtures";
import {
  expandInstructorSchedule,
  scheduleDateObject,
} from "./instructorSchedule";
import {
  describePlanningCalendarDay,
  planningCalendarKeyDate,
  planningCalendarMonth,
  shiftPlanningCalendarMonth,
  summarizePlanningCalendar,
} from "./schedulePlanningCalendar";

describe("bounded local planning calendar dates", () => {
  it.each([
    ["2024-02-29", 29],
    ["2025-02-28", 28],
    ["1900-02-01", 28],
    ["2000-02-01", 29],
    ["2199-12-31", 31],
  ] as const)("uses actual month length for %s", (date, days) => {
    const month = planningCalendarMonth(date);
    expect(month.dates).toHaveLength(days);
    expect(new Set(month.dates).size).toBe(days);
    expect(month.dates[0]).toBe(month.start);
    expect(month.dates.at(-1)).toBe(month.end);
    expect(
      month.dates.every((value) => value.slice(0, 7) === date.slice(0, 7)),
    ).toBe(true);
    expect(scheduleDateObject(date).getHours()).toBe(12);
  });

  it("distinguishes period buttons from same-day month keyboard navigation", () => {
    expect(shiftPlanningCalendarMonth("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftPlanningCalendarMonth("2026-12-31", 1, true)).toBe(
      "2027-01-31",
    );
    expect(shiftPlanningCalendarMonth("2024-01-31", 1, true)).toBe(
      "2024-02-29",
    );
    expect(shiftPlanningCalendarMonth("2025-03-31", -1, true)).toBe(
      "2025-02-28",
    );
    expect(shiftPlanningCalendarMonth("1900-01-01", -1)).toBeNull();
    expect(shiftPlanningCalendarMonth("2199-12-31", 1)).toBeNull();
  });

  it("handles arrows, Monday-based week edges and year boundaries without UTC conversion", () => {
    expect(planningCalendarKeyDate("2026-12-31", "ArrowRight")).toBe(
      "2027-01-01",
    );
    expect(planningCalendarKeyDate("2026-11-04", "Home")).toBe("2026-11-02");
    expect(planningCalendarKeyDate("2026-11-04", "End")).toBe("2026-11-08");
    expect(planningCalendarKeyDate("2026-11-04", "ArrowUp")).toBe("2026-10-28");
    expect(planningCalendarKeyDate("2024-02-29", "PageDown")).toBe(
      "2024-03-29",
    );
    expect(planningCalendarKeyDate("1900-01-01", "ArrowLeft")).toBe(
      "1900-01-01",
    );
    expect(planningCalendarKeyDate("2199-12-31", "PageDown")).toBe(
      "2199-12-31",
    );
    expect(planningCalendarKeyDate("2199-12-31", "End")).toBe("2199-12-31");
    expect(planningCalendarKeyDate("2026-11-04", "Enter")).toBeNull();
    expect(() => planningCalendarMonth("2026-02-30")).toThrow();
  });
});

describe("read-only month preparation summaries", () => {
  it("separates prepared/draft/unassigned, reuses overlaps and retains schedule exceptions", () => {
    const schedule = revisionSchedule();
    schedule.classes.push({
      ...schedule.classes[0],
      id: "overlap",
      recurrence: "once",
      startDate: "2026-11-02",
      untilDate: undefined,
      weekdays: [],
      startTime: "10:20",
      endTime: "11:00",
      linkSavedSequenceId: "missing-source",
    });
    schedule.exceptions.push(
      {
        id: "cancel",
        kind: "cancel",
        classId: "class",
        originalDate: "2026-11-09",
        reason: "",
      },
      {
        id: "close",
        kind: "closed",
        date: "2026-11-16",
        locationId: "place",
        reason: "",
      },
      {
        id: "move",
        kind: "reschedule",
        classId: "class",
        originalDate: "2026-11-30",
        date: "2026-12-01",
        startTime: "10:00",
        endTime: "10:50",
        reason: "",
      },
      { id: "outside", kind: "closed", date: "2027-01-01", reason: "" },
    );
    const prepared = revisionAssigned().assignment;
    const draft = {
      ...revisionAssigned("2026-11-23").assignment,
      state: "draft" as const,
    };
    const input = {
      monthDate: "2026-11-04",
      rows: expandInstructorSchedule(schedule, "2026-11-01", "2026-11-30"),
      schedule,
      planning: { assignments: [prepared, draft] },
      sequences: [revisionSource()],
      exercises: [revisionExercise],
    };
    const before = JSON.stringify(input);
    const days = summarizePlanningCalendar(input);
    expect(days.get("2026-11-02")).toMatchObject({
      scheduled: 2,
      prepared: 1,
      draft: 0,
      unassigned: 1,
      warnings: 1,
      conflicts: 1,
    });
    expect(days.get("2026-11-09")).toMatchObject({
      scheduled: 0,
      cancelled: 1,
      prepared: 0,
    });
    expect(days.get("2026-11-16")).toMatchObject({
      scheduled: 0,
      closed: 1,
      closures: 1,
    });
    expect(days.get("2026-11-23")).toMatchObject({
      scheduled: 1,
      prepared: 0,
      draft: 1,
    });
    expect(days.get("2026-11-30")).toMatchObject({ scheduled: 0, moved: 1 });
    expect(days.has("2026-12-01")).toBe(false);
    expect(days.has("2027-01-01")).toBe(false);
    expect(describePlanningCalendarDay(days.get("2026-11-02")!)).toMatch(
      /준비 표시 1회/,
    );
    expect(JSON.stringify(input)).toBe(before);
  });

  it("uses the preserved rest-inclusive snapshot and keeps prepared state distinct from new warnings", () => {
    const schedule = revisionSchedule();
    const assignment = revisionAssigned().assignment;
    const changedSource = revisionSource();
    changedSource.steps = [{ ...changedSource.steps[0], durationMin: 10 }];
    const input = {
      monthDate: "2026-11-02",
      rows: expandInstructorSchedule(schedule, "2026-11-01", "2026-11-30"),
      schedule,
      planning: { assignments: [assignment] },
      sequences: [changedSource],
      exercises: [revisionExercise],
    };
    expect(summarizePlanningCalendar(input).get("2026-11-02")).toMatchObject({
      prepared: 1,
      warnings: 0,
    });
    schedule.classes[0].endTime = "10:30";
    const changedRows = expandInstructorSchedule(
      schedule,
      "2026-11-01",
      "2026-11-30",
    );
    expect(
      summarizePlanningCalendar({ ...input, rows: changedRows }).get(
        "2026-11-02",
      ),
    ).toMatchObject({ prepared: 1, warnings: 1 });
    expect(assignment.sequenceSnapshot.steps).toHaveLength(2);
    expect(assignment.sequenceSnapshot.steps[1].kind).toBe("rest");
  });
});
