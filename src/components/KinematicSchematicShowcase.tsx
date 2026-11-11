import React, { useEffect, useState } from 'react';
import { Pause, Play, Plus } from 'lucide-react';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/kinematic-schematic-showcase.css';

interface SchematicSpec {
  readonly id: 'footwork' | 'pelvic-curl' | 'hundred' | 'swan';
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
    titleKo: '리포머 풋워크',
    titleEn: 'Reformer Footwork · Parallel Heels',
    springs: '2R 1B',
    breath: '날숨에 밀어내고 · 들숨에 저항하며 복귀',
    cue: '골반과 요추 중립을 유지한 채 뒤꿈치로 풋바를 수평으로 밀어냅니다.',
    matchKeyword: '풋워크',
  },
  {
    id: 'pelvic-curl',
    titleKo: '펠빅 컬 · 브릿징',
    titleEn: 'Pelvic Curl · Sequential Spinal Articulation',
    springs: '2R',
    breath: '날숨에 꼬리뼈부터 분절 상승 · 들숨 유지 · 날숨 하강',
    cue: '캐리지가 흔들리지 않도록 햄스트링으로 지지하며 척추를 하나씩 말아 올립니다.',
    matchKeyword: '브릿',
  },
  {
    id: 'hundred',
    titleKo: '헌드레드',
    titleEn: 'The Hundred · Thoracic Flexion & Core',
    springs: '1R 1B',
    breath: '5박자 들숨 · 5박자 날숨 펌핑',
    cue: '날개뼈 하각까지 상체를 말아 올리고 스트랩 장력을 유지하며 팔을 펌핑합니다.',
    matchKeyword: '헌드레드',
  },
  {
    id: 'swan',
    titleKo: '롱박스 스완',
    titleEn: 'Long Box Swan · Thoracic Extension',
    springs: '1B',
    breath: '들숨에 가슴을 앞·위로 확장 · 날숨에 길게 복귀',
    cue: '허리가 꺾이지 않도록 치골을 박스에 밀착하고 흉추 위쪽부터 길게 젖혀 올립니다.',
    matchKeyword: '스완',
  },
];

const PHASE_NAMES = ['1 준비', '2 시작', '3 정점', '4 조절', '5 복귀'] as const;
const PHASE_PROGRESS_MAP = [0, 0.35, 1, 0.55, 0.1] as const;

export interface KinematicSchematicShowcaseProps {
  readonly onQuickSearchKeyword?: (keyword: string) => void;
}

