// @ts-check

import { epochMsToKstParts, MS_PER_MINUTE } from './kstCalendar.mjs';

/**
 * Detects time overlaps across expanded Pilates schedule occurrences for instructors and rooms.
 *
 * @param {readonly Record<string, any>[]} occurrences
 * @param {{
 *   instructorBufferMinutes?: number,
 *   roomBufferMinutes?: number
 * }} [options]
 */
export function detectScheduleConflicts(occurrences, options = {}) {
  if (!Array.isArray(occurrences)) {
    throw new TypeError('detectScheduleConflicts requires an array of occurrences.');
  }

  const instructorBufferMinutes = options.instructorBufferMinutes ?? 0;
  const roomBufferMinutes = options.roomBufferMinutes ?? 0;
  if (
    !Number.isFinite(instructorBufferMinutes) ||
    instructorBufferMinutes < 0 ||
    !Number.isFinite(roomBufferMinutes) ||
    roomBufferMinutes < 0
  ) {
    throw new RangeError('Buffer minutes must be finite numbers >= 0.');
  }

  const active = [];
  for (const row of occurrences) {
    if (!row || row.status !== 'scheduled') continue;
    if (
      !Number.isFinite(row.startEpochMs) ||
      !Number.isFinite(row.endEpochMs) ||
      row.endEpochMs <= row.startEpochMs
    ) {
      throw new RangeError(
        `Invalid scheduled occurrence interval in "${String(row.id ?? '')}".`,
      );
    }
    active.push(row);
  }

  active.sort(
    (a, b) =>
      a.startEpochMs - b.startEpochMs ||
      a.endEpochMs - b.endEpochMs ||
      String(a.id).localeCompare(String(b.id)),
  );

  const maxBufferMs = Math.max(instructorBufferMinutes, roomBufferMinutes) * MS_PER_MINUTE;
  const conflicts = [];

  for (let i = 0; i < active.length; i += 1) {
    const left = active[i];
    const leftRoom = left.roomId ?? left.locationId ?? null;
    const sweepHorizonMs = left.endEpochMs + maxBufferMs;

    for (let j = i + 1; j < active.length; j += 1) {
      const right = active[j];

      // Sweep-line termination guarantee: active is sorted by startEpochMs ascending.
      // Once right.startEpochMs >= sweepHorizonMs, neither direct overlap (< left.endEpochMs)
      // nor turnaround buffer (< left.endEpochMs + maxBufferMs) is possible for j or any j' > j.
      if (right.startEpochMs >= sweepHorizonMs) {
        break;
      }

      const rightRoom = right.roomId ?? right.locationId ?? null;
      const sameInstructor =
        Boolean(left.instructorId) && left.instructorId === right.instructorId;
      const sameRoom = Boolean(leftRoom) && leftRoom === rightRoom;

      if (!sameInstructor && !sameRoom) continue;

      const rawOverlapStart = Math.max(left.startEpochMs, right.startEpochMs);
      const rawOverlapEnd = Math.min(left.endEpochMs, right.endEpochMs);
      const rawOverlapMinutes = Math.max(
        0,
        Math.round((rawOverlapEnd - rawOverlapStart) / MS_PER_MINUTE),
      );
      const gapMinutes = Math.round((right.startEpochMs - left.endEpochMs) / MS_PER_MINUTE);

      const hasDirectOverlap = rawOverlapStart < rawOverlapEnd;
      const violatesInstructorBuffer =
        !hasDirectOverlap &&
        sameInstructor &&
        instructorBufferMinutes > 0 &&
        gapMinutes >= 0 &&
        gapMinutes < instructorBufferMinutes;
      const violatesRoomBuffer =
        !hasDirectOverlap &&
        sameRoom &&
        roomBufferMinutes > 0 &&
        gapMinutes >= 0 &&
        gapMinutes < roomBufferMinutes;

      if (!hasDirectOverlap && !violatesInstructorBuffer && !violatesRoomBuffer) {
        continue;
      }

      const conflictInstructor =
        sameInstructor && (hasDirectOverlap || violatesInstructorBuffer);
      const conflictRoom = sameRoom && (hasDirectOverlap || violatesRoomBuffer);

      /** @type {'instructor' | 'room' | 'instructor-and-room'} */
      let type = 'instructor';
      if (conflictInstructor && conflictRoom) {
        type = 'instructor-and-room';
      } else if (conflictRoom) {
        type = 'room';
      }

      const windowStartMs = hasDirectOverlap ? rawOverlapStart : left.endEpochMs;
      const windowEndMs = hasDirectOverlap ? rawOverlapEnd : right.startEpochMs;
      const startParts = epochMsToKstParts(windowStartMs);
      const endParts = epochMsToKstParts(windowEndMs);

      conflicts.push({
        type,
        kind: hasDirectOverlap ? 'overlap' : 'buffer',
        leftId: left.id,
        rightId: right.id,
        leftClassId: left.classId,
        rightClassId: right.classId,
        instructorId: conflictInstructor ? left.instructorId : null,
        roomId: conflictRoom ? leftRoom : null,
        overlapStartEpochMs: windowStartMs,
        overlapEndEpochMs: windowEndMs,
        overlapStartKstIso: startParts.isoKst,
        overlapEndKstIso: endParts.isoKst,
        overlapDate: startParts.date,
        overlapStartTime: startParts.time,
        overlapEndTime: endParts.time,
        overlapMinutes: rawOverlapMinutes,
        gapMinutes,
      });
    }
  }

  return conflicts;
}

/**
 * Summarizes conflicts by instructor and by room for quick timetable diagnostics.
 * @param {readonly Record<string, any>[]} occurrences
 * @param {{ instructorBufferMinutes?: number, roomBufferMinutes?: number }} [options]
 */
export function summarizeResourceConflicts(occurrences, options = {}) {
  const allConflicts = detectScheduleConflicts(occurrences, options);
  const byInstructor = new Map();
  const byRoom = new Map();

  for (const conflict of allConflicts) {
    if (conflict.instructorId) {
      if (!byInstructor.has(conflict.instructorId)) {
        byInstructor.set(conflict.instructorId, []);
      }
      byInstructor.get(conflict.instructorId).push(conflict);
    }
    if (conflict.roomId) {
      if (!byRoom.has(conflict.roomId)) {
        byRoom.set(conflict.roomId, []);
      }
      byRoom.get(conflict.roomId).push(conflict);
    }
  }

  return {
    totalConflicts: allConflicts.length,
    instructorConflictCount: [...byInstructor.values()].reduce((acc, list) => acc + list.length, 0),
    roomConflictCount: [...byRoom.values()].reduce((acc, list) => acc + list.length, 0),
    conflicts: allConflicts,
    byInstructor: Object.fromEntries(byInstructor),
    byRoom: Object.fromEntries(byRoom),
  };
}
