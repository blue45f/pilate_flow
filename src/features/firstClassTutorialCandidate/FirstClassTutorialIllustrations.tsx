import { useId } from 'react';
import type { FirstClassTutorialIllustrationKind } from './firstClassTutorialTypes';

export interface FirstClassTutorialIllustrationProps {
  readonly kind: FirstClassTutorialIllustrationKind;
  readonly altKo: string;
  readonly captionKo: string;
}

/**
 * Calm, static vector schematic diagrams for each step of the First Class 3-Step Tutorial.
 * - Zero autoplay animation loops (`prefers-reduced-motion` safe by default).
 * - Uses semantic palette tokens with high-contrast fallbacks.
 * - Clearly labeled as UI workflow guidance rather than exercise demonstration.
 */
export function FirstClassTutorialIllustration({
  kind,
  altKo,
  captionKo,
}: FirstClassTutorialIllustrationProps) {
  const uid = useId();
  const titleId = `fctc-svg-title-${kind}-${uid}`;

  return (
    <figure
      className="fctc-illustration-figure"
      data-testid={`tutorial-illustration-${kind}`}
    >
      <svg
        viewBox="0 0 360 156"
        role="img"
        aria-labelledby={titleId}
        className="fctc-illustration-svg"
        focusable="false"
      >
        <title id={titleId}>{altKo}</title>
        <rect
          x="2"
          y="2"
          width="356"
          height="152"
          rx="12"
          fill="var(--pf-color-bg-surface-subtle, #f3f5ee)"
          stroke="var(--pf-color-border-default, #d5ddd0)"
          strokeWidth="1.5"
        />

        {kind === 'new-movement-sketch' && (
          <g>
            {/* Header pill */}
            <rect
              x="16"
              y="14"
              width="126"
              height="24"
              rx="6"
              fill="var(--pf-color-ai-draft-bg, #eef2ea)"
              stroke="var(--pf-color-ai-draft-border, #b8c8b0)"
            />
            <text
              x="26"
              y="30"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              1. 한 줄 동작 메모
            </text>

            <rect
              x="150"
              y="14"
              width="194"
              height="24"
              rx="6"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-subtle, #e3e8dd)"
            />
            <text
              x="160"
              y="30"
              fontSize="10.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              분류·검토 승인 없이 바로 입력
            </text>

            {/* One-line input sketch */}
            <rect
              x="16"
              y="48"
              width="328"
              height="44"
              rx="8"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-strong, #aab9a3)"
              strokeWidth="1.5"
            />
            <text
              x="28"
              y="67"
              fontSize="11.5"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              “풋바 밀며 골반 말아 올리기 · 리포머 4분”
            </text>
            <text
              x="28"
              y="83"
              fontSize="10"
              fill="var(--pf-color-text-muted, #526358)"
            >
              느낀 점 · 사진 · 스프링 메모는 선택 (나중에 적어도 됨)
            </text>

            {/* Action row */}
            <rect
              x="16"
              y="102"
              width="196"
              height="36"
              rx="8"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-default, #d5ddd0)"
              strokeDasharray="4 3"
            />
            <text
              x="28"
              y="124"
              fontSize="10.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              선택 메모: 직접 해본 느낌 · 주의점
            </text>

            <rect
              x="222"
              y="102"
              width="122"
              height="36"
              rx="8"
              fill="var(--pf-color-action-primary, #173d34)"
            />
            <text
              x="244"
              y="124"
              fontSize="11.5"
              fontWeight="600"
              fill="var(--pf-color-text-on-primary, #fffef9)"
            >
              + 수업에 넣기
            </text>
          </g>
        )}

        {kind === 'block-composition-sketch' && (
          <g>
            {/* Top 50-min summary bar */}
            <rect
              x="16"
              y="14"
              width="328"
              height="30"
              rx="7"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-default, #d5ddd0)"
            />
            <text
              x="26"
              y="33"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              오늘의 시퀀스 블록 구성
            </text>
            <rect
              x="252"
              y="19"
              width="84"
              height="20"
              rx="5"
              fill="var(--pf-color-status-success-bg, #eaf2e6)"
              stroke="var(--pf-color-status-success-border, #b5cbb0)"
            />
            <text
              x="266"
              y="33"
              fontSize="10.5"
              fontWeight="600"
              fill="var(--pf-color-status-success-text, #254b29)"
            >
              총 50:00
            </text>

            {/* Four sequence blocks */}
            <rect
              x="16"
              y="54"
              width="76"
              height="52"
              rx="8"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-strong, #aab9a3)"
            />
            <text
              x="26"
              y="75"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              준비 08분
            </text>
            <text
              x="26"
              y="93"
              fontSize="9.5"
              fill="var(--pf-color-text-muted, #526358)"
            >
              호흡 · 풋워크
            </text>

            <rect
              x="98"
              y="54"
              width="92"
              height="52"
              rx="8"
              fill="var(--pf-color-ai-draft-bg, #eef2ea)"
              stroke="var(--pf-color-ai-draft-border, #b8c8b0)"
              strokeWidth="1.5"
            />
            <text
              x="108"
              y="75"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              본운동 34분
            </text>
            <text
              x="108"
              y="93"
              fontSize="9.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              코어 · 스트랩 ↑↓
            </text>

            <rect
              x="196"
              y="54"
              width="68"
              height="52"
              rx="8"
              fill="var(--pf-color-ai-memo-bg, #f4f1e3)"
              stroke="var(--pf-color-ai-memo-border, #d4ccb3)"
            />
            <text
              x="206"
              y="75"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              휴식 02분
            </text>
            <text
              x="206"
              y="93"
              fontSize="9.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              호흡 정돈
            </text>

            <rect
              x="270"
              y="54"
              width="74"
              height="52"
              rx="8"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-strong, #aab9a3)"
            />
            <text
              x="278"
              y="75"
              fontSize="11"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              마무리 06분
            </text>
            <text
              x="278"
              y="93"
              fontSize="9.5"
              fill="var(--pf-color-text-muted, #526358)"
            >
              스트레치
            </text>

            {/* Bottom helper bar */}
            <rect
              x="16"
              y="116"
              width="328"
              height="26"
              rx="6"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-subtle, #e3e8dd)"
            />
            <text
              x="28"
              y="133"
              fontSize="10.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              ↑↓ 순서 조정 · 재사용 블록 묶음 복사 · 계획용 시간 자동 합산
            </text>
          </g>
        )}

        {kind === 'save-class-sketch' && (
          <g>
            {/* Sequence title + Save button bar */}
            <rect
              x="16"
              y="14"
              width="244"
              height="36"
              rx="8"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-strong, #aab9a3)"
              strokeWidth="1.5"
            />
            <text
              x="26"
              y="28"
              fontSize="9.5"
              fill="var(--pf-color-text-muted, #526358)"
            >
              시퀀스 제목
            </text>
            <text
              x="26"
              y="43"
              fontSize="11.5"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              월요일 오전 리포머 첫 수업 (50분)
            </text>

            <rect
              x="268"
              y="14"
              width="76"
              height="36"
              rx="8"
              fill="var(--pf-color-action-primary, #173d34)"
            />
            <text
              x="294"
              y="36"
              fontSize="12"
              fontWeight="600"
              fill="var(--pf-color-text-on-primary, #fffef9)"
            >
              저장
            </text>

            {/* Saved binder drawer card */}
            <rect
              x="16"
              y="60"
              width="328"
              height="80"
              rx="9"
              fill="var(--pf-color-bg-surface, #fffef9)"
              stroke="var(--pf-color-border-default, #d5ddd0)"
            />
            <rect
              x="28"
              y="70"
              width="104"
              height="22"
              rx="5"
              fill="var(--pf-color-ai-draft-bg, #eef2ea)"
              stroke="var(--pf-color-ai-draft-border, #b8c8b0)"
            />
            <text
              x="38"
              y="85"
              fontSize="10.5"
              fontWeight="600"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              나의 수업 서랍
            </text>
            <text
              x="142"
              y="85"
              fontSize="10.5"
              fill="var(--pf-color-text-secondary, #3d4f45)"
            >
              이 브라우저에 보관 · 언제든 다시 열기
            </text>

            <rect
              x="28"
              y="100"
              width="196"
              height="28"
              rx="6"
              fill="var(--pf-color-bg-surface-subtle, #f3f5ee)"
              stroke="var(--pf-color-border-subtle, #e3e8dd)"
            />
            <text
              x="38"
              y="118"
              fontSize="10.5"
              fill="var(--pf-color-text-primary, #1e3129)"
            >
              보관됨: 리포머 첫 수업 · 8단계
            </text>

            <rect
              x="232"
              y="100"
              width="100"
              height="28"
              rx="6"
              fill="var(--pf-color-status-info-bg, #edf1ec)"
              stroke="var(--pf-color-status-info-border, #c5d1c3)"
            />
            <text
              x="246"
              y="118"
              fontSize="10.5"
              fontWeight="600"
              fill="var(--pf-color-status-info-text, #2e4639)"
            >
              시퀀스 미리보기
            </text>
          </g>
        )}
      </svg>
      <figcaption className="fctc-illustration-caption">{captionKo}</figcaption>
    </figure>
  );
}
