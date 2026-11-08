import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react";
import {
  EQUIPMENT_OPTIONS,
  isEquipmentId,
  PROP_OPTIONS,
} from "../data/equipmentCatalog";
import { usePilatesStore } from "../store/usePilatesStore";
import { isScheduleDate } from "../schemas/instructorScheduleSchema";
import type {
  InstructorLocation,
  InstructorScheduledClass,
  InstructorScheduleData,
  InstructorScheduleException,
  InstructorScheduleOccurrence,
} from "../types/instructorSchedule";
import {
  addScheduleDays,
  expandInstructorSchedule,
  findInstructorScheduleConflicts,
  formatScheduleDate,
  formatScheduleTime,
  getSchedulePlanWarnings,
  localScheduleDate,
  scheduleDateObject,
  scheduleDateRange,
  scheduleMinutes,
  scheduleWeekStart,
  SCHEDULE_WEEKDAYS,
} from "../utils/instructorSchedule";
import { LightDismissDialog } from "./LightDismissDialog";
import { DatedSequencePlanningDialog } from "./DatedSequencePlanningDialog";
import { getDatedPlanWarnings } from "../utils/datedSequencePlanning";
import "../styles/schedule.css";

type MoveDraft = {
  classId: string;
  originalDate: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  reason: string;
};
const newLocation = (): InstructorLocation => ({
  id: "",
  alias: "",
  equipmentIds: [],
  propIds: [],
  notes: "",
});
const newClass = (date: string, locationId = ""): InstructorScheduledClass => ({
  id: "",
  title: "",
  participantAlias: "",
  locationId,
  startDate: date,
  startTime: "09:00",
  endTime: "09:50",
  recurrence: "once",
  weekdays: [],
  notes: "",
});
const exceptionLabel = (item: InstructorScheduleException) =>
  item.kind === "closed"
    ? `${formatScheduleDate(item.date)} 휴무`
    : `${formatScheduleDate(item.originalDate)} ${item.kind === "cancel" ? "취소" : `→ ${formatScheduleDate(item.date)} 변경`}`;

