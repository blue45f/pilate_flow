import React, { useMemo, useState } from 'react';
import {
  CLASS_CUE_SHEET_FIXTURES,
  getCueSheetFixtureById,
} from './classCueSheetFixtures';
import { buildClassCueSheetProjection } from './classCueSheetProjection';
import type {
  ClassCueSheetItem,
  ClassCueSheetProjection,
  CueSheetFixtureEntry,
  CueSheetItemOriginKind,
  CueSheetProjectionOptions,
  CueSheetSourceInput,
} from './classCueSheetTypes';
import './classCueSheet.css';

export interface ClassCueSheetPreviewProps {
  readonly projection?: ClassCueSheetProjection;
  readonly sourceInput?: CueSheetSourceInput;
  readonly projectionOptions?: CueSheetProjectionOptions;
  readonly initialFixtureId?: CueSheetFixtureEntry['fixtureId'];
  readonly initialStepIndex?: number;
  readonly initialViewMode?: 'compact' | 'expanded';
  readonly initialPrintPreviewMode?: boolean;
  readonly showFixtureSwitcher?: boolean;
}

function getOriginBadgeLabelKo(originKind: CueSheetItemOriginKind): string {
  switch (originKind) {
    case 'name-only':
      return '이름만 입력된 새 동작';
    case 'human-draft':
      return '사용자 초안 동작';
    case 'snapshot':
      return '스냅샷 동작';
    case 'rest':
      return '휴식 구간';
    case 'recovered-invalid':
      return '복구된 입력 항목';
    case 'catalog':
    default:
      return '카탈로그 동작';
  }
}

function formatStepNumber(order: number): string {
  return String(Math.max(0, order)).padStart(2, '0');
}

function renderItemCueBlock(item: ClassCueSheetItem): React.ReactNode {
  const { cueContent } = item;
  const noteClassName = cueContent.isLongCue
    ? 'cue-sheet-note cue-sheet-long-note'
    : 'cue-sheet-note';

  if (!cueContent.hasCues) {
    const emptyText = cueContent.emptyCueLabelKo.includes('작성된 큐 메모 없음')
      ? cueContent.emptyCueLabelKo
      : `${cueContent.emptyCueLabelKo} (작성된 큐 메모 없음)`;
    return (
      <p className="cue-sheet-note" data-testid={`empty-cue-${item.cueItemId}`}>
        {emptyText}
      </p>
    );
  }

  return (
    <div className={cueContent.isLongCue ? 'cue-sheet-long-note' : undefined}>
      {cueContent.cues.length > 0 && (
        <ul className="cue-sheet-cue-list" aria-label={`${item.nameKo} 티칭 큐 목록`}>
          {cueContent.cues.map((cueText, cueIdx) => (
            <li
              key={`${item.cueItemId}-cue-${cueIdx}`}
              className="cue-sheet-cue-text"
            >
              {cueText}
            </li>
          ))}
        </ul>
      )}
      {cueContent.layerCue && (
        <p className={noteClassName}>레이어 큐: {cueContent.layerCue}</p>
      )}
      {cueContent.breathPattern && (
        <p className={noteClassName}>호흡: {cueContent.breathPattern}</p>
      )}
      {cueContent.instructorNote && (
        <p className={noteClassName}>강사 메모: {cueContent.instructorNote}</p>
      )}
      {cueContent.precautions && (
        <p className={noteClassName}>주의사항: {cueContent.precautions}</p>
      )}
    </div>
  );
}

