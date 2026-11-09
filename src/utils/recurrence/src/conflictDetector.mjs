// @ts-check

import { epochMsToKstParts } from './kstCalendar.mjs';

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
  if (instructorBufferMinutes < 0 || roomBufferMinutes < 0) {
    throw new RangeError('Buffer minutes must be >= 0.');
  }

  const active = occurrences
    .filter((row) => row && row.status === 'scheduled')
    .slice()
    .sort((a, b) => a.startEpochMs - b.startEpochMs || a.id.localeCompare(b.id));

  const conflicts = [];

  for (let i = 0; i < active.length; i += 1) {
    const left = active[i];
    for (let j = i + 1; j < active.length; j += 1) {
      const right = active[j];

      const sameInstructor =
        Boolean(left.instructorId) && left.instructorId === right.instructorId;
      const sameRoom = Boolean(left.roomId) && left.roomId === right.roomId;

      if (!sameInstructor && !sameRoom) continue;

      const rawOverlapStart = Math.max(left.startEpochMs, right.startEpochMs);
      const rawOverlapEnd = Math.min(left.endEpochMs, right.endEpochMs);
      const rawOverlapMinutes = Math.max(0, Math.round((rawOverlapEnd - rawOverlapStart) / 60000));
      const gapMinutes = Math.round((right.startEpochMs - left.endEpochMs) / 60000);

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

      const startParts = epochMsToKstParts(rawOverlapStart);
      const endParts = epochMsToKstParts(hasDirectOverlap ? rawOverlapEnd : right.startEpochMs);

      conflicts.push({
        type,
        kind: hasDirectOverlap ? 'overlap' : 'buffer',
        leftId: left.id,
        rightId: right.id,
        leftClassId: left.classId,
        rightClassId: right.classId,
        instructorId: conflictInstructor ? left.instructorId : null,
        roomId: conflictRoom ? left.roomId : null,
        overlapStartEpochMs: rawOverlapStart,
        overlapEndEpochMs: hasDirectOverlap ? rawOverlapEnd : right.startEpochMs,
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
