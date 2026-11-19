import React, { useState } from 'react';
import { useManagedTimeouts } from '../hooks/useManagedTimeouts';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { StudioCareBriefing } from '../utils/studioCarePlaybookEngine';

interface StudioCarePlaybookPanelProps {
  readonly briefing: StudioCareBriefing;
  readonly onJumpToOccurrencePrep?: (occurrence: {
    readonly classId: string;
    readonly originalDate: string;
  }) => void;
}

export const StudioCarePlaybookPanel: React.FC<StudioCarePlaybookPanelProps> = ({
  briefing,
  onJumpToOccurrencePrep,
}) => {
  const { scheduleTimeout } = useManagedTimeouts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (briefing.items.length === 0) return null;

  const activeItem =
    briefing.items.find((item) => item.id === selectedId) ?? briefing.items[0]!;

  const handleCopyDraft = async (id: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedId(id);
      scheduleTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2200);
    } catch {
      setCopiedId(id);
    }
  };

  return (
    <details
      className="pf-studio-care-disclosure"
      data-testid="studio-care-playbook-panel"
    >
      <summary>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          <Sparkles size={15} strokeWidth={1.75} aria-hidden="true" />
          오늘 먼저 챙길 수업·그룹 케어 플레이북
        </span>
        <span className="pf-routine-tag-chip pf-routine-tag-chip--compact">
          케어 포인트 {briefing.items.length}건
        </span>
      </summary>

      <div className="pf-studio-care-body">
          <div
            className="pf-studio-care-tabs"
            role="tablist"
            aria-label="스튜디오 케어 시나리오 선택"
          >
            {briefing.items.map((item) => {
              const isSelected = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`pf-routine-tag-chip ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  {item.badgeKo}
                </button>
              );
            })}
          </div>

          <div className="pf-studio-care-card" data-testid="studio-care-active-card">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <small style={{ fontWeight: 600, color: '#3b5448' }}>
                {activeItem.targetLabelKo}
              </small>
              {activeItem.relatedOccurrence && onJumpToOccurrencePrep && (
                <button
                  type="button"
                  className="flow-text-button"
                  onClick={() => onJumpToOccurrencePrep(activeItem.relatedOccurrence!)}
                >
                  해당 수업 바로 보기
                </button>
              )}
            </div>

            <strong style={{ fontSize: '0.95rem', color: '#182b22' }}>
              {activeItem.headlineKo}
            </strong>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#4d6056', lineHeight: 1.48 }}>
              {activeItem.rationaleKo}
            </p>

            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.81rem', color: '#2b4036' }}>
              {activeItem.checklistKo.map((point) => (
                <li key={point} style={{ marginBottom: '3px' }}>
                  {point}
                </li>
              ))}
            </ul>

            <div className="pf-studio-care-draft-box">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <strong style={{ fontSize: '0.77rem', color: '#355441' }}>
                  회원 안내 문구 초안 (검토 후 직접 전달)
                </strong>
                <button
                  type="button"
                  className="flow-text-button"
                  data-testid="studio-care-copy-draft-btn"
                  onClick={() =>
                    void handleCopyDraft(activeItem.id, activeItem.copyableMessageDraftKo)
                  }
                >
                  {copiedId === activeItem.id ? (
                    <>
                      <Check size={13} aria-hidden="true" /> 문구 복사됨
                    </>
                  ) : (
                    <>
                      <Copy size={13} aria-hidden="true" /> 안내 문구 복사
                    </>
                  )}
                </button>
              </div>
              <p style={{ margin: 0 }} data-testid="studio-care-draft-text">
                {activeItem.copyableMessageDraftKo}
              </p>
            </div>
          </div>

          <small style={{ fontSize: '0.8125rem', color: '#617269' }}>
            {briefing.provenanceNoteKo}
          </small>
        </div>
    </details>
  );
};
