import React, { useEffect, useState } from 'react';
import { Pause, Play, Plus } from 'lucide-react';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import type { CatalogMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/kinematic-schematic-showcase.css';

interface SchematicSpec {
  readonly id: 'footwork' | 'pelvic-curl' | 'hundred' | 'swan';
  readonly exerciseId: string;
  readonly titleKo: string;
  readonly titleEn: string;
  readonly springs: string;
  readonly breath: string;
  readonly cue: string;
  readonly matchKeyword: string;
}

const SCHEMATICS: readonly SchematicSpec[] = [
  {
    id: 'footwork',
    exerciseId: 'ex-footwork-01',
    titleKo: '리포머 풋워크',
    titleEn: 'Reformer Footwork · Parallel Heels',
    springs: '2R 1B',
    breath: '날숨에 밀어내고 · 들숨에 저항하며 복귀',
    cue: '골반과 요추 중립을 유지한 채 뒤꿈치로 풋바를 수평으로 밀어냅니다.',
    matchKeyword: '풋워크',
  },
  {
    id: 'pelvic-curl',
    exerciseId: 'ex-bridging-01',
    titleKo: '펠빅 컬 · 브릿징',
    titleEn: 'Pelvic Curl · Sequential Spinal Articulation',
    springs: '2R',
    breath: '날숨에 꼬리뼈부터 분절 상승 · 들숨 유지 · 날숨 하강',
    cue: '캐리지가 흔들리지 않도록 햄스트링으로 지지하며 척추를 하나씩 말아 올립니다.',
    matchKeyword: '브릿',
  },
  {
    id: 'hundred',
    exerciseId: 'ex-core-01',
    titleKo: '헌드레드',
    titleEn: 'The Hundred · Thoracic Flexion & Core',
    springs: '1R 1B',
    breath: '5박자 들숨 · 5박자 날숨 펌핑',
    cue: '날개뼈 하각까지 상체를 말아 올리고 스트랩 장력을 유지하며 팔을 펌핑합니다.',
    matchKeyword: '헌드레드',
  },
  {
    id: 'swan',
    exerciseId: 'ex-extension-01',
    titleKo: '롱박스 스완',
    titleEn: 'Long Box Swan · Thoracic Extension',
    springs: '1B',
    breath: '들숨에 가슴을 앞·위로 확장 · 날숨에 길게 복귀',
    cue: '허리가 꺾이지 않도록 치골을 박스에 밀착하고 흉추 위쪽부터 길게 젖혀 올립니다.',
    matchKeyword: '스완',
  },
];

const PHASE_NAMES = ['1 준비', '2 시작', '3 정점', '4 조절', '5 복귀'] as const;
const PHASE_PROGRESS_MAP = [0.06, 0.27, 0.5, 0.73, 0.94] as const;

export interface KinematicSchematicShowcaseProps {
  readonly onQuickSearchKeyword?: (keyword: string) => void;
}

export const KinematicSchematicShowcase: React.FC<KinematicSchematicShowcaseProps> = ({
  onQuickSearchKeyword,
}) => {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [playing, setPlaying] = useState<boolean>(() => !reducedMotion);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [manualPhase, setManualPhase] = useState<number>(2);
  const [cycleT, setCycleT] = useState<number>(0.5);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let rafId = 0;
    let lastTs = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - lastTs);
      lastTs = now;
      setCycleT((prev) => (prev + dt / 6800) % 1);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [playing, reducedMotion]);

  const effectiveProgress =
    !playing || reducedMotion ? PHASE_PROGRESS_MAP[manualPhase] ?? 0.5 : cycleT;

  return (
    <section
      className="pf-kine-showcase"
      data-testid="kinematic-schematic-showcase"
      aria-label="고품질 5단계 관절·기구 모션 도해 쇼케이스"
    >
      <header className="pf-kine-showcase__header">
        <div>
          <span className="pf-kine-showcase__badge">HIGH-PRECISION KINEMATIC SCHEMATICS</span>
          <h2>5단계 연속 보간 기구학 모션 도해</h2>
          <p>
            98개 전체 동작과 동일한 스튜디오 기구학 표준 엔진으로 캐리지 활주량, 스프링 장력 벡터,
            척추 순차 분절 곡선, 호흡 타이밍을 실시간 비교합니다.
          </p>
        </div>
        <div className="pf-kine-showcase__controls" role="group" aria-label="도해 재생 제어">
          <button
            type="button"
            className={`pf-kine-ctrl-btn ${playing && !reducedMotion ? 'is-active' : ''}`}
            aria-pressed={playing && !reducedMotion}
            onClick={() => {
              if (reducedMotion) {
                setReducedMotion(false);
                setPlaying(true);
                return;
              }
              setPlaying((v) => !v);
            }}
          >
            {playing && !reducedMotion ? (
              <>
                <Pause size={14} aria-hidden="true" /> 연속 모션 일시정지
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" /> 연속 모션 재생
              </>
            )}
          </button>
          <button
            type="button"
            className={`pf-kine-ctrl-btn ${showGuides ? 'is-active' : ''}`}
            aria-pressed={showGuides}
            onClick={() => setShowGuides((v) => !v)}
          >
            {showGuides ? '정렬 가이드선 표시 중' : '정렬 가이드선 숨김'}
          </button>
          <button
            type="button"
            className={`pf-kine-ctrl-btn ${reducedMotion ? 'is-active' : ''}`}
            aria-pressed={reducedMotion}
            onClick={() => {
              const next = !reducedMotion;
              setReducedMotion(next);
              if (next) setPlaying(false);
            }}
          >
            정지 도해 모드
          </button>
        </div>
      </header>

      <div className="pf-kine-showcase__grid">
        {SCHEMATICS.map((item) => {
          const motionAsset = getCatalogContinuousMotionAsset(item.exerciseId);
          const sampled = motionAsset ? motionAsset.samplePose(effectiveProgress) : null;
          const interpolatedVisualAsset: CatalogMovementVisualAsset | null =
            motionAsset && sampled
              ? {
                  ...motionAsset.visualAsset,
                  phases: {
                    ...motionAsset.visualAsset.phases,
                    [sampled.visualPhaseId]: sampled.interpolatedPhaseSpec,
                  },
                }
              : null;

          return (
            <article key={item.id} className="pf-kine-card" data-showcase-exercise={item.exerciseId}>
              <div className="pf-kine-card__head">
                <div>
                  <h3>{item.titleKo}</h3>
                  <small>{item.titleEn}</small>
                </div>
                <SpringVisualPills springs={item.springs} />
              </div>

              <div className="pf-kine-card__canvas">
                {interpolatedVisualAsset && sampled ? (
                  <MovementPhaseDiagramSvg
                    asset={interpolatedVisualAsset}
                    phase={sampled.visualPhaseId}
                    showAlignment={showGuides}
                    showDirection={showGuides}
                    showMuscles
                    showGhostStartPose={showGuides}
                    className="pf-kine-svg"
                    label={`${item.titleKo} 5단계 기구학 모션 도해 · ${sampled.phase.labelKo}`}
                  />
                ) : null}
              </div>

              <div className="pf-kine-phase-strip" role="group" aria-label={`${item.titleKo} 단계 고정`}>
                {PHASE_NAMES.map((label, idx) => {
                  const isActive = (!playing || reducedMotion) && manualPhase === idx;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`pf-kine-phase-pill ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        setPlaying(false);
                        setManualPhase(idx);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="pf-kine-card__meta">
                <div>
                  <strong>호흡:</strong> {item.breath}
                </div>
                <div>{item.cue}</div>
              </div>

              {onQuickSearchKeyword && (
                <div className="pf-kine-card__footer">
                  <button
                    type="button"
                    className="pf-kine-filter-btn"
                    onClick={() => onQuickSearchKeyword(item.matchKeyword)}
                  >
                    <Plus size={14} aria-hidden="true" /> ‘{item.matchKeyword}’ 관련 동작 노트로 바로 찾기
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
