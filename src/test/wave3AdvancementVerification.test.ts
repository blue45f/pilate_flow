import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { buildApparatus3dRigScene, projectStudioPoint3D } from '../utils/apparatus3dRigProjection';
import { buildPlanInsights } from '../utils/classInsights';
import { buildFourWeekCurriculumProgression } from '../utils/curriculumProgressionEngine';
import {
  clearInMemoryPhotoAssets,
  loadLocalPhotoAsset,
  saveLocalPhotoAsset,
  subscribeStudioSyncEvents,
  broadcastStudioSyncEvent,
} from '../utils/localMediaStorage';
import { formatSequenceAsMarkdownCueSheet } from '../utils/portableSequenceExport';

describe('Wave 3 Long-Term Advancement Verification Suite (Epics 1-10)', () => {
  it('projects 3D apparatus coordinates and builds deterministic 3D rig scenes across camera presets', () => {
    const iso = projectStudioPoint3D({ x: 1, y: 0.5, z: 0 }, 'isometric');
    const sag = projectStudioPoint3D({ x: 1, y: 0.5, z: 0 }, 'sagittal');
    expect(iso.u).not.toBe(sag.u);

    const scene = buildApparatus3dRigScene({
      apparatus: 'reformer',
      bodyPosition: 'supine',
      cameraPreset: 'isometric',
      carriageOffsetRatio: 0.4,
      springsLabel: '1R 1B',
    });
    expect(scene.frameVertices2D).toHaveLength(4);
    expect(scene.carriageRect2D).toHaveLength(4);
    expect(scene.springVector2D.tensionLabel).toBe('1R 1B');
    expect(scene.centerOfMass2D.u).toBeGreaterThan(0);
  });

  it('computes spinal plane coverage in buildPlanInsights', () => {
    const sampleSeq = INITIAL_SAVED_SEQUENCES[0]!;
    const insights = buildPlanInsights(sampleSeq.steps, INITIAL_EXERCISES);
    expect(insights.spinalPlanes).toHaveLength(4);
    expect(insights.spinalPlanes.map((p) => p.plane)).toEqual([
      'flexion',
      'extension',
      'lateral',
      'rotation',
    ]);
  });

  it('stores and retrieves local photo assets with in-memory/IndexedDB fallback and broadcasts sync events', async () => {
    clearInMemoryPhotoAssets();
    const sampleDataUrl = 'data:image/svg+xml;utf8,<svg></svg>';
    const saved = await saveLocalPhotoAsset('test-draft-1', sampleDataUrl);
    expect(saved.uri).toBe('local-photo://test-draft-1');

    const loaded = await loadLocalPhotoAsset(saved.uri);
    expect(loaded).toBe(sampleDataUrl);

    const received: string[] = [];
    const unsubscribe = subscribeStudioSyncEvents((payload) => {
      received.push(`${payload.kind}:${payload.entityId}`);
    });
    broadcastStudioSyncEvent({
      kind: 'human-draft-updated',
      entityId: 'test-draft-1',
      revision: 2,
      updatedAt: new Date().toISOString(),
    });
    unsubscribe();
    expect(received).toContain('human-draft-updated:test-draft-1');
  });

  it('generates a 4-week progressive curriculum report balancing spinal planes', () => {
    const report = buildFourWeekCurriculumProgression({
      groupId: 'all',
      baseLevel: '1.5',
      historyLogs: INITIAL_HISTORY_LOGS,
      exercises: INITIAL_EXERCISES,
    });
    expect(report.milestones).toHaveLength(4);
    expect(report.milestones[2]?.recommendedLevel).toBe('2.0');
    expect(report.underusedSpinalPlanes.length).toBeGreaterThan(0);
  });

  it('exports a saved sequence as a Markdown studio cue sheet table', () => {
    const seq = INITIAL_SAVED_SEQUENCES[0]!;
    const exMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const md = formatSequenceAsMarkdownCueSheet(seq, exMap);
    expect(md).toContain(`# ${seq.title}`);
    expect(md).toContain('| 순서 | 구간 | 동작명 | 시간 | 세팅 · 스프링 | 레이어 | 핵심 티칭 큐 |');
  });
});
