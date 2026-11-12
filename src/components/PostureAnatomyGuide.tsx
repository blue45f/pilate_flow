import { useId } from 'react';
import type { PilatesExercise, SpinalPlane } from '../types/pilates';
import {
  ANATOMY_GUIDE_SOURCES,
  ANATOMY_REGIONS,
  POSTURE_GUIDE,
  SPINE_GUIDE,
  mapAnatomyTags,
} from '../data/postureAnatomyGuide';
import type { AnatomyRegion } from '../data/postureAnatomyGuide';
import { BodyPositionFigure } from './BodyPositionFigure';
import '../styles/posture-anatomy-guide.css';

function SpineDirection({ plane }: { plane: SpinalPlane }) {
  const paths: Record<SpinalPlane, string> = {
    flexion: 'M31 39 Q10 26 20 12 M20 12 L27 12 M20 12 L20 19',
    extension: 'M17 39 Q38 26 28 12 M28 12 L21 12 M28 12 L28 19',
    lateral: 'M25 40 Q11 27 27 12 M27 12 L20 12 M27 12 L27 19',
    rotation: 'M12 25 A14 8 0 1 1 36 30 M36 30 L36 23 M36 30 L29 29',
    neutral: 'M24 12 L24 39 M18 12 L30 12 M18 39 L30 39',
  };
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d={paths[plane]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 15 L24 36" stroke="currentColor" strokeDasharray="1 4" opacity=".3" />
    </svg>
  );
}

