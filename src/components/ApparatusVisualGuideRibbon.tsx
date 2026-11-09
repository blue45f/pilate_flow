import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CircleDot,
  ExternalLink,
  HeartHandshake,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  APPARATUS_VISUAL_GUIDE_CATALOG,
  PROP_QUICK_GUIDES,
  SPECIAL_POPULATION_CARE_PRESETS,
  TARGETED_PAIN_CARE_BLOCKS,
  buildApparatusIdeaExpandedDraft,
  getApparatusVisualGuide,
  type ApparatusVisualGuideEntry,
  type PropQuickGuide,
  type SpecialPopulationCarePreset,
  type TargetedPainCareBlock,
} from '../data/apparatusVisualGuideCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import '../styles/apparatus-visual-guide.css';

export interface ApparatusVisualGuideRibbonProps {
  /** Currently active apparatus or equipment ID (e.g. 'reformer', 'mat', 'chair', 'cadillac', 'barrel') */
  readonly activeApparatusId?: string;
  /** Mode determines default collapsed/expanded state and action buttons */
  readonly mode?: 'atlas' | 'workbench' | 'stage' | 'binder';
  /** Optional callback when user selects an apparatus from the guide switcher */
  readonly onSelectApparatus?: (apparatusId: string) => void;
  /** Optional callback in workbench mode to apply a 5-lens class concept title & subtitle */
  readonly onApplyClassConcept?: (
    titleKo: string,
    subtitleKo: string,
    apparatusFamily: ApparatusVisualGuideEntry['family'],
  ) => void;
}