export const InstructorScheduleView: React.FC<{ today?: string }> = ({
  today = localScheduleDate(),
}) => {
  const {
    instructorSchedule: data,
    setInstructorSchedule,
    savedSequences,
    exercises,
    ownedEquipment,
    ownedProps,
    loadSequenceIntoWorkbench,
    setActiveTab,
    generationError,
    datedSequencePlanning,
    assignSequenceToOccurrence,
    setDatedSequencePlanState,
    previewDatedSequencePlanWeekCopy,
    copyDatedSequencePlanWeek,
    loadDatedSequencePlanAsDraft,
    replaceDatedSequencePlanSnapshot,
  } = usePilatesStore();
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<"day" | "week">("day");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [classDraft, setClassDraft] = useState<InstructorScheduledClass | null>(
    null,
  );
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState(newLocation);
  const [moveDraft, setMoveDraft] = useState<MoveDraft | null>(null);
  const [closedDraft, setClosedDraft] = useState<{
    date: string;
    locationId: string;
    reason: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [planningTarget, setPlanningTarget] = useState<{
    date: string;
    mode?: "day" | "week" | "month";
    occurrence?: Pick<InstructorScheduleOccurrence, "classId" | "originalDate">;
  } | null>(null);
  const weekStripRef = useRef<HTMLDivElement>(null);
  const pendingStripFocus = useRef(false);
  useEffect(() => {
    const strip = weekStripRef.current;
    const selected = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !selected) return;
    if (pendingStripFocus.current) {
      pendingStripFocus.current = false;
      selected.focus({ preventScroll: true });
    }
    const bounds = strip.getBoundingClientRect();
    const target = selected.getBoundingClientRect();
    if (target.right > bounds.right) strip.scrollLeft += target.right - bounds.right;
    else if (target.left < bounds.left) strip.scrollLeft -= bounds.left - target.left;
  }, [selectedDate]);
  const selectedDayHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingDayFocus = useRef(false);
  useEffect(() => {
    if (pendingDayFocus.current && mode === "day" && !planningTarget) {
      pendingDayFocus.current = false;
      selectedDayHeadingRef.current?.focus();
    }
  }, [selectedDate, mode, planningTarget]);
  const classFormRef = useRef<HTMLFormElement | null>(null);
  const locationFormRef = useRef<HTMLFormElement | null>(null);
  const moveFormRef = useRef<HTMLFormElement | null>(null);
  const closedFormRef = useRef<HTMLFormElement | null>(null);
  const closeNative = (form: HTMLFormElement | null) => {
    const dialog = form?.closest<HTMLDialogElement>("dialog");
    if (dialog?.open) dialog.close();
  };
  const closeClass = () => {
    closeNative(classFormRef.current);
    setClassDraft(null);
  };
  const closeLocations = () => {
    closeNative(locationFormRef.current);
    setLocationsOpen(false);
  };
  const closeMove = () => {
    closeNative(moveFormRef.current);
    setMoveDraft(null);
  };
  const closeClosed = () => {
    closeNative(closedFormRef.current);
    setClosedDraft(null);
  };

  const start =
    mode === "week" ? scheduleWeekStart(selectedDate) : selectedDate;
  const rawEnd = mode === "week" ? addScheduleDays(start, 6) : start;
  const end = rawEnd > "2199-12-31" ? "2199-12-31" : rawEnd;
  const selectDate = (date: string) => {
    if (isScheduleDate(date)) setSelectedDate(date);
    else setMessage("일정 날짜는 1900년부터 2199년까지 선택해 주세요.");
  };
  const previousDate = addScheduleDays(selectedDate, mode === "day" ? -1 : -7);
  const nextDate = addScheduleDays(selectedDate, mode === "day" ? 1 : 7);
  const dates = useMemo(() => scheduleDateRange(start, end), [start, end]);
  const stripStart = scheduleWeekStart(selectedDate);
  const stripEnd = addScheduleDays(stripStart, 6) > "2199-12-31"
    ? "2199-12-31"
    : addScheduleDays(stripStart, 6);
  const stripDates = useMemo(() => scheduleDateRange(stripStart, stripEnd), [stripStart, stripEnd]);
  const stripRows = useMemo(() => expandInstructorSchedule(data, stripStart, stripEnd), [data, stripStart, stripEnd]);
  const selectStripDate = (date: string) => {
    selectDate(date);
    setMode("day");
  };
  const handleStripKey = (event: React.KeyboardEvent<HTMLButtonElement>, date: string) => {
    const target = event.key === "ArrowRight" ? addScheduleDays(date, 1)
      : event.key === "ArrowLeft" ? addScheduleDays(date, -1)
      : event.key === "Home" ? stripStart
      : event.key === "End" ? stripEnd
      : null;
    if (!target) return;
    event.preventDefault();
    if (isScheduleDate(target) && target !== selectedDate) {
      pendingStripFocus.current = true;
      selectStripDate(target);
    }
  };
  const rows = useMemo(
    () => expandInstructorSchedule(data, start, end),
    [data, start, end],
  );
  const conflicts = useMemo(
    () => findInstructorScheduleConflicts(rows),
    [rows],
  );
  const locationName = (id: string) =>
    data.locations.find((item) => item.id === id)?.alias ?? "장소 미상";
  const commit = (next: InstructorScheduleData, success: string) => {
    const result = setInstructorSchedule(next);
    setMessage(result.success ? success : result.message);
    setFormError(result.success ? "" : result.message);
    return result.success;
  };
  const removeException = (id: string) =>
    commit(
      { ...data, exceptions: data.exceptions.filter((item) => item.id !== id) },
      "원래 일정을 복원했습니다.",
    );
  const savingScheduleRef = useRef(false);
  const openClass = (date = selectedDate) => {
    savingScheduleRef.current = false;
    setConfirmDelete("");
    setFormError("");
    setClassDraft(
      newClass(date, data.locations.length === 1 ? data.locations[0].id : ""),
    );
  };
  const editClass = (item: InstructorScheduledClass) => {
    savingScheduleRef.current = false;
    setConfirmDelete("");
    setFormError("");
    setClassDraft({ ...item, weekdays: [...item.weekdays] });
  };
  const saveClass = (event: React.FormEvent) => {
    event.preventDefault();
    if (!classDraft || savingScheduleRef.current) return;
    savingScheduleRef.current = true;
    let saved = false;
    try {
      const item = {
        ...classDraft,
        id: classDraft.id || crypto.randomUUID(),
        ...(classDraft.recurrence === "once"
          ? { weekdays: [], untilDate: undefined }
          : {}),
      };
      saved = commit(
        {
          ...data,
          classes: [
            ...data.classes.filter((value) => value.id !== item.id),
            item,
          ],
        },
        "수업 일정을 저장했습니다.",
      );
      if (saved) {
        setSelectedDate(item.startDate);
        closeClass();
      }
    } finally {
      if (saved) {
        window.setTimeout(() => {
          savingScheduleRef.current = false;
        }, 0);
      } else {
        savingScheduleRef.current = false;
      }
    }
  };
  const saveLocation = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedAlias = locationDraft.alias
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (
      !locationDraft.id &&
      normalizedAlias &&
      data.locations.some(
        (loc) =>
          loc.alias.trim().toLowerCase().replace(/\s+/g, " ") ===
          normalizedAlias,
      )
    ) {
      const duplicateError =
        "이미 등록된 장소 별칭입니다. 기존 장소를 선택해 수정해 주세요.";
      setFormError(duplicateError);
      setMessage(duplicateError);
      return;
    }
    const item = {
      ...locationDraft,
      id: locationDraft.id || crypto.randomUUID(),
    };
    if (
      commit(
        {
          ...data,
          locations: [
            ...data.locations.filter((value) => value.id !== item.id),
            item,
          ],
        },
        "장소와 준비물을 저장했습니다.",
      )
    )
      setLocationDraft(newLocation());
  };
  const cancelOccurrence = (row: InstructorScheduleOccurrence) => {
    const exception: InstructorScheduleException = {
      id: crypto.randomUUID(),
      kind: "cancel",
      classId: row.classId,
      originalDate: row.originalDate,
      reason: "직접 취소",
    };
    commit(
      {
        ...data,
        exceptions: [
          ...data.exceptions.filter(
            (item) =>
              item.kind === "closed" ||
              item.classId !== row.classId ||
              item.originalDate !== row.originalDate,
          ),
          exception,
        ],
      },
      "이번 회차만 취소했습니다. 반복 원본은 유지됩니다.",
    );
  };
  const saveMove = (event: React.FormEvent) => {
    event.preventDefault();
    if (!moveDraft || savingScheduleRef.current) return;
    savingScheduleRef.current = true;
    let saved = false;
    try {
      const exception: InstructorScheduleException = {
        ...moveDraft,
        id: crypto.randomUUID(),
        kind: "reschedule",
      };
      saved = commit(
        {
          ...data,
          exceptions: [
            ...data.exceptions.filter(
              (item) =>
                item.kind === "closed" ||
                item.classId !== moveDraft.classId ||
                item.originalDate !== moveDraft.originalDate,
            ),
            exception,
          ],
        },
        "이번 회차의 날짜·시각·장소를 변경했습니다.",
      );
      if (saved) {
        setSelectedDate(moveDraft.date);
        closeMove();
      }
    } finally {
      if (saved) {
        window.setTimeout(() => {
          savingScheduleRef.current = false;
        }, 0);
      } else {
        savingScheduleRef.current = false;
      }
    }
  };
  const saveClosed = (event: React.FormEvent) => {
    event.preventDefault();
    if (!closedDraft || savingScheduleRef.current) return;
    savingScheduleRef.current = true;
    let saved = false;
    try {
      const exception: InstructorScheduleException = {
        id: crypto.randomUUID(),
        kind: "closed",
        date: closedDraft.date,
        reason: closedDraft.reason,
        ...(closedDraft.locationId ? { locationId: closedDraft.locationId } : {}),
      };
      saved = commit(
        { ...data, exceptions: [...data.exceptions, exception] },
        "휴무를 등록했습니다. 해당 회차는 시간 충돌 계산에서 제외됩니다.",
      );
      if (saved) {
        setSelectedDate(closedDraft.date);
        closeClosed();
      }
    } finally {
      if (saved) {
        window.setTimeout(() => {
          savingScheduleRef.current = false;
        }, 0);
      } else {
        savingScheduleRef.current = false;
      }
    }
  };
  const renderTimeFields = (
    draft: { startTime: string; endTime: string },
    onChange: (patch: { startTime?: string; endTime?: string }) => void,
  ) => (
    <div className="schedule-form-grid">
      <label>
        시작 시각
        <input
          type="time"
          aria-label="시작 시각"
          required
          value={draft.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
        />
        <span className="muted">{formatScheduleTime(draft.startTime)}</span>
      </label>
      <label>
        종료 시각
        <input
          type="time"
          aria-label="종료 시각"
          required
          value={draft.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
        />
        <span className="muted">{formatScheduleTime(draft.endTime)}</span>
      </label>
    </div>
  );

  return (
    <section className="instructor-schedule" aria-label="강사 일정">
      <header className="schedule-page-header">
        <div>
          <span className="eyebrow">내 수업의 한 주</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            강사 일정
          </h1>
          <p className="muted">날짜별 수업과 장소를 한눈에 확인하고, 다음 수업을 준비하세요.</p>
          <p className="schedule-storage-note">
            <span>이 기기에 저장</span> 장소와 반 이름은 별칭으로 입력해도 됩니다.
            외부 캘린더와 연결하지 않습니다.
          </p>
        </div>
        <div className="schedule-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => openClass()}
          >
            <Plus size={16} /> 수업 추가
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setFormError("");
              setLocationsOpen(true);
              setLocationDraft(newLocation());
            }}
          >
            장소 관리
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              savingScheduleRef.current = false;
              setFormError("");
              setClosedDraft({
                date: selectedDate,
                locationId: "",
                reason: "",
              });
            }}
          >
            휴무 등록
          </button>
        </div>
      </header>
      {message && (
        <p className="status schedule-feedback" role="status">
          {message}
        </p>
      )}
      {generationError?.includes("일정") && (
        <p className="schedule-warning" role="alert">
          {generationError}
        </p>
      )}
      <div className="schedule-toolbar">
        <div
          className="schedule-view-toggle"
          role="group"
          aria-label="일정 보기"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            );
            if (buttons.length === 0) return;
            const activeIndex = buttons.indexOf(
              (buttons.includes(event.target as HTMLButtonElement)
                ? event.target
                : document.activeElement) as HTMLButtonElement,
            );
            const currentIndex =
              activeIndex !== -1 ? activeIndex : mode === "day" ? 0 : 1;
            const nextIndex =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : event.key === "ArrowRight"
                    ? (currentIndex + 1) % buttons.length
                    : (currentIndex - 1 + buttons.length) % buttons.length;
            setMode(nextIndex === 0 ? "day" : "week");
            buttons[nextIndex]?.focus();
          }}
        >
          <button
            type="button"
            className={mode === "day" ? "btn-primary" : "btn-secondary"}
            aria-pressed={mode === "day"}
            onClick={() => setMode("day")}
          >
            일간 보기
          </button>
          <button
            type="button"
            className={mode === "week" ? "btn-primary" : "btn-secondary"}
            aria-pressed={mode === "week"}
            onClick={() => setMode("week")}
          >
            주간 보기
          </button>
        </div>
        <div className="schedule-date-nav">
          <button
            type="button"
            className="icon-button"
            aria-label="이전 기간"
            title={mode === "day" ? "이전 날짜" : "이전 주"}
            disabled={!isScheduleDate(previousDate)}
            onClick={() => selectDate(previousDate)}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            기준 날짜
            <input
              type="date"
              min="1900-01-01"
              max="2199-12-31"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) selectDate(e.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="icon-button"
            aria-label="다음 기간"
            title={mode === "day" ? "다음 날짜" : "다음 주"}
            disabled={!isScheduleDate(nextDate)}
            onClick={() => selectDate(nextDate)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSelectedDate(today);
              setMode("day");
            }}
          >
            오늘로
          </button>
        </div>
      </div>
      <div className="schedule-week-selector">
        <div className="schedule-week-caption">
          <strong><CalendarDays size={18} aria-hidden="true" /> {Number(selectedDate.slice(0, 4))}년 {Number(selectedDate.slice(5, 7))}월</strong>
          <span>날짜를 선택해 수업을 확인하세요<span className="schedule-week-scroll-hint"> · 좌우로 넘겨보기</span></span>
        </div>
        <div className="schedule-week-strip" role="group" aria-label="한 주 날짜 선택" ref={weekStripRef}>
          {stripDates.map((date) => {
            const count = stripRows.filter((row) => row.date === date && row.status === "scheduled").length;
            return (
              <button
                type="button"
                key={date}
                aria-label={`${formatScheduleDate(date)} 예정 ${count}회`}
                aria-pressed={date === selectedDate}
                aria-current={date === today ? "date" : undefined}
                tabIndex={date === selectedDate ? 0 : -1}
                onClick={() => selectStripDate(date)}
                onKeyDown={(event) => handleStripKey(event, date)}
              >
                <span className="schedule-weekday" aria-hidden="true">{SCHEDULE_WEEKDAYS[scheduleDateObject(date).getDay()]}</span>
                <strong aria-hidden="true">{Number(date.slice(8, 10))}</strong>
                <span className="schedule-week-count" aria-hidden="true">{count ? `${count}회` : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="schedule-summary" aria-live="polite" aria-atomic="true">
        <span className="schedule-summary-period">{mode === "day" ? "선택한 날" : "선택한 주"}</span>
        {formatScheduleDate(start)}
        {end !== start ? ` – ${formatScheduleDate(end)}` : ""} · 예정{" "}
        {rows.filter((row) => row.status === "scheduled").length}회
        {conflicts.length > 0 && (
          <strong role="status"> · 시간 겹침 {conflicts.length}건</strong>
        )}
      </p>
      {!data.locations.length && (
        <div className="schedule-empty">
          <MapPin size={25} />
          <h2>수업할 장소를 먼저 등록해 주세요</h2>
          <p>
            장소 별칭과 그곳에 있는 정확한 기구·소도구를 저장하면 연결한 계획의
            준비물을 확인할 수 있어요.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setFormError("");
              setLocationsOpen(true);
            }}
          >
            첫 장소 등록
          </button>
        </div>
      )}
      <div className={`schedule-days schedule-days-${mode}`}>
        {dates.map((date) => (
          <section
            className="schedule-day"
            key={date}
            aria-label={formatScheduleDate(date)}
          >
            <header>
              <h2
                ref={date === selectedDate ? selectedDayHeadingRef : undefined}
                tabIndex={-1}
              >
                {formatScheduleDate(date)}
                {date === today && <span className="schedule-badge">오늘</span>}
              </h2>
              <div className="schedule-day-actions">
                {mode === "week" && (
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`${formatScheduleDate(date)} 일간 보기`}
                    onClick={() => {
                      pendingDayFocus.current = true;
                      selectDate(date);
                      setMode("day");
                    }}
                  >
                    이 날짜만 보기
                  </button>
                )}
              <button
                type="button"
                className="icon-button"
                aria-label={`${formatScheduleDate(date)} 수업 추가`}
                onClick={() => openClass(date)}
              >
                <Plus size={16} />
              </button>
              </div>
            </header>
            {data.exceptions
              .filter((item) => item.kind === "closed" && item.date === date)
              .map(
                (item) =>
                  item.kind === "closed" && (
                    <div key={item.id} className="schedule-closure">
                      <strong>
                        휴무 ·{" "}
                        {item.locationId
                          ? locationName(item.locationId)
                          : "모든 장소"}
                      </strong>
                      {item.reason && <span>{item.reason}</span>}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => removeException(item.id)}
                      >
                        휴무 해제
                      </button>
                    </div>
                  ),
              )}
            {!rows.some((row) => row.date === date) && (
              <div className="schedule-day-empty">
                <CalendarDays size={25} aria-hidden="true" />
                <p>등록한 수업이 없습니다.</p>
                <span>{data.locations.length ? "새 수업을 추가해 이 날짜의 일정을 채워보세요." : "장소를 등록한 다음 수업을 추가할 수 있어요."}</span>
                {!!data.locations.length && (
                  <button type="button" className="text-button" onClick={() => openClass(date)}>
                    <Plus size={15} aria-hidden="true" /> 이 날짜에 수업 추가
                  </button>
                )}
              </div>
            )}
            {rows
              .filter((row) => row.date === date)
              .map((row) => {
                const datedAssignment = datedSequencePlanning?.assignments.find(
                  (item) =>
                    item.classId === row.classId &&
                    item.originalDate === row.originalDate,
                );
                const clash = conflicts.filter(
                  (item) => item.leftId === row.id || item.rightId === row.id,
                );
                const warnings =
                  row.status === "scheduled"
                    ? datedAssignment
                      ? getDatedPlanWarnings({
                          assignment: datedAssignment,
                          schedule: data,
                          exercises,
                        })
                      : getSchedulePlanWarnings(
                          row,
                          data,
                          savedSequences,
                          exercises,
                        )
                    : [];
                const exception = data.exceptions.find(
                  (item) =>
                    item.kind !== "closed" &&
                    item.classId === row.classId &&
                    item.originalDate === row.originalDate,
                );
                const base = data.classes.find(
                  (item) => item.id === row.classId,
                );
                return (
                  <article
                    className={`schedule-class schedule-class-${row.status}`}
                    key={row.id}
                    aria-label={`${row.title} ${formatScheduleTime(row.startTime)}`}
                  >
                    <div className="schedule-class-top">
                      <span className="schedule-class-time">
                        <Clock3 size={15} /> {formatScheduleTime(row.startTime)}{" "}
                        – {formatScheduleTime(row.endTime)}
                      </span>
                      <span className="schedule-badge">
                        {
                          {
                            scheduled: row.movedFrom ? "변경된 회차" : "예정",
                            cancelled: "취소",
                            closed: "휴무",
                            moved: "이동",
                          }[row.status]
                        }
                      </span>
                    </div>
                    <h3>{row.title}</h3>
                    <p className="schedule-class-meta">
                      <MapPin size={14} aria-hidden="true" /> {locationName(row.locationId)}
                      {row.participantAlias && (
                        <span> · {row.participantAlias}</span>
                      )}
                      <span className="schedule-duration">{scheduleMinutes(row.endTime) - scheduleMinutes(row.startTime)}분</span>
                    </p>
                    {row.movedFrom && (
                      <p className="muted">
                        원래 {formatScheduleDate(row.movedFrom)} 회차
                      </p>
                    )}
                    {row.movedTo && (
                      <p>변경 날짜: {formatScheduleDate(row.movedTo)}</p>
                    )}
                    {row.reason && row.status !== "scheduled" && (
                      <p className="muted">{row.reason}</p>
                    )}
                    {row.notes && <p className="schedule-note">{row.notes}</p>}
                    {datedAssignment && (
                      <p className="schedule-note">
                        날짜별 계획: {datedAssignment.sequenceSnapshot.title} ·{" "}
                        {datedAssignment.state === "prepared"
                          ? "준비 표시"
                          : "작성 중"}
                      </p>
                    )}
                    {clash.map((item) => {
                      const other = rows.find(
                        (value) =>
                          value.id ===
                          (item.leftId === row.id ? item.rightId : item.leftId),
                      );
                      return (
                        <p
                          className="schedule-warning"
                          key={`${item.leftId}-${item.rightId}`}
                        >
                          <AlertTriangle size={15} /> 시간 겹침 · {other?.title}{" "}
                          ({formatScheduleTime(item.startTime)}–
                          {formatScheduleTime(item.endTime)})
                        </p>
                      );
                    })}
                    {warnings.map((warning) => (
                      <p className="schedule-warning" key={warning}>
                        <AlertTriangle size={15} /> {warning}
                      </p>
                    ))}
                    {row.linkSavedSequenceId &&
                      savedSequences.some(
                        (item) => item.id === row.linkSavedSequenceId,
                      ) && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            loadSequenceIntoWorkbench(row.linkSavedSequenceId!);
                            setActiveTab("workbench");
                          }}
                        >
                          {datedAssignment
                            ? "기본 연결 계획 열기"
                            : "연결 계획 열기"}
                        </button>
                      )}
                    <div className="schedule-card-actions">
                      {(row.status === "scheduled" || datedAssignment) && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setPlanningTarget({
                              date: row.date,
                              occurrence: {
                                classId: row.classId,
                                originalDate: row.originalDate,
                              },
                            })
                          }
                        >
                          날짜별 계획
                        </button>
                      )}
                      {(row.status === "scheduled" ||
                        row.status === "closed") && (
                        <>
                          {row.status === "scheduled" && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => cancelOccurrence(row)}
                            >
                              이번 수업 취소
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              savingScheduleRef.current = false;
                              setFormError("");
                              setMoveDraft({
                                classId: row.classId,
                                originalDate: row.originalDate,
                                date: row.date,
                                startTime: row.startTime,
                                endTime: row.endTime,
                                locationId: row.locationId,
                                reason: "",
                              });
                            }}
                          >
                            이번 수업 변경
                          </button>
                        </>
                      )}
                      {exception && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => removeException(exception.id)}
                        >
                          원래 일정 복원
                        </button>
                      )}
                      {base && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => editClass(base)}
                        >
                          {base.recurrence === "weekly"
                            ? "반복 일정 수정"
                            : "일정 수정"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
          </section>
        ))}
      </div>
      <aside className="schedule-planning-entry" aria-label="수업 준비 도구">
        <div className="schedule-planning-copy">
          <CalendarDays size={20} aria-hidden="true" />
          <div><strong>일정 다음은, 수업 준비</strong><p>회차별 계획 사본과 준비 표시를 별도로 관리합니다.</p></div>
        </div>
        <div className="schedule-planning-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setPlanningTarget({ date: selectedDate })}
        >
          주·월 시퀀스 계획
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setPlanningTarget({ date: selectedDate, mode: "month" })
          }
        >
          월간 준비 보기
        </button>
        </div>
      </aside>
      {!!data.classes.length && (
        <details className="schedule-register">
          <summary>
            등록한 일정 {data.classes.length}개 · 기간 밖 일정도 수정
          </summary>
          {data.classes.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.title}</strong> · {locationName(item.locationId)}{" "}
                ·{" "}
                {item.recurrence === "weekly"
                  ? `매주 ${item.weekdays.map((day) => SCHEDULE_WEEKDAYS[day]).join("·")} · ${item.startDate}–${item.untilDate}`
                  : item.startDate}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => editClass(item)}
              >
                일정 수정
              </button>
            </div>
          ))}
        </details>
      )}
      {!!data.exceptions.length && (
        <details className="schedule-register">
          <summary>변경·휴무 기록 {data.exceptions.length}개</summary>
          {data.exceptions.map((item) => (
            <div key={item.id}>
              <span>
                {exceptionLabel(item)}
                {item.kind !== "closed" &&
                  ` · ${data.classes.find((value) => value.id === item.classId)?.title ?? ""}`}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => removeException(item.id)}
              >
                {item.kind === "closed" ? "휴무 해제" : "원래 일정 복원"}
              </button>
            </div>
          ))}
        </details>
      )}

      {planningTarget && (
        <DatedSequencePlanningDialog
          onClose={() => setPlanningTarget(null)}
          initialDate={planningTarget.date}
          initialMode={planningTarget.mode}
          onOpenScheduleDate={(date) => {
            pendingDayFocus.current = true;
            selectDate(date);
            setMode("day");
          }}
          initialOccurrence={planningTarget.occurrence}
          schedule={data}
          savedSequences={savedSequences}
          exercises={exercises}
          planning={datedSequencePlanning}
          onAssign={assignSequenceToOccurrence}
          onSetState={setDatedSequencePlanState}
          onPreviewWeekCopy={previewDatedSequencePlanWeekCopy}
          onCopyWeek={copyDatedSequencePlanWeek}
          onLoadDraft={loadDatedSequencePlanAsDraft}
          onReplaceSnapshot={replaceDatedSequencePlanSnapshot}
          onLoadSuccess={() => setActiveTab("workbench")}
        />
      )}

      <LightDismissDialog
        open={!!classDraft}
        onClose={() => closeClass()}
        title="수업 일정"
        subtitle="반복 수업의 변경은 전체 원본에 적용됩니다. 한 회차만 바꾸려면 이번 수업 변경을 사용해 주세요."
        maxWidth="680px"
      >
        {classDraft && (
          <form
            ref={classFormRef}
            className="schedule-form"
            onSubmit={saveClass}
          >
            {formError && (
              <p className="schedule-warning" role="alert">
                {formError}
              </p>
            )}
            <label>
              수업 제목
              <input
                required
                maxLength={100}
                value={classDraft.title}
                onChange={(e) =>
                  setClassDraft({ ...classDraft, title: e.target.value })
                }
              />
            </label>
            <label>
              반·회원 별칭
              <input
                maxLength={100}
                value={classDraft.participantAlias}
                onChange={(e) =>
                  setClassDraft({
                    ...classDraft,
                    participantAlias: e.target.value,
                  })
                }
              />
            </label>
            <label>
              수업 장소
              <select
                required
                value={classDraft.locationId}
                onChange={(e) =>
                  setClassDraft({ ...classDraft, locationId: e.target.value })
                }
              >
                <option value="">장소 선택</option>
                {data.locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.alias}
                  </option>
                ))}
              </select>
            </label>
            {!data.locations.length && (
              <p className="schedule-warning">
                장소 관리에서 장소를 먼저 등록해 주세요.
              </p>
            )}
            <label>
              시작 날짜
              <input
                type="date"
                required
                value={classDraft.startDate}
                onChange={(e) =>
                  setClassDraft({ ...classDraft, startDate: e.target.value })
                }
              />
            </label>
            {renderTimeFields(classDraft, (patch) =>
              setClassDraft({ ...classDraft, ...patch }),
            )}
            <label>
              반복
              <select
                value={classDraft.recurrence}
                onChange={(e) =>
                  setClassDraft({
                    ...classDraft,
                    recurrence: e.target.value as "once" | "weekly",
                    weekdays: classDraft.weekdays.length
                      ? classDraft.weekdays
                      : [scheduleDateObject(classDraft.startDate).getDay()],
                    untilDate:
                      classDraft.untilDate ??
                      addScheduleDays(classDraft.startDate, 84),
                  })
                }
              >
                <option value="once">한 번</option>
                <option value="weekly">매주</option>
              </select>
            </label>
            {classDraft.recurrence === "weekly" && (
              <>
                <fieldset className="schedule-fieldset">
                  <legend>반복 요일</legend>
                  <div className="schedule-choices">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <label key={day}>
                        <input
                          type="checkbox"
                          checked={classDraft.weekdays.includes(day)}
                          onChange={() =>
                            setClassDraft({
                              ...classDraft,
                              weekdays: classDraft.weekdays.includes(day)
                                ? classDraft.weekdays.filter(
                                    (value) => value !== day,
                                  )
                                : [...classDraft.weekdays, day],
                            })
                          }
                        />
                        {SCHEDULE_WEEKDAYS[day]}요일
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  반복 종료 날짜
                  <input
                    type="date"
                    required
                    min={classDraft.startDate}
                    value={classDraft.untilDate ?? ""}
                    onChange={(e) =>
                      setClassDraft({
                        ...classDraft,
                        untilDate: e.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <label>
              연결 시퀀스
              <select
                value={classDraft.linkSavedSequenceId ?? ""}
                onChange={(e) =>
                  setClassDraft({
                    ...classDraft,
                    linkSavedSequenceId: e.target.value || undefined,
                  })
                }
              >
                <option value="">연결하지 않음</option>
                {classDraft.linkSavedSequenceId &&
                  !savedSequences.some(
                    (item) => item.id === classDraft.linkSavedSequenceId,
                  ) && (
                    <option value={classDraft.linkSavedSequenceId}>
                      삭제된 시퀀스 · 다시 선택해 주세요
                    </option>
                  )}
                {savedSequences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              일정 메모
              <textarea
                maxLength={2000}
                value={classDraft.notes}
                onChange={(e) =>
                  setClassDraft({ ...classDraft, notes: e.target.value })
                }
              />
            </label>
            <p className="muted">
              같은 날 시작과 종료를 입력해 주세요. 시각은 이 기기의 현지 달력을
              기준으로 표시합니다.
            </p>
            <div className="schedule-actions">
              <button type="submit" className="btn-primary">
                일정 저장
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => closeClass()}
              >
                닫기
              </button>
            </div>
            {classDraft.id && (
              <div className="schedule-delete">
                {confirmDelete === classDraft.id ? (
                  <>
                    <p>이 일정과 그 일정의 취소·변경 기록을 삭제할까요?</p>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (
                          commit(
                            {
                              ...data,
                              classes: data.classes.filter(
                                (item) => item.id !== classDraft.id,
                              ),
                              exceptions: data.exceptions.filter(
                                (item) =>
                                  item.kind === "closed" ||
                                  item.classId !== classDraft.id,
                              ),
                            },
                            "일정과 연결된 회차 변경 기록을 삭제했습니다.",
                          )
                        )
                          closeClass();
                      }}
                    >
                      일정 삭제 확인
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setConfirmDelete("")}
                    >
                      삭제 취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setConfirmDelete(classDraft.id)}
                  >
                    일정 삭제
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </LightDismissDialog>

      <LightDismissDialog
        open={locationsOpen}
        onClose={() => closeLocations()}
        title="장소 관리"
        subtitle="주소 대신 별칭으로 충분합니다. 실제 준비된 기구와 소도구를 선택해 주세요."
        maxWidth="720px"
      >
        <div className="schedule-location-list">
          {!data.locations.length && <p>등록한 장소가 없습니다.</p>}
          {data.locations.map((item) => (
            <button
              key={item.id}
              type="button"
              className="btn-secondary"
              onClick={() => {
                setLocationDraft({
                  ...item,
                  equipmentIds: [...item.equipmentIds],
                  propIds: [...item.propIds],
                });
                setConfirmDelete("");
              }}
            >
              {item.alias}
            </button>
          ))}
          {locationDraft.id && (
            <button
              type="button"
              className="text-button"
              onClick={() => setLocationDraft(newLocation())}
            >
              새 장소 입력
            </button>
          )}
        </div>
        <form
          ref={locationFormRef}
          className="schedule-form"
          onSubmit={saveLocation}
        >
          {formError && (
            <p className="schedule-warning" role="alert">
              {formError}
            </p>
          )}
          <label>
            장소 별칭
            <input
              required
              maxLength={100}
              value={locationDraft.alias}
              onChange={(e) =>
                setLocationDraft({ ...locationDraft, alias: e.target.value })
              }
            />
          </label>
          <fieldset className="schedule-fieldset">
            <legend>장소 기구</legend>
            <div className="schedule-choices">
              {EQUIPMENT_OPTIONS.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={locationDraft.equipmentIds.includes(item.id)}
                    onChange={() =>
                      setLocationDraft({
                        ...locationDraft,
                        equipmentIds: locationDraft.equipmentIds.includes(
                          item.id,
                        )
                          ? locationDraft.equipmentIds.filter(
                              (id) => id !== item.id,
                            )
                          : [...locationDraft.equipmentIds, item.id],
                      })
                    }
                  />
                  {item.labelKo}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="schedule-fieldset">
            <legend>장소 소도구</legend>
            <div className="schedule-choices">
              {PROP_OPTIONS.filter((item) => item.id !== "none").map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={locationDraft.propIds.includes(
                      item.id as Exclude<typeof item.id, "none">,
                    )}
                    onChange={() =>
                      setLocationDraft({
                        ...locationDraft,
                        propIds: locationDraft.propIds.includes(
                          item.id as Exclude<typeof item.id, "none">,
                        )
                          ? locationDraft.propIds.filter((id) => id !== item.id)
                          : [
                              ...locationDraft.propIds,
                              item.id as Exclude<typeof item.id, "none">,
                            ],
                      })
                    }
                  />
                  {item.labelKo}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setLocationDraft({
                ...locationDraft,
                equipmentIds: ownedEquipment.filter(isEquipmentId),
                propIds: ownedProps.filter((id) => id !== "none"),
              })
            }
          >
            현재 보유 준비물 복사
          </button>
          <label>
            장소 메모
            <textarea
              maxLength={2000}
              value={locationDraft.notes}
              onChange={(e) =>
                setLocationDraft({ ...locationDraft, notes: e.target.value })
              }
            />
          </label>
          <div className="schedule-actions">
            <button type="submit" className="btn-primary">
              장소 저장
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => closeLocations()}
            >
              닫기
            </button>
          </div>
          {locationDraft.id && (
            <div className="schedule-delete">
              {data.classes.some(
                (item) => item.locationId === locationDraft.id,
              ) ||
              data.exceptions.some(
                (item) =>
                  "locationId" in item && item.locationId === locationDraft.id,
              ) ? (
                <p className="muted">
                  일정 또는 휴무에 사용 중인 장소는 먼저 연결을 변경한 후 삭제할
                  수 있습니다.
                </p>
              ) : confirmDelete === locationDraft.id ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (
                        commit(
                          {
                            ...data,
                            locations: data.locations.filter(
                              (item) => item.id !== locationDraft.id,
                            ),
                          },
                          "장소를 삭제했습니다.",
                        )
                      )
                        setLocationDraft(newLocation());
                    }}
                  >
                    장소 삭제 확인
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setConfirmDelete("")}
                  >
                    삭제 취소
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setConfirmDelete(locationDraft.id)}
                >
                  장소 삭제
                </button>
              )}
            </div>
          )}
        </form>
      </LightDismissDialog>

      <LightDismissDialog
        open={!!moveDraft}
        onClose={() => closeMove()}
        title="회차 변경"
        subtitle="원래 반복은 유지하고 선택한 한 회차만 바꿉니다."
        maxWidth="600px"
      >
        {moveDraft && (
          <form ref={moveFormRef} className="schedule-form" onSubmit={saveMove}>
            {formError && (
              <p className="schedule-warning" role="alert">
                {formError}
              </p>
            )}
            <p>원래 회차: {formatScheduleDate(moveDraft.originalDate)}</p>
            <label>
              변경 날짜
              <input
                type="date"
                required
                value={moveDraft.date}
                onChange={(e) =>
                  setMoveDraft({ ...moveDraft, date: e.target.value })
                }
              />
            </label>
            {renderTimeFields(moveDraft, (patch) =>
              setMoveDraft({ ...moveDraft, ...patch }),
            )}
            <label>
              변경 장소
              <select
                required
                value={moveDraft.locationId}
                onChange={(e) =>
                  setMoveDraft({ ...moveDraft, locationId: e.target.value })
                }
              >
                {data.locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.alias}
                  </option>
                ))}
              </select>
            </label>
            <label>
              변경 메모
              <textarea
                maxLength={2000}
                value={moveDraft.reason}
                onChange={(e) =>
                  setMoveDraft({ ...moveDraft, reason: e.target.value })
                }
              />
            </label>
            <div className="schedule-actions">
              <button type="submit" className="btn-primary">
                회차 변경 저장
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => closeMove()}
              >
                닫기
              </button>
            </div>
          </form>
        )}
      </LightDismissDialog>
      <LightDismissDialog
        open={!!closedDraft}
        onClose={() => closeClosed()}
        title="휴무 등록"
        maxWidth="600px"
      >
        {closedDraft && (
          <form
            ref={closedFormRef}
            className="schedule-form"
            onSubmit={saveClosed}
          >
            {formError && (
              <p className="schedule-warning" role="alert">
                {formError}
              </p>
            )}
            <label>
              휴무 날짜
              <input
                type="date"
                required
                value={closedDraft.date}
                onChange={(e) =>
                  setClosedDraft({ ...closedDraft, date: e.target.value })
                }
              />
            </label>
            <label>
              휴무 장소
              <select
                value={closedDraft.locationId}
                onChange={(e) =>
                  setClosedDraft({ ...closedDraft, locationId: e.target.value })
                }
              >
                <option value="">모든 장소</option>
                {data.locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.alias}
                  </option>
                ))}
              </select>
            </label>
            <label>
              휴무 메모
              <textarea
                maxLength={2000}
                value={closedDraft.reason}
                onChange={(e) =>
                  setClosedDraft({ ...closedDraft, reason: e.target.value })
                }
              />
            </label>
            <p className="muted">
              해당 날짜의 수업을 휴무로 표시합니다. 원본 일정은 남아 있으며
              휴무를 해제하면 돌아옵니다.
            </p>
            <div className="schedule-actions">
              <button type="submit" className="btn-primary">
                휴무 저장
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => closeClosed()}
              >
                닫기
              </button>
            </div>
          </form>
        )}
      </LightDismissDialog>
    </section>
  );
};