function AnatomyMap({ regions, label }: { regions: AnatomyRegion[]; label: string }) {
  const id = useId();
  return (
    <svg
      className="posture-anatomy-map"
      viewBox="0 0 264 228"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      focusable="false"
    >
      <title id={`${id}-title`}>{`${label} 부위 지도`}</title>
      <desc id={`${id}-desc`}>
        {regions.length
          ? regions
              .map(
                (region, index) =>
                  `${index + 1}번 ${ANATOMY_REGIONS[region].label}, ${ANATOMY_REGIONS[region].view === 'front' ? '앞면' : '뒷면'}`,
              )
              .join('. ')
          : '그림에 연결된 부위 태그가 없습니다.'}
        . 위치만 요약하며 근육 경계와 활성도는 표시하지 않습니다.
      </desc>
      {(['front', 'back'] as const).map((view, i) => (
        <g key={view} transform={`translate(${i * 132 + 16}, 22)`}>
          <text x="50" y="-7" textAnchor="middle" className="posture-map-view">
            {view === 'front' ? '앞면' : '뒷면'}
          </text>
          <g className="posture-map-body" strokeWidth="1.5" strokeLinejoin="round">
            <circle cx="50" cy="19" r="12" />
            <path d="M44 31 L44 39 Q28 39 24 48 L12 91 L17 100 L23 96 L32 64 L34 88 L27 112 L28 143 L29 181 L24 193 L38 193 L42 157 L46 123 L54 123 L58 157 L62 193 L76 193 L71 181 L72 143 L73 112 L66 88 L68 64 L77 96 L83 100 L88 91 L76 48 Q72 39 56 39 L56 31" />
          </g>
          {view === 'back' && (
            <path d="M50 44 L50 107" className="posture-map-spine" strokeDasharray="3 4" />
          )}
          {regions.map((region, index) => {
            const item = ANATOMY_REGIONS[region];
            if (item.view !== view) return null;
            return (
              <g key={region} data-region={region}>
                {item.marks.map(([cx, cy, rx, ry], n) => (
                  <ellipse
                    key={n}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    className="posture-map-highlight"
                  />
                ))}
                <path
                  d={`M${item.marks[item.badge[0] < 50 ? 0 : item.marks.length - 1][0]} ${item.marks[0][1]} L${item.badge[0]} ${item.badge[1]}`}
                  className="posture-map-leader"
                />
                <circle
                  cx={item.badge[0]}
                  cy={item.badge[1]}
                  r="8"
                  className="posture-map-number-bg"
                />
                <text
                  x={item.badge[0]}
                  y={item.badge[1] + 3}
                  textAnchor="middle"
                  className="posture-map-number"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/** Read-only metadata companion. Never changes review, suitability, or exercise data. */
export function PostureAnatomyGuide({
  exercise,
  compact = false,
}: {
  exercise: PilatesExercise;
  compact?: boolean;
}) {
  const id = useId();
  const { mapped, unmapped, nonAnatomical } = mapAnatomyTags(exercise.targetMuscles);
  const regions = [...new Set(mapped.map((tag) => tag.region))];
  const posture = POSTURE_GUIDE[exercise.bodyPosition];
  const planes = [...new Set(exercise.spinalPlanes)].filter((plane) => SPINE_GUIDE[plane]);
  return (
    <section
      className={`posture-anatomy-guide${compact ? ' is-compact' : ''}`}
      aria-labelledby={`${id}-heading`}
    >
      <header className="posture-guide-heading">
        <span>VISUAL NOTES</span>
        <h3 id={`${id}-heading`}>자세·부위 한눈에</h3>
        <p>계획 태그를 그림으로 읽어요.</p>
      </header>
      <div className="posture-guide-layout">
        <div className="posture-guide-position">
          {posture ? (
            <>
              <BodyPositionFigure position={exercise.bodyPosition} />
              <strong>{posture.label}</strong>
              <span>{posture.orientation}</span>
            </>
          ) : (
            <p>자세 그림 미연결</p>
          )}
          <small>방향 예시 · 손발·기구 세팅은 원본 확인</small>
          {planes.length > 0 && (
            <div className="posture-guide-planes" aria-label="계획에 기록된 척추 방향">
              {planes.map((plane) => (
                <div key={plane}>
                  <SpineDirection plane={plane} />
                  <strong>{SPINE_GUIDE[plane].label}</strong>
                  <small>{SPINE_GUIDE[plane].description}</small>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="posture-guide-anatomy">
          <AnatomyMap regions={regions} label={exercise.nameKo} />
          <ol className="posture-guide-legend" aria-label="부위 그림과 태그 연결">
            {regions.map((region, index) => (
              <li key={region}>
                <span className="posture-legend-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <strong>{ANATOMY_REGIONS[region].label}</strong>
                  <span>
                    {mapped
                      .filter((tag) => tag.region === region)
                      .map((tag) => tag.label)
                      .join(' · ')}
                  </span>
                  {mapped
                    .filter((tag) => tag.region === region && tag.note.startsWith('일반 역할:'))
                    .map((tag) => (
                      <small key={tag.label} className="posture-legend-role">
                        {tag.note}
                      </small>
                    ))}
                </div>
              </li>
            ))}
          </ol>
          {!mapped.length && (
            <p className="posture-guide-empty">
              표시할 부위 정보가 없어요. 아래 원래 태그를 확인하세요.
            </p>
          )}
          {nonAnatomical.length > 0 && (
            <p className="posture-guide-unmapped">
              <strong>움직임·목표 태그</strong> {nonAnatomical.join(' · ')}
              <span>특정 근육 하나에 연결하지 않았어요.</span>
            </p>
          )}
          {unmapped.length > 0 && (
            <p className="posture-guide-unmapped">
              <strong>그림 미연결 태그</strong> {unmapped.join(' · ')}
              <span>의미를 추정하지 않고 원문을 유지했어요.</span>
            </p>
          )}
        </div>
      </div>
      <p className="posture-guide-boundary">
        위치 참고 그림입니다. 정확한 동작·근육 활성도·운동 효과를 뜻하지 않으며, 전문가가 검증한
        시범이 아닙니다.
      </p>
      <details className="posture-guide-notes">
        <summary>부위의 역할·그림의 한계·참고 자료</summary>
        <div>
          {mapped.length > 0 && (
            <ul>
              {mapped.map((tag) => (
                <li key={tag.label}>
                  <strong>{tag.label}</strong> · {tag.note}
                </li>
              ))}
            </ul>
          )}
          <p>
            일반 해부학 위치를 대조한 자체 제작 도식입니다. 앞뒤·깊이·개인차를 단순화했으며 좌우
            수행 방향이나 분절별 움직임을 처방하지 않습니다. 수업에서는 기존 주의 메모와 실제 출처를
            확인하세요.
          </p>
          <nav aria-label="자세와 해부학 참고 자료">
            {ANATOMY_GUIDE_SOURCES.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label} ↗
              </a>
            ))}
          </nav>
        </div>
      </details>
    </section>
  );
}
