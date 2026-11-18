import React, { useState } from 'react';
import { Check, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { LightDismissDialog } from './LightDismissDialog';
import { isImeComposing } from '../utils/imeGuard';
import {
  addTagToRoutine,
  deleteStudioRoutineTag,
  getRoutineTagsForId,
  normalizeRoutineTag,
  renameStudioRoutineTag,
  routineTagCanonicalKey,
  toggleTagOnRoutine,
  useStudioRoutineTags,
} from '../utils/studioRoutineTags';

interface RoutineTagInlineStripProps {
  readonly routineId: string;
  readonly routineTitle: string;
  readonly onOpenTagSheet: (routineId: string, routineTitle: string) => void;
  readonly onSelectFilterTag?: (tag: string) => void;
  readonly activeFilterTag?: string | null;
}

export const RoutineTagInlineStrip: React.FC<RoutineTagInlineStripProps> = ({
  routineId,
  routineTitle,
  onOpenTagSheet,
  onSelectFilterTag,
  activeFilterTag,
}) => {
  const tagState = useStudioRoutineTags();
  const tags = getRoutineTagsForId(tagState, routineId);

  return (
    <div
      className="pf-routine-card-tags"
      data-testid={`routine-card-tags-${routineId}`}
      aria-label={`${routineTitle} 루틴 태그`}
    >
      {tags.map((tag) => {
        const isActive =
          Boolean(activeFilterTag) &&
          routineTagCanonicalKey(activeFilterTag!) === routineTagCanonicalKey(tag);
        return onSelectFilterTag ? (
          <button
            key={tag}
            type="button"
            className={`pf-routine-tag-chip pf-routine-tag-chip--compact ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            onClick={(event) => {
              event.stopPropagation();
              onSelectFilterTag(tag);
            }}
            aria-label={`#${tag} 태그로 수업 목록 좁히기`}
          >
            #{tag}
          </button>
        ) : (
          <span key={tag} className="pf-routine-tag-chip pf-routine-tag-chip--compact">
            #{tag}
          </span>
        );
      })}
      <button
        type="button"
        className="pf-routine-tag-add-trigger"
        data-testid={`routine-add-tag-btn-${routineId}`}
        aria-label="스튜디오 루틴 태그 추가 및 편집"
        onClick={(event) => {
          event.stopPropagation();
          onOpenTagSheet(routineId, routineTitle);
        }}
      >
        <Plus size={12} strokeWidth={1.75} aria-hidden="true" />
        {tags.length === 0 ? '태그 추가' : '태그 편집'}
      </button>
    </div>
  );
};

interface RoutineTagSheetDialogProps {
  readonly open: boolean;
  readonly targetRoutineId: string | null;
  readonly targetRoutineTitle: string;
  readonly onClose: () => void;
  readonly onFeedback?: (message: string) => void;
}

export const RoutineTagSheetDialog: React.FC<RoutineTagSheetDialogProps> = ({
  open,
  targetRoutineId,
  targetRoutineTitle,
  onClose,
  onFeedback,
}) => {
  const tagState = useStudioRoutineTags();
  const [newTagInput, setNewTagInput] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  if (!open) return null;

  const assignedTags = targetRoutineId ? getRoutineTagsForId(tagState, targetRoutineId) : [];

  const handleCreateTag = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = normalizeRoutineTag(newTagInput);
    if (!clean) {
      setLocalNotice('태그 이름을 한 글자 이상 입력해 주세요.');
      return;
    }
    if (targetRoutineId) {
      const res = addTagToRoutine(targetRoutineId, clean);
      setLocalNotice(res.message);
      onFeedback?.(res.message);
    }
    setNewTagInput('');
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title={targetRoutineId ? `'${targetRoutineTitle}' 루틴 태그` : '스튜디오 루틴 태그 관리'}
      subtitle="요일·대상·기구 특징대로 자유롭게 이름 붙이고 원탭으로 수업을 찾아보세요"
      maxWidth="520px"
      variant="sheet"
    >
      <div className="pf-routine-tag-sheet" data-testid="routine-tag-sheet-dialog">
        {targetRoutineId && (
          <form className="pf-routine-tag-sheet__create" onSubmit={handleCreateTag}>
            <input
              type="text"
              maxLength={28}
              value={newTagInput}
              onChange={(event) => setNewTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && isImeComposing(event)) {
                  event.preventDefault();
                }
              }}
              placeholder="새 태그 이름 (예: 수요일오전, 저녁A반, 점프보드)"
              aria-label="새 루틴 태그 이름"
            />
            <button
              type="submit"
              className="flow-button flow-button--primary"
              data-testid="routine-tag-create-submit"
            >
              <Plus size={15} strokeWidth={1.75} aria-hidden="true" /> 추가
            </button>
          </form>
        )}

        {localNotice && (
          <p className="flow-hint" role="status" data-testid="routine-tag-sheet-notice">
            {localNotice}
          </p>
        )}

        {targetRoutineId && (
          <div>
            <strong style={{ display: 'block', fontSize: '0.82rem', marginBottom: '8px' }}>
              스튜디오 태그 목록 (탭하여 지정·해제)
            </strong>
            <div className="pf-routine-tag-sheet__grid">
              {tagState.catalog.map((tag) => {
                const selected = assignedTags.some(
                  (item) => routineTagCanonicalKey(item) === routineTagCanonicalKey(tag),
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`pf-routine-tag-chip ${selected ? 'is-active' : ''}`}
                    aria-pressed={selected}
                    data-testid={`routine-tag-toggle-${tag}`}
                    onClick={() => {
                      const res = toggleTagOnRoutine(targetRoutineId, tag);
                      setLocalNotice(res.message);
                      onFeedback?.(res.message);
                    }}
                  >
                    {selected ? (
                      <Check size={13} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Tag size={13} strokeWidth={1.6} aria-hidden="true" />
                    )}
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <details
          open={!targetRoutineId || manageMode}
          onToggle={(event) => setManageMode(event.currentTarget.open)}
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            background: '#faf8f3',
            border: '1px solid rgba(34, 62, 48, 0.1)',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem' }}>
            전체 태그 이름 바꾸기 · 정리 ({tagState.catalog.length}개)
          </summary>
          <p style={{ margin: '6px 0 10px', fontSize: '0.77rem', color: '#56685f' }}>
            태그를 삭제해도 저장된 수업 원본이나 진행 기록은 절대 지워지지 않고 라벨만 해제됩니다.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tagState.catalog.map((tag) => {
              const isRenaming = renamingTag === tag;
              return (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid rgba(34, 62, 48, 0.08)',
                  }}
                >
                  {isRenaming ? (
                    <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                      <input
                        type="text"
                        maxLength={28}
                        value={renameDraft}
                        aria-label={`${tag} 새 태그 이름`}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        style={{
                          flex: 1,
                          minHeight: '34px',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(34, 62, 48, 0.25)',
                        }}
                      />
                      <button
                        type="button"
                        className="flow-button flow-button--primary"
                        onClick={() => {
                          const res = renameStudioRoutineTag(tag, renameDraft);
                          setLocalNotice(res.message);
                          onFeedback?.(res.message);
                          if (res.ok) setRenamingTag(null);
                        }}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className="flow-button"
                        onClick={() => setRenamingTag(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>#{tag}</span>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="flow-text-button"
                          aria-label={`${tag} 태그 이름 변경`}
                          onClick={() => {
                            setRenamingTag(tag);
                            setRenameDraft(tag);
                          }}
                        >
                          <Pencil size={13} aria-hidden="true" /> 이름 변경
                        </button>
                        <button
                          type="button"
                          className="flow-text-button"
                          aria-label={`${tag} 태그 라벨 정리`}
                          data-testid={`delete-studio-tag-${tag}`}
                          onClick={() => {
                            const res = deleteStudioRoutineTag(tag);
                            setLocalNotice(res.message);
                            onFeedback?.(res.message);
                          }}
                        >
                          <Trash2 size={13} aria-hidden="true" /> 라벨 정리
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </LightDismissDialog>
  );
};