export const ClassCueSheetPreview: React.FC<ClassCueSheetPreviewProps> = ({
  projection,
  sourceInput,
  projectionOptions,
  initialFixtureId = 'standard-mixed',
  initialStepIndex = 0,
  initialViewMode = 'compact',
  initialPrintPreviewMode = false,
  showFixtureSwitcher,
}) => {
  const shouldShowFixtureSwitcher =
    showFixtureSwitcher ??
    (projection === undefined && sourceInput === undefined);

  const [selectedFixtureId, setSelectedFixtureId] =
    useState<CueSheetFixtureEntry['fixtureId']>(initialFixtureId);
  const [rawStepIndex, setRawStepIndex] = useState<number>(() =>
    Math.max(0, Math.trunc(initialStepIndex || 0)),
  );
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(
    initialViewMode,
  );
  const [printPreviewMode, setPrintPreviewMode] = useState<boolean>(
    initialPrintPreviewMode,
  );

  const activeProjection = useMemo<ClassCueSheetProjection>(() => {
    if (projection !== undefined) {
      return projection;
    }
    if (sourceInput !== undefined) {
      return buildClassCueSheetProjection(sourceInput, projectionOptions);
    }
    const fixture =
      getCueSheetFixtureById(selectedFixtureId) ?? CLASS_CUE_SHEET_FIXTURES[0];
    return fixture.buildProjection();
  }, [projection, sourceInput, projectionOptions, selectedFixtureId]);

  const totalItems = activeProjection.items.length;
  const maxStepIndex = Math.max(0, totalItems - 1);
  const currentIndex =
    totalItems === 0 ? 0 : Math.min(Math.max(0, rawStepIndex), maxStepIndex);

  const currentItem =
    totalItems > 0 ? activeProjection.items[currentIndex] : undefined;
  const nextItem =
    totalItems > 0 && currentIndex + 1 < totalItems
      ? activeProjection.items[currentIndex + 1]
      : undefined;

  const handleSelectFixture = (
    nextFixtureId: CueSheetFixtureEntry['fixtureId'],
  ) => {
    setSelectedFixtureId(nextFixtureId);
    setRawStepIndex(0);
  };

  const handleGoFirst = () => {
    setRawStepIndex(0);
  };

  const handleGoPrev = () => {
    setRawStepIndex(Math.max(0, currentIndex - 1));
  };

  const handleGoNext = () => {
    setRawStepIndex(Math.min(maxStepIndex, currentIndex + 1));
  };

  const handleGoLast = () => {
    setRawStepIndex(maxStepIndex);
  };

  const handleDeckKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (totalItems === 0) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleGoPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleGoNext();
    } else if (event.key === 'Home') {
      event.preventDefault();
      handleGoFirst();
    } else if (event.key === 'End') {
      event.preventDefault();
      handleGoLast();
    }
  };

  const rootClassName = [
    'class-cue-sheet-root',
    printPreviewMode ? 'is-print-preview' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClassName}
      data-testid="class-cue-sheet-root"
      data-print-preview={printPreviewMode ? 'true' : 'false'}
    >
      <header
        className="cue-sheet-boundary-banner"
        aria-label="단독 통합 후보 및 경계 고지"
      >
        <p className="cue-sheet-boundary-title">
          독립 통합 후보 (Standalone Integration Candidate) · 실제 앱 라우트 미연결
        </p>
        <p className="cue-sheet-boundary-text">
          자동 처방 없음 · 안전성·운동 효과 보장 없음 · 새 동작 강제 분류 없음 · 로컬
          전용(외부 AI·서버 전송·저장소 기록 없음)
        </p>
        {activeProjection.boundary.disclaimerKo && (
          <p className="cue-sheet-boundary-text">
            {activeProjection.boundary.disclaimerKo}
          </p>
        )}
      </header>

      {shouldShowFixtureSwitcher && (
        <section
          className="cue-sheet-fixture-toolbar cue-sheet-no-print"
          aria-label="합성 수업 픽스처 도구 모음"
        >
          <div className="cue-sheet-fixture-controls">
            <label htmlFor="cue-sheet-fixture-select">
              <strong>합성 수업 픽스처</strong>
            </label>
            <select
              id="cue-sheet-fixture-select"
              aria-label="합성 수업 픽스처 선택"
              className="cue-sheet-fixture-select"
              value={selectedFixtureId}
              onChange={(e) =>
                handleSelectFixture(
                  e.target.value as CueSheetFixtureEntry['fixtureId'],
                )
              }
            >
              {CLASS_CUE_SHEET_FIXTURES.map((fixture) => (
                <option key={fixture.fixtureId} value={fixture.fixtureId}>
                  {fixture.labelKo} ({fixture.fixtureId})
                </option>
              ))}
            </select>
          </div>
          <div
            className="cue-sheet-fixture-buttons"
            role="group"
            aria-label="픽스처 빠른 전환 버튼"
          >
            {CLASS_CUE_SHEET_FIXTURES.map((fixture) => {
              const isSelected = fixture.fixtureId === selectedFixtureId;
              return (
                <button
                  key={fixture.fixtureId}
                  type="button"
                  className={`cue-sheet-btn ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  data-fixture-id={fixture.fixtureId}
                  onClick={() => handleSelectFixture(fixture.fixtureId)}
                >
                  {fixture.labelKo}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section
        className="cue-sheet-summary-card"
        aria-label="수업 요약 및 장비·시간 안내"
      >
        <div className="cue-sheet-summary-header">
          <div>
            <h1 className="cue-sheet-title">{activeProjection.title}</h1>
            {activeProjection.subtitle && (
              <p className="cue-sheet-subtitle">{activeProjection.subtitle}</p>
            )}
          </div>
          <div className="cue-sheet-badge-row">
            <span className="cue-sheet-badge">
              기구: {activeProjection.apparatusLabelKo}
            </span>
            <span className="cue-sheet-badge">
              난이도: {activeProjection.levelLabelKo}
            </span>
          </div>
        </div>

        <div className="cue-sheet-summary-grid">
          <div className="cue-sheet-summary-cell">
            <span className="cue-sheet-summary-label">항목 구성</span>
            <span className="cue-sheet-summary-value">
              전체 {activeProjection.itemCount}개 · 동작{' '}
              {activeProjection.exerciseCount}개 · 휴식{' '}
              {activeProjection.restCount}개
            </span>
          </div>
          <div className="cue-sheet-summary-cell">
            <span className="cue-sheet-summary-label">시간 요약</span>
            <span className="cue-sheet-summary-value">
              {activeProjection.timingSummary.timingSummaryLabelKo}
            </span>
          </div>
          <div className="cue-sheet-summary-cell">
            <span className="cue-sheet-summary-label">사용 기구</span>
            <span className="cue-sheet-summary-value">
              {activeProjection.allEquipmentLabelsKo.length > 0
                ? activeProjection.allEquipmentLabelsKo.join(', ')
                : activeProjection.apparatusLabelKo}
            </span>
          </div>
          <div className="cue-sheet-summary-cell">
            <span className="cue-sheet-summary-label">소도구</span>
            <span className="cue-sheet-summary-value">
              {activeProjection.allPropLabelsKo.length > 0
                ? activeProjection.allPropLabelsKo.join(', ')
                : '소도구 없음'}
            </span>
          </div>
        </div>

        <div className="cue-sheet-badge-row">
          {activeProjection.timingSummary.hasUnspecifiedTime && (
            <span
              className="cue-sheet-badge is-warning"
              data-testid="unspecified-time-badge"
            >
              시간 미정 {activeProjection.timingSummary.unspecifiedItemCount}개 항목
              포함 (새 시간 추정 없음)
            </span>
          )}
          {activeProjection.nameOnlyCount > 0 && (
            <span
              className="cue-sheet-badge is-emphasis"
              data-testid="name-only-count-badge"
            >
              이름만 입력된 동작 {activeProjection.nameOnlyCount}개 (강제 분류 없음)
            </span>
          )}
          {activeProjection.duplicateNameGroupCount > 0 && (
            <span className="cue-sheet-badge">
              동일 동작명 구분 그룹 {activeProjection.duplicateNameGroupCount}개
            </span>
          )}
          {(activeProjection.privacy.strippedSensitiveKeys.length > 0 ||
            activeProjection.privacy.redactedInlineTextCount > 0) && (
            <span
              className="cue-sheet-badge"
              data-testid="privacy-stripped-badge"
            >
              민감 필드 제외 ({activeProjection.privacy.strippedSensitiveKeys.length}
              종) · 인라인 보호 ({activeProjection.privacy.redactedInlineTextCount}
              건)
            </span>
          )}
        </div>
      </section>

      {activeProjection.truncation.isTruncated && (
        <section
          role="region"
          aria-label="진행표 잘림 및 상한 안내"
          className="cue-sheet-truncation-banner"
          data-testid="cue-sheet-truncation-banner"
        >
          <h2 className="cue-sheet-truncation-title">
            진행표 상한 적용 및 생략 안내 (임의 숨김 없음)
          </h2>
          <p className="cue-sheet-meta-line">
            생략된 입력 항목: {activeProjection.truncation.omittedInputItemCount}개 ·
            생략된 펼침 행: {activeProjection.truncation.omittedExpandedRowCount}개 ·
            반복 상한 적용 블록:{' '}
            {activeProjection.truncation.cappedBlockRepetitionCount}개 · 중첩 깊이
            상한 적용: {activeProjection.truncation.cappedDepthCount}건 · 차단된 순환
            참조: {activeProjection.truncation.circularReferenceCount}건
          </p>
          <ul className="cue-sheet-truncation-list">
            {activeProjection.truncation.reasonsKo.map((reason, idx) => (
              <li key={`truncation-reason-${idx}`}>{reason}</li>
            ))}
          </ul>
        </section>
      )}

      <div
        className="cue-sheet-focus-deck"
        tabIndex={0}
        aria-label="현재 및 다음 진행 포커스 데크"
        onKeyDown={handleDeckKeyDown}
      >
        <div className="cue-sheet-focus-controls cue-sheet-no-print">
          <strong>
            진행 포커스 이동 (방향키 좌·우 / Home·End 지원)
          </strong>
          <div className="cue-sheet-badge-row">
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="첫 진행 항목으로 이동"
              disabled={totalItems === 0 || currentIndex === 0}
              onClick={handleGoFirst}
            >
              처음 항목으로
            </button>
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="이전 진행 항목"
              disabled={totalItems === 0 || currentIndex === 0}
              onClick={handleGoPrev}
            >
              이전 항목
            </button>
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="다음 진행 항목"
              disabled={totalItems === 0 || currentIndex >= totalItems - 1}
              onClick={handleGoNext}
            >
              다음 항목
            </button>
          </div>
        </div>

        <div className="cue-sheet-focus-grid">
          <section
            aria-label="현재 진행 항목"
            aria-live="polite"
            className="cue-sheet-focus-card is-current"
          >
            <div className="cue-sheet-badge-row">
              <span className="cue-sheet-badge is-emphasis">현재 진행 항목</span>
              {currentItem && (
                <span className="cue-sheet-badge">
                  {formatStepNumber(currentItem.order)} /{' '}
                  {formatStepNumber(totalItems)}
                </span>
              )}
              {currentItem && (
                <span className="cue-sheet-badge">
                  {getOriginBadgeLabelKo(currentItem.originKind)}
                </span>
              )}
              {currentItem?.isDuplicateName &&
                currentItem.duplicateDisambiguatorKo && (
                  <span className="cue-sheet-badge is-warning">
                    {currentItem.duplicateDisambiguatorKo}
                  </span>
                )}
            </div>

            {!currentItem ? (
              <p className="cue-sheet-note">
                등록된 수업 진행 항목이 없습니다.
              </p>
            ) : (
              <>
                <h2 className="cue-sheet-title">{currentItem.nameKo}</h2>
                <div className="cue-sheet-badge-row">
                  <span className="cue-sheet-badge">
                    {currentItem.blockMeta.sectionLabelKo}
                  </span>
                  {currentItem.blockMeta.blockCategoryLabelKo && (
                    <span className="cue-sheet-badge">
                      {currentItem.blockMeta.blockCategoryLabelKo}
                    </span>
                  )}
                  {currentItem.blockMeta.blockPathTitles.length > 0 && (
                    <span className="cue-sheet-badge">
                      블록: {currentItem.blockMeta.blockPathTitles.join(' › ')}
                    </span>
                  )}
                  {currentItem.blockMeta.blockRepetitionCount > 1 && (
                    <span className="cue-sheet-badge">
                      블록 반복 {currentItem.blockMeta.blockRepetitionIndex}/
                      {currentItem.blockMeta.blockRepetitionCount}
                    </span>
                  )}
                  <span className="cue-sheet-badge">
                    {currentItem.practice.sideBadgeKo}
                  </span>
                  <span
                    className={`cue-sheet-badge ${
                      currentItem.timing.status === 'unspecified'
                        ? 'is-warning'
                        : ''
                    }`}
                  >
                    {currentItem.timing.displayLabelKo}
                  </span>
                </div>
                <p className="cue-sheet-meta-line">
                  수행: {currentItem.practice.practiceSummaryKo} · 시간 상세:{' '}
                  {currentItem.timing.detailLabelKo}
                </p>
                <p className="cue-sheet-meta-line">
                  세팅: {currentItem.setup.setupSummaryKo}
                </p>
                {renderItemCueBlock(currentItem)}
              </>
            )}
          </section>

          <section
            aria-label="다음 준비 항목"
            className="cue-sheet-focus-card"
          >
            <div className="cue-sheet-badge-row">
              <span className="cue-sheet-badge">다음 준비 항목</span>
              {nextItem && (
                <span className="cue-sheet-badge">
                  #{formatStepNumber(nextItem.order)}
                </span>
              )}
              {nextItem?.isDuplicateName &&
                nextItem.duplicateDisambiguatorKo && (
                  <span className="cue-sheet-badge is-warning">
                    {nextItem.duplicateDisambiguatorKo}
                  </span>
                )}
            </div>

            {!nextItem ? (
              <p className="cue-sheet-note">
                마지막 항목입니다 · 다음 예정 항목 없음
              </p>
            ) : (
              <>
                <h3 className="cue-sheet-title">{nextItem.nameKo}</h3>
                <div className="cue-sheet-badge-row">
                  <span className="cue-sheet-badge">
                    {nextItem.practice.sideBadgeKo}
                  </span>
                  <span
                    className={`cue-sheet-badge ${
                      nextItem.timing.status === 'unspecified'
                        ? 'is-warning'
                        : ''
                    }`}
                  >
                    {nextItem.timing.displayLabelKo}
                  </span>
                </div>
                <p className="cue-sheet-meta-line">
                  수행: {nextItem.practice.practiceSummaryKo}
                </p>
                <p className="cue-sheet-meta-line">
                  세팅: {nextItem.setup.setupSummaryKo}
                </p>
                <p className="cue-sheet-note">
                  {nextItem.cueContent.cues[0] ??
                    (nextItem.cueContent.instructorNote ||
                      nextItem.cueContent.emptyCueLabelKo)}
                </p>
              </>
            )}
          </section>
        </div>
      </div>

      <section
        aria-label="전체 수업 진행표"
        className="cue-sheet-progression-section"
      >
        <div className="cue-sheet-view-toolbar cue-sheet-no-print">
          <div className="cue-sheet-view-buttons" role="group" aria-label="진행표 보기 모드">
            <button
              type="button"
              className={`cue-sheet-btn ${
                viewMode === 'compact' ? 'is-active' : ''
              }`}
              aria-pressed={viewMode === 'compact'}
              onClick={() => setViewMode('compact')}
            >
              기본 진행표 ({activeProjection.items.length})
            </button>
            <button
              type="button"
              className={`cue-sheet-btn ${
                viewMode === 'expanded' ? 'is-active' : ''
              }`}
              aria-pressed={viewMode === 'expanded'}
              onClick={() => setViewMode('expanded')}
            >
              반복·좌우 펼침 진행표 ({activeProjection.expandedRows.length})
            </button>
          </div>

          <button
            type="button"
            className={`cue-sheet-btn ${printPreviewMode ? 'is-active' : ''}`}
            aria-pressed={printPreviewMode}
            onClick={() => setPrintPreviewMode((prev) => !prev)}
          >
            로컬 인쇄 미리보기 보기
          </button>
        </div>

        {activeProjection.isEmpty ? (
          <div className="cue-sheet-empty-state" role="status">
            <p className="cue-sheet-title">
              수업 진행 항목이 비어 있습니다 (0개 항목)
            </p>
            <p className="cue-sheet-subtitle">
              시퀀스에 동작이나 휴식 구간이 등록되면 순서·세팅·큐가 이곳에 표시됩니다.
            </p>
          </div>
        ) : viewMode === 'compact' ? (
          <ol
            className="cue-sheet-item-list"
            aria-label="기본 진행표 항목 목록"
          >
            {activeProjection.items.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              const itemClasses = [
                'cue-sheet-item',
                isCurrent ? 'is-active-step' : '',
                item.cueContent.isLongCue ? 'is-long-cue' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={item.cueItemId}
                  data-cue-item-id={item.cueItemId}
                  className={itemClasses}
                >
                  <div className="cue-sheet-item-header">
                    <button
                      type="button"
                      className="cue-sheet-item-select-btn"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => setRawStepIndex(idx)}
                    >
                      <span>#{formatStepNumber(item.order)}</span>
                      <span>{item.nameKo}</span>
                      {item.isDuplicateName && item.duplicateDisambiguatorKo && (
                        <span className="cue-sheet-badge is-warning">
                          {item.duplicateDisambiguatorKo}
                        </span>
                      )}
                    </button>

                    <div className="cue-sheet-badge-row">
                      <span className="cue-sheet-badge">
                        {getOriginBadgeLabelKo(item.originKind)}
                      </span>
                      <span className="cue-sheet-badge">
                        {item.blockMeta.sectionLabelKo}
                      </span>
                      {item.blockMeta.blockCategoryLabelKo && (
                        <span className="cue-sheet-badge">
                          {item.blockMeta.blockCategoryLabelKo}
                        </span>
                      )}
                      {item.blockMeta.blockPathTitles.length > 0 && (
                        <span className="cue-sheet-badge">
                          블록: {item.blockMeta.blockPathTitles.join(' › ')}
                        </span>
                      )}
                      {item.blockMeta.blockRepetitionCount > 1 && (
                        <span className="cue-sheet-badge">
                          블록 반복 {item.blockMeta.blockRepetitionIndex}/
                          {item.blockMeta.blockRepetitionCount}
                        </span>
                      )}
                      <span className="cue-sheet-badge">
                        {item.practice.sideBadgeKo}
                      </span>
                      <span
                        className={`cue-sheet-badge ${
                          item.timing.status === 'unspecified'
                            ? 'is-warning'
                            : ''
                        }`}
                      >
                        {item.timing.displayLabelKo}
                      </span>
                    </div>
                  </div>

                  <p className="cue-sheet-meta-line">
                    수행: {item.practice.practiceSummaryKo} · 시간 상세:{' '}
                    {item.timing.detailLabelKo}
                  </p>
                  <p className="cue-sheet-meta-line">
                    세팅: {item.setup.setupSummaryKo}
                  </p>
                  {renderItemCueBlock(item)}
                </li>
              );
            })}
          </ol>
        ) : (
          <ol
            className="cue-sheet-expanded-list"
            aria-label="펼친 진행표 항목 목록"
          >
            {activeProjection.expandedRows.map((row) => (
              <li
                key={row.expandedRowId}
                data-expanded-row-id={row.expandedRowId}
                className="cue-sheet-expanded-row"
              >
                <div className="cue-sheet-badge-row">
                  <span className="cue-sheet-badge">
                    펼침 #{formatStepNumber(row.expandedOrder)} (원본 #
                    {formatStepNumber(row.parentItemOrder)})
                  </span>
                  <strong>{row.nameKo}</strong>
                  {row.duplicateDisambiguatorKo && (
                    <span className="cue-sheet-badge is-warning">
                      {row.duplicateDisambiguatorKo}
                    </span>
                  )}
                  {row.blockHeaderKo && (
                    <span className="cue-sheet-badge">{row.blockHeaderKo}</span>
                  )}
                  {row.sideLabelKo && (
                    <span className="cue-sheet-badge">{row.sideLabelKo}</span>
                  )}
                  {row.setIndex !== null && row.setCount !== null && (
                    <span className="cue-sheet-badge">
                      세트 {row.setIndex}/{row.setCount}
                    </span>
                  )}
                  {row.blockRepetitionCount > 1 && (
                    <span className="cue-sheet-badge">
                      블록 반복 {row.blockRepetitionIndex}/
                      {row.blockRepetitionCount}
                    </span>
                  )}
                  <span
                    className={`cue-sheet-badge ${
                      row.timingStatus === 'unspecified' ? 'is-warning' : ''
                    }`}
                  >
                    {row.timingLabelKo}
                  </span>
                </div>
                <p className="cue-sheet-meta-line">
                  세팅: {row.setupSummaryKo}
                </p>
                <p className="cue-sheet-note">
                  큐: {row.primaryCueKo}
                  {row.instructorNote ? ` · 메모: ${row.instructorNote}` : ''}
                </p>
              </li>
            ))}
            {activeProjection.truncation.omittedExpandedRowCount > 0 && (
              <li
                className="cue-sheet-expanded-omitted-footer"
                data-testid="expanded-omitted-footer"
              >
                펼침 행 상한({activeProjection.truncation.maxExpandedRowsCap}행) 초과로{' '}
                {activeProjection.truncation.omittedExpandedRowCount}개 펼침 행이
                생략되었습니다. (임의 숨김 없음)
              </li>
            )}
          </ol>
        )}
      </section>
    </div>
  );
};