function ReformerFrameSvg({
  carriageX,
  footbarAngle = 0.32,
  showBox = false,
  children,
  guides,
  showGuides,
  ariaLabel,
}: {
  carriageX: number;
  footbarAngle?: number;
  showBox?: boolean;
  children: React.ReactNode;
  guides: React.ReactNode;
  showGuides: boolean;
  ariaLabel: string;
}) {
  const springEnd = 360 - carriageX;
  const footbarTipX = 402 + Math.sin(footbarAngle) * 22;
  return (
    <svg
      viewBox="0 0 460 220"
      width="100%"
      height="196"
      role="img"
      aria-label={ariaLabel}
      className="pf-kine-svg"
    >
      {/* Wooden Reformer Frame */}
      <rect
        x={28}
        y={162}
        width={404}
        height={14}
        rx={4}
        fill="#c59b6d"
        stroke="#8a6339"
        strokeWidth={1.5}
      />
      <rect x={42} y={176} width={16} height={28} rx={2} fill="#a87e51" />
      <rect x={402} y={176} width={16} height={28} rx={2} fill="#a87e51" />
      {/* Riser & Pulley */}
      <rect x={34} y={114} width={7} height={48} rx={2} fill="#8a6339" />
      <circle cx={42} cy={120} r={4} fill="#495048" />
      {/* Footbar */}
      <line
        x1={402}
        y1={164}
        x2={footbarTipX}
        y2={118}
        stroke="#3a403a"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx={footbarTipX} cy={118} r={4.5} fill="#1e211d" />
      {/* Spring Coil */}
      <path
        d={`M ${springEnd} 156 Q ${(springEnd + 398) / 2} 162 398 156`}
        fill="none"
        stroke="#bf5a41"
        strokeWidth={2.6}
        strokeDasharray="5 3"
      />
      {/* Moving Carriage */}
      <g transform={`translate(${-carriageX}, 0)`}>
        <rect x={110} y={150} width={248} height={11} rx={4} fill="#4f5850" />
        <path d="M 114 150 L 136 143 L 136 150 Z" fill="#3a423b" />
        <rect x={148} y={136} width={8} height={14} rx={2} fill="#3a423b" />
        {showBox && (
          <rect
            x={184}
            y={118}
            width={124}
            height={32}
            rx={5}
            fill="#59656c"
            stroke="#394247"
            strokeWidth={1.5}
          />
        )}
        {children}
      </g>
      {showGuides && guides}
    </svg>
  );
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
  const [cycleT, setCycleT] = useState<number>(0.42);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let rafId = 0;
    let lastTs = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - lastTs);
      lastTs = now;
      setCycleT((prev) => (prev + dt * 0.00022) % 1);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [playing, reducedMotion]);

  const phaseProgress =
    !playing || reducedMotion
      ? PHASE_PROGRESS_MAP[manualPhase] ?? 1
      : 0.5 - 0.5 * Math.cos(cycleT * Math.PI * 2);

  const pumpOffset =
    playing && !reducedMotion ? Math.sin(cycleT * Math.PI * 8) * 6 : 0;

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
            캐리지 활주량, 스프링 장력 벡터, 척추 분절 곡선, 호흡 타이밍을 실시간으로 확인하고
            단계를 고정해 비교하세요.
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
          const fwSlide = phaseProgress * 58;
          const kneeY = 82 + phaseProgress * 36;
          const kneeX = 316 + phaseProgress * 22;
          const lift = phaseProgress * 44;
          const curl = 18 + phaseProgress * 18;
          const ext = phaseProgress * 34;

          return (
            <article key={item.id} className="pf-kine-card">
              <div className="pf-kine-card__head">
                <div>
                  <h3>{item.titleKo}</h3>
                  <small>{item.titleEn}</small>
                </div>
                <SpringVisualPills springs={item.springs} />
              </div>

              <div className="pf-kine-card__canvas">
                {item.id === 'footwork' && (
                  <ReformerFrameSvg
                    carriageX={fwSlide}
                    showGuides={showGuides}
                    ariaLabel={`${item.titleKo} 5단계 기구학 모션 도해`}
                    guides={
                      <>
                        <line
                          x1={110}
                          y1={120}
                          x2={220}
                          y2={120}
                          stroke="#355441"
                          strokeWidth={1.3}
                          strokeDasharray="4 3"
                        />
                        <text x={165} y={112} textAnchor="middle" fontSize={11} fill="#355441">
                          중립 척추 유지
                        </text>
                        <line
                          x1={250}
                          y1={196}
                          x2={250 - Math.max(18, fwSlide)}
                          y2={196}
                          stroke="#bf5a41"
                          strokeWidth={2}
                        />
                        <text x={230} y={210} textAnchor="middle" fontSize={11} fill="#bf5a41">
                          캐리지 수평 활주 ({Math.round(phaseProgress * 100)}%)
                        </text>
                      </>
                    }
                  >
                    <circle
                      cx={132}
                      cy={134}
                      r={11}
                      fill="#cfe0d5"
                      stroke="#1e211d"
                      strokeWidth={2}
                    />
                    <path
                      d="M 145 138 L 246 138"
                      stroke="#355441"
                      strokeWidth={12}
                      strokeLinecap="round"
                    />
                    <path
                      d="M 164 136 L 232 144"
                      stroke="#1e211d"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 246 138 L ${kneeX + fwSlide * 0.45} ${kneeY} L ${408 + fwSlide} 120`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={246} cy={138} r={4} fill="#1e211d" />
                    <circle cx={kneeX + fwSlide * 0.45} cy={kneeY} r={4} fill="#1e211d" />
                  </ReformerFrameSvg>
                )}

                {item.id === 'pelvic-curl' && (
                  <ReformerFrameSvg
                    carriageX={phaseProgress * 6}
                    showGuides={showGuides}
                    ariaLabel={`${item.titleKo} 5단계 기구학 모션 도해`}
                    guides={
                      <>
                        <path
                          d={`M 156 116 Q 210 ${106 - lift * 0.7} 262 ${114 - lift}`}
                          fill="none"
                          stroke="#bf5a41"
                          strokeWidth={1.6}
                          strokeDasharray="4 3"
                        />
                        <text
                          x={215}
                          y={88 - lift * 0.45}
                          textAnchor="middle"
                          fontSize={11}
                          fill="#bf5a41"
                        >
                          꼬리뼈 → 흉추 순차 분절
                        </text>
                      </>
                    }
                  >
                    <circle
                      cx={132}
                      cy={134}
                      r={11}
                      fill="#cfe0d5"
                      stroke="#1e211d"
                      strokeWidth={2}
                    />
                    <path
                      d={`M 152 138 Q 204 ${138 - lift * 0.65} 256 ${138 - lift}`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={12}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 256 ${138 - lift} L 336 78 L 408 120`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 160 140 L 238 145"
                      stroke="#1e211d"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    <circle cx={256} cy={138 - lift} r={4.5} fill="#bf5a41" />
                  </ReformerFrameSvg>
                )}

                {item.id === 'hundred' && (
                  <ReformerFrameSvg
                    carriageX={16 + phaseProgress * 10}
                    showGuides={showGuides}
                    ariaLabel={`${item.titleKo} 5단계 기구학 모션 도해`}
                    guides={
                      <>
                        <path
                          d="M 256 112 Q 264 126 256 140"
                          fill="none"
                          stroke="#bf5a41"
                          strokeWidth={1.6}
                        />
                        <text x={295} y={64} textAnchor="middle" fontSize={11} fill="#355441">
                          흉추 굴곡 유지 · 스트랩 펌핑
                        </text>
                      </>
                    }
                  >
                    <circle
                      cx={140 + curl * 0.4}
                      cy={122 - curl * 0.7}
                      r={11}
                      fill="#cfe0d5"
                      stroke="#1e211d"
                      strokeWidth={2}
                    />
                    <path
                      d={`M ${150 + curl * 0.35} ${130 - curl * 0.45} Q 198 142 246 138`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={12}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 246 138 L 286 86 L 358 ${86 - phaseProgress * 22}`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M ${166 + curl * 0.25} ${128 - curl * 0.3} L 246 ${126 + pumpOffset}`}
                      stroke="#1e211d"
                      strokeWidth={4.5}
                      strokeLinecap="round"
                    />
                    <line
                      x1={42}
                      y1={120}
                      x2={246}
                      y2={126 + pumpOffset}
                      stroke="#38658e"
                      strokeWidth={1.6}
                    />
                  </ReformerFrameSvg>
                )}

                {item.id === 'swan' && (
                  <ReformerFrameSvg
                    carriageX={phaseProgress * 22}
                    showBox
                    showGuides={showGuides}
                    ariaLabel={`${item.titleKo} 5단계 기구학 모션 도해`}
                    guides={
                      <>
                        <path
                          d={`M 252 96 Q 288 ${82 - ext * 0.7} 322 ${72 - ext}`}
                          fill="none"
                          stroke="#355441"
                          strokeWidth={1.6}
                          strokeDasharray="4 3"
                        />
                        <text
                          x={280}
                          y={62 - ext * 0.6}
                          textAnchor="middle"
                          fontSize={11}
                          fill="#355441"
                        >
                          흉추 신전 · 견갑 하강 안정화
                        </text>
                      </>
                    }
                  >
                    <path
                      d={`M 134 ${118 + ext * 0.12} L 236 114 Q 282 ${114 - ext * 0.55} 314 ${108 - ext}`}
                      fill="none"
                      stroke="#355441"
                      strokeWidth={11}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={324}
                      cy={98 - ext}
                      r={11}
                      fill="#cfe0d5"
                      stroke="#1e211d"
                      strokeWidth={2}
                    />
                    <path
                      d={`M 298 ${112 - ext * 0.7} L 364 118 L ${408 + phaseProgress * 22} 118`}
                      fill="none"
                      stroke="#1e211d"
                      strokeWidth={4.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </ReformerFrameSvg>
                )}
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
