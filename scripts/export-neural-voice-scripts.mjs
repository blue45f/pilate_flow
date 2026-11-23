#!/usr/bin/env node
/**
 * Exports all 524 atomic canonical Pilates exercises (covering 100% of 158 core + 60 crawled
 * + 306 global/fusion archetypes = 100% of 1,752 unified exercises via parentArchetypeId)
 * and shared studio coaching clips into JSON for neural AI voice synthesis (`ko-KR-SunHiNeural`).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const outPath = process.argv[2] || path.resolve('scripts/.studio-voice-scripts.json');

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null },
  esbuild: { jsx: 'automatic' },
  logLevel: 'error',
});

try {
  const { INITIAL_EXERCISES } = await server.ssrLoadModule('/src/data/pilatesCatalog.ts');
  const { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } = await server.ssrLoadModule(
    '/src/data/globalCrawledRepertoirePack.ts',
  );
  const { WORLD_PILATES_EXERCISES } = await server.ssrLoadModule(
    '/src/data/worldPilatesRepertoire1000.ts',
  );
  const { buildNaturalExerciseScript } = await server.ssrLoadModule(
    '/src/utils/naturalVoiceScriptBuilder.ts',
  );

  const byId = new Map();
  // Always include all 158 core + 60 crawled + all atomic world archetypes (524 total)
  for (const ex of [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES]) {
    byId.set(ex.id, ex);
  }
  for (const ex of WORLD_PILATES_EXERCISES) {
    if (ex.tier === 'atomic' && !byId.has(ex.id)) {
      byId.set(ex.id, ex);
    }
  }

  const exercises = [];
  for (const ex of byId.values()) {
    const script = buildNaturalExerciseScript(ex, { includeTip: true });
    // Join segments cleanly with calm punctuation pauses so Neural TTS speaks with studio cadence
    const spokenText = script.segments
      .map((seg) => seg.textKo.trim())
      .filter(Boolean)
      .join(' ');
    exercises.push({
      id: ex.id,
      nameKo: ex.nameKo,
      textKo: spokenText,
      segmentCount: script.segments.length,
    });
  }

  const clips = [
    {
      id: 'rehearsal-welcome',
      textKo: '안녕하세요 강사님, 오늘 수업 리허설을 차분하게 시작해 볼게요. 편안한 호흡으로 함께 흐름을 익혀보세요.',
    },
    {
      id: 'breath-inhale-exhale',
      textKo: '코로 갈비뼈를 넓게 채우며 마시고, 입으로 부드럽게 내쉬며 복부 중심을 모아주세요.',
    },
    {
      id: 'quiz-prompt-next',
      textKo: '잠시 화면을 보지 말고, 다음 동작 이름과 스프링 세팅을 삼 초 안에 떠올려 보세요.',
    },
    {
      id: 'rehearsal-complete',
      textKo: '오늘 리허설을 모두 마치셨어요. 정말 수고 많으셨습니다. 현장에서도 편안하고 자신 있게 리드해 주세요.',
    },
  ];

  await writeFile(outPath, JSON.stringify({ exercises, clips }, null, 2) + '\n', 'utf8');
  console.log(
    JSON.stringify({
      exportedExercises: exercises.length,
      exportedClips: clips.length,
      outPath,
    }),
  );
} finally {
  await server.close();
}
