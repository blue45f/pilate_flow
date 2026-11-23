#!/usr/bin/env python3
"""
Generates the second Studio Neural AI Voice persona (`현수 · ko-KR-HyunsuMultilingualNeural`)
for all 218 core + studio flagship Pilates exercises + 7 studio/briefing clips,
AND adds the 3 daily-briefing clips to `서연 (ko-KR-SunHiNeural)`,
then regenerates `src/data/studioNeuralVoiceManifest.ts` cleanly with multi-persona lookup.
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_JSON = ROOT / "scripts" / ".studio-voice-scripts.json"
SEOYEON_EX_DIR = ROOT / "public" / "audio" / "studio-voice" / "ex"
SEOYEON_CLIPS_DIR = ROOT / "public" / "audio" / "studio-voice" / "clips"
HYUNSU_EX_DIR = ROOT / "public" / "audio" / "studio-voice" / "hyunsu" / "ex"
HYUNSU_CLIPS_DIR = ROOT / "public" / "audio" / "studio-voice" / "hyunsu" / "clips"
MANIFEST_TS = ROOT / "src" / "data" / "studioNeuralVoiceManifest.ts"

SEOYEON_VOICE = "ko-KR-SunHiNeural"
HYUNSU_VOICE = "ko-KR-HyunsuMultilingualNeural"
CONCURRENCY = 12

# Warm calm studio mentor vocal EQ + EBU R128 loudness normalization (-16 LUFS), 24kHz mono 28kbps MP3
FFMPEG_FILTER_SEOYEON = (
    "highpass=f=85,"
    "equalizer=f=210:t=q:w=1.2:g=1.6,"
    "equalizer=f=3100:t=q:w=1.3:g=1.4,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)
FFMPEG_FILTER_HYUNSU = (
    "highpass=f=70,"
    "equalizer=f=160:t=q:w=1.2:g=1.4,"
    "equalizer=f=2800:t=q:w=1.3:g=1.5,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)

BRIEFING_CLIPS = [
    (
        "rehearsal-welcome",
        "안녕하세요 강사님, 오늘 수업 리허설을 차분하게 시작해 볼게요. 편안한 호흡으로 함께 흐름을 익혀보세요.",
    ),
    (
        "breath-inhale-exhale",
        "코로 갈비뼈를 넓게 채우며 마시고, 입으로 부드럽게 내쉬며 복부 중심을 모아주세요.",
    ),
    (
        "quiz-prompt-next",
        "잠시 화면을 보지 말고, 다음 동작 이름과 스프링 세팅을 삼 초 안에 떠올려 보세요.",
    ),
    (
        "rehearsal-complete",
        "오늘 리허설을 모두 마치셨어요. 정말 수고 많으셨습니다. 현장에서도 편안하고 자신 있게 리드해 주세요.",
    ),
    (
        "briefing-welcome",
        "좋은 하루예요 강사님. 오늘 예정된 수업 흐름을 출근길에 편하게 들으실 수 있도록 핵심만 이어서 브리핑해 드릴게요.",
    ),
    (
        "briefing-next-class",
        "이제 다음 타임 수업으로 자연스럽게 넘어갈게요. 기구와 첫 스프링 세팅만 머릿속에 먼저 그려보세요.",
    ),
    (
        "briefing-complete",
        "오늘 모든 수업 브리핑을 마쳤어요. 강사님 컨디션도 꼭 챙기시고, 오늘 수업도 멋지게 이끌어 주세요.",
    ),
]


def master_mp3(raw_path: Path, out_path: Path, eq_filter: str) -> bool:
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-i",
        str(raw_path),
        "-af",
        eq_filter,
        "-ac",
        "1",
        "-ar",
        "24000",
        "-b:a",
        "28k",
        str(out_path),
    ]
    res = subprocess.run(cmd, capture_output=True)
    return res.returncode == 0 and out_path.exists() and out_path.stat().st_size > 1024


async def synth_one(
    sem: asyncio.Semaphore,
    voice_id: str,
    eq_filter: str,
    item_id: str,
    text_ko: str,
    out_path: Path,
    stats: dict[str, int],
) -> tuple[str, bool]:
    if out_path.exists() and out_path.stat().st_size > 2048:
        stats["skipped"] += 1
        return item_id, True

    async with sem:
        for attempt in range(4):
            raw_fd, raw_name = tempfile.mkstemp(suffix=".mp3")
            os.close(raw_fd)
            raw_path = Path(raw_name)
            try:
                comm = edge_tts.Communicate(text_ko, voice_id, rate="-4%", pitch="+0Hz")
                await asyncio.wait_for(comm.save(str(raw_path)), timeout=25.0)
                ok = await asyncio.to_thread(master_mp3, raw_path, out_path, eq_filter)
                if ok:
                    stats["generated"] += 1
                    return item_id, True
            except Exception as exc:
                if attempt == 3:
                    print(f"[WARN] Failed {voice_id} {item_id}: {exc}", file=sys.stderr)
                await asyncio.sleep(0.8 * (attempt + 1))
            finally:
                if raw_path.exists():
                    try:
                        raw_path.unlink()
                    except OSError:
                        pass
        stats["failed"] += 1
        return item_id, False


async def main() -> int:
    t0 = time.time()
    SEOYEON_CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    HYUNSU_EX_DIR.mkdir(parents=True, exist_ok=True)
    HYUNSU_CLIPS_DIR.mkdir(parents=True, exist_ok=True)

    payload = json.loads(SCRIPTS_JSON.read_text(encoding="utf-8"))
    # Select the 218 core + crawled studio exercises (all non-world-* entries in scripts)
    all_ex = payload["exercises"]
    core_218 = [ex for ex in all_ex if not str(ex["id"]).startswith("world-")]

    sem = asyncio.Semaphore(CONCURRENCY)
    stats = {"generated": 0, "skipped": 0, "failed": 0}
    tasks = []

    # 1. Generate Hyunsu Neural Voice for all 218 core + studio flagship exercises
    for ex in core_218:
        out_path = HYUNSU_EX_DIR / f"{ex['id']}.mp3"
        tasks.append(
            synth_one(
                sem,
                HYUNSU_VOICE,
                FFMPEG_FILTER_HYUNSU,
                f"hyunsu-ex:{ex['id']}",
                ex["textKo"],
                out_path,
                stats,
            )
        )

    # 2. Generate all 7 studio/briefing clips for BOTH Seoyeon & Hyunsu
    for clip_id, text_ko in BRIEFING_CLIPS:
        tasks.append(
            synth_one(
                sem,
                SEOYEON_VOICE,
                FFMPEG_FILTER_SEOYEON,
                f"seoyeon-clip:{clip_id}",
                text_ko,
                SEOYEON_CLIPS_DIR / f"{clip_id}.mp3",
                stats,
            )
        )
        tasks.append(
            synth_one(
                sem,
                HYUNSU_VOICE,
                FFMPEG_FILTER_HYUNSU,
                f"hyunsu-clip:{clip_id}",
                text_ko,
                HYUNSU_CLIPS_DIR / f"{clip_id}.mp3",
                stats,
            )
        )

    await asyncio.gather(*tasks)

    seoyeon_ex_ids = sorted(p.stem for p in SEOYEON_EX_DIR.glob("*.mp3") if p.stat().st_size > 1024)
    hyunsu_ex_ids = sorted(p.stem for p in HYUNSU_EX_DIR.glob("*.mp3") if p.stat().st_size > 1024)
    seoyeon_clip_ids = sorted(p.stem for p in SEOYEON_CLIPS_DIR.glob("*.mp3") if p.stat().st_size > 1024)
    hyunsu_clip_ids = sorted(p.stem for p in HYUNSU_CLIPS_DIR.glob("*.mp3") if p.stat().st_size > 1024)

    hyunsu_bytes = sum(p.stat().st_size for p in HYUNSU_EX_DIR.glob("*.mp3")) + sum(
        p.stat().st_size for p in HYUNSU_CLIPS_DIR.glob("*.mp3")
    )

    manifest_lines = [
        "// Auto-generated by scripts/generate_studio_neural_voice_hyunsu.py — DO NOT EDIT BY HAND.",
        "// Multi-persona Studio Neural AI Voice pack mastered at -16 LUFS (24kHz mono MP3):",
        "// - seoyeon: Microsoft Azure Neural ko-KR-SunHiNeural (524 canonical exercises + 7 studio clips)",
        "// - hyunsu:  Microsoft Azure Neural ko-KR-HyunsuMultilingualNeural (218 flagship exercises + 7 studio clips)",
        "",
        "export type StudioVoicePersonaId = 'seoyeon' | 'hyunsu';",
        "",
        "export interface StudioVoicePersonaMeta {",
        "  readonly id: StudioVoicePersonaId;",
        "  readonly nameKo: string;",
        "  readonly labelKo: string;",
        "  readonly descriptionKo: string;",
        "  readonly modelId: string;",
        "  readonly exerciseBaseUrl: string;",
        "  readonly clipBaseUrl: string;",
        "}",
        "",
        "export const DEFAULT_STUDIO_VOICE_PERSONA: StudioVoicePersonaId = 'seoyeon';",
        "",
        "export const STUDIO_VOICE_PERSONAS: Readonly<Record<StudioVoicePersonaId, StudioVoicePersonaMeta>> = {",
        "  seoyeon: {",
        "    id: 'seoyeon',",
        "    nameKo: '서연',",
        "    labelKo: '서연 · 스튜디오 AI 음성',",
        "    descriptionKo: '부드럽고 따뜻한 여성 필라테스 멘토 음성',",
        "    modelId: 'ko-KR-SunHiNeural',",
        "    exerciseBaseUrl: '/audio/studio-voice/ex',",
        "    clipBaseUrl: '/audio/studio-voice/clips',",
        "  },",
        "  hyunsu: {",
        "    id: 'hyunsu',",
        "    nameKo: '현수',",
        "    labelKo: '현수 · 스튜디오 AI 음성',",
        "    descriptionKo: '차분하고 또렷한 남성 스튜디오 멘토 음성',",
        "    modelId: 'ko-KR-HyunsuMultilingualNeural',",
        "    exerciseBaseUrl: '/audio/studio-voice/hyunsu/ex',",
        "    clipBaseUrl: '/audio/studio-voice/hyunsu/clips',",
        "  },",
        "};",
        "",
        "export const STUDIO_NEURAL_VOICE_MODEL = 'ko-KR-SunHiNeural' as const;",
        "export const STUDIO_NEURAL_VOICE_PERSONA_KO = '서연 · 스튜디오 AI 음성' as const;",
        "export const STUDIO_NEURAL_VOICE_BASE_URL = '/audio/studio-voice/ex' as const;",
        "export const STUDIO_NEURAL_CLIP_BASE_URL = '/audio/studio-voice/clips' as const;",
        "",
        f"export const STUDIO_NEURAL_EXERCISE_IDS: readonly string[] = {json.dumps(seoyeon_ex_ids, ensure_ascii=False, indent=2)};",
        "",
        "export const STUDIO_NEURAL_EXERCISE_ID_SET: ReadonlySet<string> = new Set(STUDIO_NEURAL_EXERCISE_IDS);",
        "",
        f"export const STUDIO_NEURAL_HYUNSU_EXERCISE_IDS: readonly string[] = {json.dumps(hyunsu_ex_ids, ensure_ascii=False, indent=2)};",
        "",
        "export const STUDIO_NEURAL_HYUNSU_EXERCISE_ID_SET: ReadonlySet<string> = new Set(STUDIO_NEURAL_HYUNSU_EXERCISE_IDS);",
        "",
        f"export const STUDIO_NEURAL_CLIP_IDS: readonly string[] = {json.dumps(seoyeon_clip_ids, ensure_ascii=False, indent=2)};",
        "",
        f"export const STUDIO_NEURAL_HYUNSU_CLIP_IDS: readonly string[] = {json.dumps(hyunsu_clip_ids, ensure_ascii=False, indent=2)};",
        "",
        "export function getStudioNeuralExerciseAudioUrl(",
        "  exerciseId: string | undefined | null,",
        "  persona: StudioVoicePersonaId = DEFAULT_STUDIO_VOICE_PERSONA,",
        "): string | null {",
        "  if (!exerciseId) return null;",
        "  if (persona === 'hyunsu' && STUDIO_NEURAL_HYUNSU_EXERCISE_ID_SET.has(exerciseId)) {",
        "    return `${STUDIO_VOICE_PERSONAS.hyunsu.exerciseBaseUrl}/${exerciseId}.mp3`;",
        "  }",
        "  if (STUDIO_NEURAL_EXERCISE_ID_SET.has(exerciseId)) {",
        "    return `${STUDIO_VOICE_PERSONAS.seoyeon.exerciseBaseUrl}/${exerciseId}.mp3`;",
        "  }",
        "  return null;",
        "}",
        "",
        "export function getStudioNeuralClipAudioUrl(",
        "  clipId: string,",
        "  persona: StudioVoicePersonaId = DEFAULT_STUDIO_VOICE_PERSONA,",
        "): string | null {",
        "  if (persona === 'hyunsu' && STUDIO_NEURAL_HYUNSU_CLIP_IDS.includes(clipId)) {",
        "    return `${STUDIO_VOICE_PERSONAS.hyunsu.clipBaseUrl}/${clipId}.mp3`;",
        "  }",
        "  if (STUDIO_NEURAL_CLIP_IDS.includes(clipId)) {",
        "    return `${STUDIO_VOICE_PERSONAS.seoyeon.clipBaseUrl}/${clipId}.mp3`;",
        "  }",
        "  return null;",
        "}",
        "",
    ]
    MANIFEST_TS.write_text("\n".join(manifest_lines), encoding="utf-8")

    print(
        json.dumps(
            {
                "seoyeonExercises": len(seoyeon_ex_ids),
                "hyunsuExercises": len(hyunsu_ex_ids),
                "seoyeonClips": len(seoyeon_clip_ids),
                "hyunsuClips": len(hyunsu_clip_ids),
                "generated": stats["generated"],
                "skipped": stats["skipped"],
                "failed": stats["failed"],
                "hyunsuMB": round(hyunsu_bytes / (1024 * 1024), 2),
                "elapsedSec": round(time.time() - t0, 1),
            },
            ensure_ascii=False,
        )
    )
    return 0 if stats["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
