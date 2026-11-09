import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Sparkles, Wrench } from 'lucide-react';
import {
  APPARATUS_VISUAL_GUIDE_CATALOG,
  PROP_QUICK_GUIDES,
  getApparatusVisualGuide,
  type ApparatusVisualGuideEntry,
} from '../data/apparatusVisualGuideCatalog';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import '../styles/apparatus-visual-guide.css';

export interface ApparatusVisualGuideRibbonProps {
  /** Currently active apparatus or equipment ID (e.g. 'reformer', 'mat', 'chair', 'cadillac', 'barrel') */
  readonly activeApparatusId?: string;
  /** Mode determines default collapsed/expanded state and action buttons */
  readonly mode?: 'atlas' | 'workbench' | 'stage';
  /** Optional callback when user selects an apparatus from the guide switcher */
  readonly onSelectApparatus?: (apparatusId: string) => void;
  /** Optional callback in workbench mode to apply a 5-lens class concept title & subtitle */
  readonly onApplyClassConcept?: (
    titleKo: string,
    subtitleKo: string,
    apparatusFamily: ApparatusVisualGuideEntry['family'],
  ) => void;
}

function ApparatusAnnotatedBlueprintSvg({
  guide,
  activePin,
  onSelectPin,
}: {
  guide: ApparatusVisualGuideEntry;
  activePin: number;
  onSelectPin: (pinNumber: 1 | 2 | 3 | 4) => void;
}): React.JSX.Element {
  const { family, anatomyParts } = guide;

  return (
    <svg
      viewBox="0 0 240 136"
      role="img"
      aria-label={`${guide.nameKo} 주요 구조 및 부위 명칭 도해`}
      className="pf-apparatus-blueprint-svg"
    >
      <defs>
        <linearGradient id={`bp-bg-${family}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6F3EB" />
          <stop offset="100%" stopColor="#FFFDF9" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="238"
        height="134"
        rx="10"
        fill={`url(#bp-bg-${family})`}
        stroke="#D5CCBE"
      />
      {/* Subtle architectural grid lines */}
      <line x1="16" y1="112" x2="224" y2="112" stroke="#D8CEBE" strokeWidth="1.5" />
      <line
        x1="16"
        y1="32"
        x2="224"
        y2="32"
        stroke="#EAE3D7"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />

      {family === 'reformer' && (
        <g>
          {/* Wooden Frame */}
          <rect
            x="24"
            y="84"
            width="192"
            height="13"
            rx="3"
            fill="#C29668"
            stroke="#87623E"
            strokeWidth="1.5"
          />
          <rect x="30" y="97" width="9" height="15" rx="1.5" fill="#A67B4E" />
          <rect x="200" y="97" width="9" height="15" rx="1.5" fill="#A67B4E" />
          {/* Sliding Carriage */}
          <rect
            x="56"
            y="70"
            width="94"
            height="14"
            rx="4"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.6"
          />
          {/* Shoulder Blocks */}
          <rect
            x="68"
            y="56"
            width="9"
            height="14"
            rx="2"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.4"
          />
          <rect
            x="82"
            y="56"
            width="9"
            height="14"
            rx="2"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.4"
          />
          {/* Color-coded springs */}
          <line
            x1="150"
            y1="76"
            x2="190"
            y2="76"
            stroke="#C84B31"
            strokeWidth="2.6"
            strokeDasharray="3 2"
          />
          <line
            x1="150"
            y1="80"
            x2="190"
            y2="80"
            stroke="#2D6A9F"
            strokeWidth="2.6"
            strokeDasharray="3 2"
          />
          <line
            x1="150"
            y1="84"
            x2="190"
            y2="84"
            stroke="#D4A017"
            strokeWidth="2.2"
            strokeDasharray="3 2"
          />
          {/* Footbar */}
          <path
            d="M 194 84 L 210 52 L 186 52"
            fill="none"
            stroke="#1F5C4D"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Risers & Straps */}
          <rect x="28" y="42" width="5" height="42" rx="2" fill="#A67B4E" />
          <path d="M 33 48 Q 50 62 68 64" fill="none" stroke="#6D655B" strokeWidth="1.6" />
        </g>
      )}

      {family === 'mat' && (
        <g>
          {/* Perspective Studio Mat */}
          <polygon
            points="28,98 54,68 212,68 188,98"
            fill="#6B9483"
            stroke="#1F5C4D"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Head pillow / towel */}
          <rect
            x="48"
            y="71"
            width="24"
            height="10"
            rx="5"
            fill="#F4EFE6"
            stroke="#B8926A"
            strokeWidth="1.3"
          />
          {/* Magic Circle */}
          <ellipse
            cx="158"
            cy="56"
            rx="20"
            ry="20"
            fill="none"
            stroke="#1F5C4D"
            strokeWidth="3.2"
          />
          <rect x="135" y="50" width="5" height="12" rx="2" fill="#87623E" />
          <rect x="176" y="50" width="5" height="12" rx="2" fill="#87623E" />
        </g>
      )}

      {family === 'chair' && (
        <g>
          {/* Wooden Chair Frame */}
          <path
            d="M 68 110 L 166 110 L 158 50 L 86 50 Z"
            fill="#E9DFCF"
            stroke="#A67B4E"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Seat Pad */}
          <rect
            x="80"
            y="40"
            width="84"
            height="11"
            rx="4"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.6"
          />
          {/* Split Pedal & Springs */}
          <line
            x1="116"
            y1="104"
            x2="66"
            y2="78"
            stroke="#1F5C4D"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="66" cy="78" r="5" fill="#C84B31" />
          <line
            x1="84"
            y1="86"
            x2="126"
            y2="52"
            stroke="#C84B31"
            strokeWidth="2.6"
            strokeDasharray="4 2"
          />
          {/* Side Handles */}
          <line
            x1="152"
            y1="110"
            x2="152"
            y2="20"
            stroke="#596863"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="143"
            y1="20"
            x2="161"
            y2="20"
            stroke="#1F5C4D"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}

      {family === 'cadillac' && (
        <g>
          {/* Canopy Frame */}
          <rect
            x="32"
            y="20"
            width="176"
            height="68"
            rx="3"
            fill="none"
            stroke="#6C7C80"
            strokeWidth="3.2"
          />
          {/* Table Bed */}
          <rect
            x="28"
            y="82"
            width="184"
            height="11"
            rx="3"
            fill="#5F867A"
            stroke="#1F5C4D"
            strokeWidth="1.6"
          />
          <rect x="34" y="93" width="9" height="19" fill="#B5895D" />
          <rect x="197" y="93" width="9" height="19" fill="#B5895D" />
          {/* Push-Through Bar */}
          <line x1="68" y1="20" x2="68" y2="56" stroke="#1F5C4D" strokeWidth="3.2" />
          <line
            x1="32"
            y1="28"
            x2="68"
            y2="52"
            stroke="#2D6A9F"
            strokeWidth="2.2"
            strokeDasharray="3 2"
          />
          {/* Roll-Down Bar */}
          <line
            x1="184"
            y1="24"
            x2="164"
            y2="50"
            stroke="#D4A017"
            strokeWidth="2.2"
            strokeDasharray="3 2"
          />
          <rect x="156" y="48" width="16" height="5" rx="2" fill="#9E7147" />
          {/* Fuzzy Loops */}
          <path
            d="M 118 20 L 118 40 C 112 48 124 48 118 40"
            fill="none"
            stroke="#1F5C4D"
            strokeWidth="2.4"
          />
        </g>
      )}

      {family === 'barrel' && (
        <g>
          {/* Curved Barrel Arc */}
          <path
            d="M 38 110 L 38 68 C 38 34 114 34 114 68 L 114 110 Z"
            fill="#648B7B"
            stroke="#1F5C4D"
            strokeWidth="2"
          />
          {/* Sliding Base */}
          <line
            x1="32"
            y1="110"
            x2="196"
            y2="110"
            stroke="#B5895D"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Wooden Ladder Uprights & Rungs */}
          <line
            x1="176"
            y1="24"
            x2="176"
            y2="110"
            stroke="#A67B4E"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line x1="152" y1="32" x2="188" y2="32" stroke="#87623E" strokeWidth="3.2" />
          <line x1="156" y1="50" x2="188" y2="50" stroke="#87623E" strokeWidth="3.2" />
          <line x1="160" y1="68" x2="188" y2="68" stroke="#87623E" strokeWidth="3.2" />
          <line x1="164" y1="86" x2="188" y2="86" stroke="#87623E" strokeWidth="3.2" />
        </g>
      )}

      {/* Numbered Interactive Callout Pins */}
      {anatomyParts.map((part) => {
        const selected = activePin === part.pinNumber;
        return (
          <g
            key={part.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectPin(part.pinNumber)}
          >
            {selected && (
              <circle
                cx={part.pinX}
                cy={part.pinY}
                r="14"
                fill="rgba(200, 75, 49, 0.18)"
                stroke="#C84B31"
                strokeWidth="1.2"
              />
            )}
            <circle
              cx={part.pinX}
              cy={part.pinY}
              r="9.5"
              fill={selected ? '#C84B31' : '#1F5C4D'}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              x={part.pinX}
              y={part.pinY + 3.5}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fill="#FFFFFF"
            >
              {part.pinNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const ApparatusVisualGuideRibbon: React.FC<ApparatusVisualGuideRibbonProps> = ({
  activeApparatusId = 'reformer',
  mode = 'atlas',
  onSelectApparatus,
  onApplyClassConcept,
}) => {
  const [selectedGuideId, setSelectedGuideId] = useState<string>(() =>
    getApparatusVisualGuide(activeApparatusId).id,
  );
  const [expanded, setExpanded] = useState<boolean>(mode === 'atlas');
  const [activeTab, setActiveTab] = useState<'anatomy' | 'springs' | 'ideas'>('anatomy');
  const [activePin, setActivePin] = useState<1 | 2 | 3 | 4>(1);

  const effectiveGuide =
    activeApparatusId && activeApparatusId !== 'all' && activeApparatusId !== 'mixed'
      ? getApparatusVisualGuide(activeApparatusId)
      : getApparatusVisualGuide(selectedGuideId);

  const activePart =
    effectiveGuide.anatomyParts.find((part) => part.pinNumber === activePin) ??
    effectiveGuide.anatomyParts[0];

  const handleChooseApparatus = (guideId: string) => {
    setSelectedGuideId(guideId);
    setActivePin(1);
    onSelectApparatus?.(guideId);
  };

  return (
    <section
      className={`pf-apparatus-guide-ribbon ${
        mode === 'stage' ? 'pf-apparatus-guide-ribbon--compact' : ''
      }`.trim()}
      aria-label={`${effectiveGuide.nameKo} 기구 구조·스프링·수업 아이디어 비주얼 가이드`}
      data-testid="apparatus-visual-guide-ribbon"
      data-active-apparatus={effectiveGuide.id}
    >
      <div className="pf-apparatus-guide-ribbon__top">
        <div className="pf-apparatus-guide-ribbon__identity">
          <ApparatusIconBadge apparatus={effectiveGuide.family} size="md" decorative />
          <div className="pf-apparatus-guide-ribbon__titles">
            <div className="pf-apparatus-guide-ribbon__kicker-row">
              <span className="pf-apparatus-guide-ribbon__kicker">기구 비주얼 도감</span>
              <span className="pf-apparatus-guide-ribbon__role-badge">
                {effectiveGuide.studioRoleBadgeKo}
              </span>
            </div>
            <h2 className="pf-apparatus-guide-ribbon__heading">
              {effectiveGuide.nameKo} 구조 · 스프링 장력 · 수업 아이디어
              <small>{effectiveGuide.nameEn}</small>
            </h2>
            <p className="pf-apparatus-guide-ribbon__summary">
              {effectiveGuide.oneLineSummaryKo}
            </p>
          </div>
        </div>

        <div className="pf-apparatus-guide-ribbon__controls">
          <div
            className="pf-apparatus-guide-switcher"
            role="group"
            aria-label="가이드 기구 전환"
          >
            {APPARATUS_VISUAL_GUIDE_CATALOG.map((item) => {
              const isCurrent = effectiveGuide.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="pf-apparatus-guide-switcher__btn"
                  aria-pressed={isCurrent}
                  onClick={() => handleChooseApparatus(item.id)}
                >
                  {item.nameKo}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="pf-apparatus-guide-toggle-btn"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
            data-testid="apparatus-guide-expand-toggle"
          >
            {expanded ? (
              <>
                기구 상세 가이드 접기 <ChevronUp size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                기구 부위·스프링·5대 컨셉 열기 <ChevronDown size={15} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Always-visible 3-second quick part pills for immediate scannability */}
      <div
        className="pf-apparatus-guide-ribbon__QuickChips"
        aria-label={`${effectiveGuide.nameKo} 핵심 부위 빠른 보기`}
      >
        {effectiveGuide.anatomyParts.map((part) => (
          <button
            key={part.id}
            type="button"
            className="pf-apparatus-guide-part-pill"
            aria-pressed={expanded && activeTab === 'anatomy' && activePin === part.pinNumber}
            onClick={() => {
              setActivePin(part.pinNumber);
              setActiveTab('anatomy');
              if (!expanded) setExpanded(true);
            }}
          >
            <span className="pf-apparatus-guide-part-pill__num">{part.pinNumber}</span>
            <span>{part.nameKo}</span>
          </button>
        ))}
      </div>

      {expanded && (
        <div className="pf-apparatus-guide-body">
          <div
            className="pf-apparatus-guide-tabs"
            role="tablist"
            aria-label="기구 가이드 세부 탭"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'anatomy'}
              className="pf-apparatus-guide-tab"
              onClick={() => setActiveTab('anatomy')}
            >
              <Wrench size={14} aria-hidden="true" /> 1. 기구 부위 명칭 & 체형 세팅
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'springs'}
              className="pf-apparatus-guide-tab"
              onClick={() => setActiveTab('springs')}
            >
              <span>🎨</span> 2. 스프링 컬러 장력표 & 소도구 궁합
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ideas'}
              className="pf-apparatus-guide-tab"
              data-testid="apparatus-guide-ideas-tab"
              onClick={() => setActiveTab('ideas')}
            >
              <Sparkles size={14} aria-hidden="true" /> 3. @generate-fresh-ideas 5대 수업 리믹스
            </button>
          </div>

          {activeTab === 'anatomy' && (
            <>
              <div className="pf-apparatus-anatomy-layout">
                <div className="pf-apparatus-blueprint-card">
                  <ApparatusAnnotatedBlueprintSvg
                    guide={effectiveGuide}
                    activePin={activePin}
                    onSelectPin={setActivePin}
                  />
                  <p className="pf-apparatus-blueprint-caption">
                    <strong>
                      핀 {activePart.pinNumber} · {activePart.nameKo}:
                    </strong>{' '}
                    {activePart.setupTipKo}
                  </p>
                </div>

                <div className="pf-apparatus-parts-grid">
                  {effectiveGuide.anatomyParts.map((part) => {
                    const isSelected = activePin === part.pinNumber;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        className={`pf-apparatus-part-card ${isSelected ? 'is-active' : ''}`.trim()}
                        onClick={() => setActivePin(part.pinNumber)}
                      >
                        <div className="pf-apparatus-part-card__head">
                          <span className="pf-apparatus-part-card__pin">{part.pinNumber}</span>
                          <span className="pf-apparatus-part-card__title">{part.nameKo}</span>
                        </div>
                        <p className="pf-apparatus-part-card__role">{part.roleKo}</p>
                        <p className="pf-apparatus-part-card__tip">세팅 팁: {part.setupTipKo}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pf-apparatus-fit-strip" aria-label="체형 및 컨디션별 3초 기구 세팅">
                {effectiveGuide.bodyFitTips.map((tip) => (
                  <div key={tip.badgeKo} className="pf-apparatus-fit-item">
                    <strong>체형·안전 맞춤 · {tip.badgeKo}</strong>
                    <span>{tip.adjustmentKo}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'springs' && (
            <>
              <p className="pf-apparatus-blueprint-caption" style={{ margin: 0 }}>
                <strong>저항·보조 역학 원리:</strong> {effectiveGuide.resistancePrincipleKo}
              </p>
              <div
                className="pf-apparatus-springs-grid"
                aria-label={`${effectiveGuide.nameKo} 스프링 및 지렛대 저항 기준`}
              >
                {effectiveGuide.springSpecs.map((spec) => (
                  <div key={spec.id} className="pf-apparatus-spring-card">
                    <div className="pf-apparatus-spring-card__head">
                      <span className="pf-apparatus-spring-dot">
                        <i style={{ backgroundColor: spec.colorHex }} aria-hidden="true" />
                        {spec.colorNameKo}
                      </span>
                      <span className="pf-apparatus-spring-tension">{spec.tensionLabelKo}</span>
                    </div>
                    <p className="pf-apparatus-spring-usage">추천 구간: {spec.usageKo}</p>
                  </div>
                ))}
              </div>
              <div
                className="pf-apparatus-fit-strip"
                aria-label="주요 소도구 결합 가이드"
              >
                {PROP_QUICK_GUIDES.slice(0, 3).map((prop) => (
                  <div key={prop.id} className="pf-apparatus-fit-item">
                    <strong>
                      소도구 궁합 · {prop.nameKo} ({prop.bestApparatusKo})
                    </strong>
                    <span>{prop.cueTipKo}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'ideas' && (
            <div
              className="pf-apparatus-ideas-grid"
              data-testid="apparatus-fresh-ideas-grid"
              aria-label={`${effectiveGuide.nameKo} 5대 크리에이티브 수업 아이디어`}
            >
              {effectiveGuide.freshIdeas.map((idea) => (
                <article
                  key={idea.lensId}
                  className="pf-apparatus-idea-card"
                  data-testid={`apparatus-idea-${idea.lensId}`}
                >
                  <div className="pf-apparatus-idea-card__top">
                    <div className="pf-apparatus-idea-card__badge-row">
                      <span className="pf-apparatus-idea-badge">{idea.badgeKo}</span>
                      <a
                        href={idea.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pf-apparatus-idea-source"
                      >
                        {idea.sourceLabelKo}{' '}
                        <ExternalLink
                          size={11}
                          aria-hidden="true"
                          style={{ verticalAlign: 'middle' }}
                        />
                      </a>
                    </div>
                    <h3 className="pf-apparatus-idea-headline">{idea.headlineKo}</h3>
                    <p className="pf-apparatus-idea-pitch">{idea.pitchKo}</p>
                  </div>
                  <div className="pf-apparatus-idea-card__footer">
                    <span className="pf-apparatus-idea-theme">
                      추천 테마: {idea.suggestedTitleKo}
                    </span>
                    {onApplyClassConcept && (
                      <button
                        type="button"
                        className="pf-apparatus-idea-apply-btn"
                        data-testid={`apply-apparatus-idea-${idea.lensId}`}
                        onClick={() =>
                          onApplyClassConcept(
                            idea.suggestedTitleKo,
                            idea.suggestedSubtitleKo,
                            effectiveGuide.family,
                          )
                        }
                      >
                        이 테마로 수업 제목 적용
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