function PropStudioIllustrationSvg({ prop }: { prop: PropQuickGuide }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 88 56"
      role="img"
      aria-label={`${prop.nameKo} 소도구 도해`}
      style={{ width: '76px', height: '48px', flexShrink: 0, borderRadius: '8px' }}
    >
      <rect x="1" y="1" width="86" height="54" rx="8" fill="#F6F3EB" stroke="#D7CFC2" />
      {prop.id === 'magic-circle' && (
        <g>
          <circle cx="44" cy="28" r="17" fill="none" stroke="#1F5C4D" strokeWidth="3.2" />
          <rect x="23" y="22" width="5" height="12" rx="2" fill="#87623E" />
          <rect x="60" y="22" width="5" height="12" rx="2" fill="#87623E" />
          <path d="M 33 28 L 55 28" stroke="#C84B31" strokeWidth="1.5" strokeDasharray="2 2" />
        </g>
      )}
      {prop.id === 'foam-roller' && (
        <g>
          <rect
            x="14"
            y="20"
            width="60"
            height="16"
            rx="8"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.8"
          />
          <ellipse cx="20" cy="28" rx="4" ry="8" fill="#E3EFE9" stroke="#1F5C4D" strokeWidth="1.4" />
        </g>
      )}
      {prop.id === 'mini-ball' && (
        <g>
          <circle
            cx="44"
            cy="28"
            r="16"
            fill="#7AA494"
            stroke="#1F5C4D"
            strokeWidth="1.8"
          />
          <path
            d="M 34 20 Q 42 15 50 19"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
      {prop.id === 'theraband' && (
        <g>
          <path
            d="M 14 34 C 28 14, 60 14, 74 34"
            fill="none"
            stroke="#C84B31"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 18 38 C 32 22, 56 22, 70 38"
            fill="none"
            stroke="#2D6A9F"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {prop.id === 'bosu' && (
        <g>
          <path
            d="M 18 38 A 26 20 0 0 1 70 38 Z"
            fill="#628B7B"
            stroke="#1F5C4D"
            strokeWidth="1.8"
          />
          <rect x="14" y="38" width="60" height="5" rx="2" fill="#87623E" />
        </g>
      )}
    </svg>
  );
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
      <rect
        x="1"
        y="1"
        width="238"
        height="134"
        rx="10"
        fill="#F6F3EB"
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
  const [activeTab, setActiveTab] = useState<
    'anatomy' | 'springs' | 'ideas' | 'special' | 'props'
  >('anatomy');
  const [activePin, setActivePin] = useState<1 | 2 | 3 | 4>(1);
  const [showAllIdeaScripts, setShowAllIdeaScripts] = useState<boolean>(true);
  const [appliedSpecialStatus, setAppliedSpecialStatus] = useState<string>('');

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

  const handleApplySpecialPopulationPreset = (preset: SpecialPopulationCarePreset) => {
    const currentState = usePilatesStore.getState();
    const builtSteps: SequenceStep[] = preset.steps.map((item, idx) => ({
      kind: 'exercise',
      stepId: `special-${preset.id}-${idx + 1}-${Date.now()}`,
      order: idx + 1,
      blockCategory: item.blockCategory,
      classSection: item.classSection,
      exerciseId: item.exerciseId,
      durationMin: item.durationMin,
      explanationSec: 20,
      transitionSec: idx === 0 ? 0 : 15,
      repetitions: 8,
      sets: 2,
      sideMode: item.sideMode ?? 'together',
      selectedLayer: 'standard',
      customSpringOverride: item.springsNoteKo,
      instructorNote: `${item.labelKo} · ${item.cueNoteKo}`,
    }));

    const result = currentState.applyPresetDraft(
      {
        steps: builtSteps,
        title: preset.titleKo,
        subtitle: preset.subtitleKo,
        targetMinutes: preset.targetMinutes,
      },
      'replace',
      currentState,
    );

    if (result.success) {
      setAppliedSpecialStatus(
        `‘${preset.titleKo}’ (${preset.steps.length}개 맞춤 스텝 · 50분) 시퀀스를 현재 수업안에 적용했습니다.`,
      );
      onApplyClassConcept?.(preset.titleKo, preset.subtitleKo, preset.primaryApparatus);
    } else {
      setAppliedSpecialStatus(result.message);
    }
  };

  const handleApplyTargetedPainBlock = (
    block: TargetedPainCareBlock,
    applyMode: 'append' | 'replace',
  ) => {
    const currentState = usePilatesStore.getState();
    const effectiveMode =
      applyMode === 'append' && currentState.activeSteps.length === 0 ? 'replace' : applyMode;
    const builtSteps: SequenceStep[] = block.steps.map((item, idx) => ({
      kind: 'exercise',
      stepId: `painblock-${block.id}-${idx + 1}-${Date.now()}`,
      order: idx + 1,
      blockCategory: item.blockCategory,
      classSection: item.classSection,
      exerciseId: item.exerciseId,
      durationMin: item.durationMin,
      explanationSec: 20,
      transitionSec: idx === 0 ? 0 : 15,
      repetitions: 8,
      sets: 2,
      sideMode: item.sideMode ?? 'together',
      selectedLayer: 'standard',
      customSpringOverride: item.springsNoteKo,
      instructorNote: `${item.labelKo} · ${item.cueNoteKo}`,
    }));

    const result = currentState.applyPresetDraft(
      {
        steps: builtSteps,
        title: block.titleKo,
        subtitle: block.subtitleKo,
        targetMinutes: block.durationMinutes,
      },
      effectiveMode,
      currentState,
    );

    if (result.success) {
      setAppliedSpecialStatus(
        effectiveMode === 'append'
          ? `‘${block.titleKo}’ (15분 · 3개 스텝) 블록을 현재 수업 시퀀스 뒤에 이어붙였습니다.`
          : `‘${block.titleKo}’ (15분 · 3개 스텝) 집중 케어 블록으로 새 수업안을 열었습니다.`,
      );
    } else {
      setAppliedSpecialStatus(result.message);
    }
  };

  return (
    <section
      className={`pf-apparatus-guide-ribbon ${
        mode === 'stage' || mode === 'binder' ? 'pf-apparatus-guide-ribbon--compact' : ''
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
              <span className="pf-apparatus-guide-ribbon__kicker">기구 · 소도구 비주얼 도감</span>
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
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'special'}
              className="pf-apparatus-guide-tab"
              data-testid="apparatus-guide-special-tab"
              onClick={() => setActiveTab('special')}
            >
              <HeartHandshake size={14} aria-hidden="true" /> 4. 회원 케이스·통증 부위별 맞춤 프리셋
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'props'}
              className="pf-apparatus-guide-tab"
              data-testid="apparatus-guide-props-tab"
              onClick={() => setActiveTab('props')}
            >
              <CircleDot size={14} aria-hidden="true" /> 5. 5대 소도구(링·롤러·볼·밴드·보수) 도감
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
            <>
              <div className="pf-apparatus-ideas-toolbar">
                <p className="pf-apparatus-blueprint-caption" style={{ margin: 0 }}>
                  <strong>5대 리믹스 전체 실전 대본 (Mode B 1~5 통합 확장):</strong>{' '}
                  역발상·공감스토리·임상근거·플레이북·디테일 5가지 관점의 수업 오프닝 멘트, 회원
                  공지문, 실전 큐잉 3원칙을 바로 활용하세요.
                </p>
                <button
                  type="button"
                  className="pf-apparatus-idea-apply-btn"
                  data-testid="toggle-all-idea-scripts"
                  aria-pressed={showAllIdeaScripts}
                  onClick={() => setShowAllIdeaScripts((prev) => !prev)}
                >
                  {showAllIdeaScripts
                    ? '1~5번 상세 대본(오프닝·안내문·큐잉) 접기'
                    : '1~5번 전체 상세 대본 모두 펼치기'}
                </button>
              </div>
              <div
                className="pf-apparatus-ideas-grid"
                data-testid="apparatus-fresh-ideas-grid"
                aria-label={`${effectiveGuide.nameKo} 5대 크리에이티브 수업 아이디어`}
              >
                {effectiveGuide.freshIdeas.map((idea) => {
                  const expandedDraft = buildApparatusIdeaExpandedDraft(effectiveGuide, idea);
                  return (
                    <article
                      key={idea.lensId}
                      className="pf-apparatus-idea-card"
                      data-testid={`apparatus-idea-${idea.lensId}`}
                    >
                      <div className="pf-apparatus-idea-card__top">
                        <div className="pf-apparatus-idea-card__badge-row">
                          <span className="pf-apparatus-idea-badge">
                            {expandedDraft.lensNumber}. {idea.badgeKo}
                          </span>
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

                        {showAllIdeaScripts && (
                          <div
                            className="pf-apparatus-idea-script-box"
                            data-testid={`apparatus-idea-script-${idea.lensId}`}
                          >
                            <div className="pf-apparatus-idea-script-item">
                              <strong>🎙️ 수업 오프닝 30초 멘트</strong>
                              <p>{expandedDraft.openingScriptKo}</p>
                            </div>
                            <div className="pf-apparatus-idea-script-item">
                              <strong>📩 회원 공지 · 클래스 안내문</strong>
                              <p>{expandedDraft.memberNoticeKo}</p>
                            </div>
                            <div className="pf-apparatus-idea-script-item">
                              <strong>✅ 실전 티칭 큐잉 3원칙</strong>
                              <ul className="pf-apparatus-idea-checklist">
                                {expandedDraft.coachingChecklistKo.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
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
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'special' && (
            <>
              {appliedSpecialStatus && (
                <p
                  className="pf-apparatus-blueprint-caption"
                  role="status"
                  aria-live="polite"
                  data-testid="special-preset-applied-status"
                  style={{ margin: 0, background: '#e5f2ec', color: '#164438', fontWeight: 700 }}
                >
                  {appliedSpecialStatus}
                </p>
              )}
              <p className="pf-apparatus-blueprint-caption" style={{ margin: 0 }}>
                <strong>트랙 A · 특수 회원 50분 풀 시퀀스 프리셋 3종 (산전·산후 · 척추측만 · 시니어):</strong>{' '}
                기구 세팅 3원칙, 금기 수칙(Red Flags), 6스텝 50분 시퀀스를 원클릭으로 불러옵니다.
              </p>
              <div
                className="pf-apparatus-ideas-grid"
                data-testid="special-population-presets-grid"
                aria-label="특수 회원 케이스별 50분 맞춤 시퀀스 프리셋"
              >
                {SPECIAL_POPULATION_CARE_PRESETS.map((preset) => (
                  <article
                    key={preset.id}
                    className="pf-apparatus-idea-card"
                    data-testid={`special-preset-${preset.id}`}
                  >
                    <div className="pf-apparatus-idea-card__top">
                      <div className="pf-apparatus-idea-card__badge-row">
                        <span className="pf-apparatus-idea-badge">{preset.badgeKo}</span>
                        <a
                          href={preset.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pf-apparatus-idea-source"
                        >
                          {preset.sourceLabelKo}{' '}
                          <ExternalLink
                            size={11}
                            aria-hidden="true"
                            style={{ verticalAlign: 'middle' }}
                          />
                        </a>
                      </div>
                      <h3 className="pf-apparatus-idea-headline">{preset.titleKo}</h3>
                      <p className="pf-apparatus-idea-pitch">{preset.summaryKo}</p>

                      <div className="pf-apparatus-idea-script-box">
                        <div className="pf-apparatus-idea-script-item">
                          <strong>🔧 기구 세팅 & 바이오메카닉스 3원칙</strong>
                          <ul className="pf-apparatus-idea-checklist">
                            {preset.setupRulesKo.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pf-apparatus-idea-script-item">
                          <strong>⚠️ 필수 금기 및 안전 수칙 (Red Flags)</strong>
                          <p>{preset.contraindicationsKo}</p>
                        </div>
                        <div className="pf-apparatus-idea-script-item">
                          <strong>🎙️ 수업 오프닝 30초 멘트</strong>
                          <p>{preset.openingScriptKo}</p>
                        </div>
                        <div className="pf-apparatus-idea-script-item">
                          <strong>📋 50분 6스텝 시퀀스 타임라인 구성</strong>
                          <ol className="pf-apparatus-idea-checklist">
                            {preset.steps.map((st) => (
                              <li key={`${preset.id}-${st.exerciseId}`}>
                                <span>
                                  <b>{st.labelKo}</b> ({st.durationMin}분 · {st.springsNoteKo}) —{' '}
                                  {st.cueNoteKo}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                    <div className="pf-apparatus-idea-card__footer">
                      <span className="pf-apparatus-idea-theme">
                        총 {preset.targetMinutes}분 · {preset.steps.length}개 스텝 완비
                      </span>
                      <button
                        type="button"
                        className="pf-apparatus-idea-apply-btn"
                        data-testid={`apply-special-preset-${preset.id}`}
                        onClick={() => handleApplySpecialPopulationPreset(preset)}
                      >
                        50분 전용 시퀀스 수업안에 바로 담기
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <p className="pf-apparatus-blueprint-caption" style={{ margin: 0 }}>
                <strong>트랙 B · 부위별 통증·기능 15분 집중 케어 블록 3종 (어깨 회전근개 · 고관절 스내핑힙 · 족저근막/발목):</strong>{' '}
                현재 수업 뒤에 15분 모듈로 이어붙이거나 15분 단독 시퀀스로 바로 열 수 있습니다.
              </p>
              <div
                className="pf-apparatus-ideas-grid"
                data-testid="targeted-pain-blocks-grid"
                aria-label="부위별 통증 및 기능 15분 집중 케어 블록"
              >
                {TARGETED_PAIN_CARE_BLOCKS.map((block) => (
                  <article
                    key={block.id}
                    className="pf-apparatus-idea-card"
                    data-testid={`pain-block-${block.id}`}
                  >
                    <div className="pf-apparatus-idea-card__top">
                      <div className="pf-apparatus-idea-card__badge-row">
                        <span className="pf-apparatus-idea-badge">{block.badgeKo}</span>
                        <a
                          href={block.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pf-apparatus-idea-source"
                        >
                          {block.sourceLabelKo}{' '}
                          <ExternalLink
                            size={11}
                            aria-hidden="true"
                            style={{ verticalAlign: 'middle' }}
                          />
                        </a>
                      </div>
                      <h3 className="pf-apparatus-idea-headline">{block.titleKo}</h3>
                      <p className="pf-apparatus-idea-pitch">{block.summaryKo}</p>

                      <div className="pf-apparatus-idea-script-box">
                        <div className="pf-apparatus-idea-script-item">
                          <strong>🔧 부위별 세팅 & 큐잉 3원칙</strong>
                          <ul className="pf-apparatus-idea-checklist">
                            {block.setupRulesKo.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pf-apparatus-idea-script-item">
                          <strong>⚠️ 주의 및 금기 수칙</strong>
                          <p>{block.contraindicationsKo}</p>
                        </div>
                        <div className="pf-apparatus-idea-script-item">
                          <strong>📋 15분 3스텝 집중 블록 구성</strong>
                          <ol className="pf-apparatus-idea-checklist">
                            {block.steps.map((st) => (
                              <li key={`${block.id}-${st.exerciseId}`}>
                                <span>
                                  <b>{st.labelKo}</b> ({st.durationMin}분 · {st.springsNoteKo}) —{' '}
                                  {st.cueNoteKo}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                    <div className="pf-apparatus-idea-card__footer">
                      <span className="pf-apparatus-idea-theme">
                        총 {block.durationMinutes}분 · 3개 스텝 모듈
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button
                          type="button"
                          className="pf-apparatus-idea-apply-btn"
                          data-testid={`append-pain-block-${block.id}`}
                          onClick={() => handleApplyTargetedPainBlock(block, 'append')}
                        >
                          현재 수업 뒤에 15분 추가
                        </button>
                        <button
                          type="button"
                          className="pf-apparatus-idea-apply-btn"
                          data-testid={`replace-pain-block-${block.id}`}
                          onClick={() => handleApplyTargetedPainBlock(block, 'replace')}
                        >
                          15분 단독 시퀀스로 열기
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeTab === 'props' && (
            <div
              className="pf-apparatus-ideas-grid"
              data-testid="prop-visual-guides-grid"
              aria-label="5대 스튜디오 소도구 비주얼 도감 및 큐잉 가이드"
            >
              {PROP_QUICK_GUIDES.map((prop) => (
                <article
                  key={prop.id}
                  className="pf-apparatus-idea-card"
                  data-testid={`prop-guide-${prop.id}`}
                >
                  <div className="pf-apparatus-idea-card__top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PropStudioIllustrationSvg prop={prop} />
                      <div>
                        <span className="pf-apparatus-idea-badge">{prop.nameEn}</span>
                        <h3 className="pf-apparatus-idea-headline" style={{ marginTop: '4px' }}>
                          {prop.nameKo}
                        </h3>
                      </div>
                    </div>
                    <p className="pf-apparatus-idea-pitch">{prop.summaryKo}</p>
                    <div className="pf-apparatus-idea-script-box">
                      <div className="pf-apparatus-idea-script-item">
                        <strong>🤝 최고 궁합 기구 & 구간</strong>
                        <p>{prop.bestApparatusKo}</p>
                      </div>
                      <div className="pf-apparatus-idea-script-item">
                        <strong>🎙️ 핵심 티칭 큐잉 포인트</strong>
                        <p>{prop.cueTipKo}</p>
                      </div>
                    </div>
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
