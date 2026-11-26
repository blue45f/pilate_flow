// Blender reads this six-decimal export. All three phases contribute to camera framing.
function roundGeometry(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite Blender coordinate');
    return Math.round(value * 1e6) / 1e6 || 0;
  }
  if (Array.isArray(value)) return value.map(roundGeometry);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, roundGeometry(child)]),
    );
  }
  return value;
}

export function sampleBlenderExercisePose(exercise, phaseTimes, sampleRig) {
  const phases = {};
  let rigId;
  for (const phase of ['start', 'middle', 'end']) {
    const sample = sampleRig(exercise, phaseTimes[phase]);
    rigId = sample.rigId;
    const { rigId: _id, rigScope, poseFeatureKo, trajectoryFocus, activeZones, ...geometry } = sample;
    phases[phase] = roundGeometry(geometry);
  }
  const { id, apparatus, bodyPosition, footbar, headrest, box, props } = exercise;
  return { id, rigId, apparatus, bodyPosition, footbar, headrest, box, props, phases };
}
