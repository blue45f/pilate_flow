import {
  type SettingsGroupId,
  type SettingsGroupSummary,
} from './types';
import { type SettingsGroupSectionsProps } from './PilatesSettingsGroupSections';

function getGroupSummary(
  model: SettingsGroupSectionsProps['model'],
  id: SettingsGroupId,
): SettingsGroupSummary {
  return model.groups.find((item) => item.id === id) ?? model.groups[0];
}

export function PilatesSettingsInstallDataSections({
  instanceId,
  activeGroup,
  model,
  port,
  manualGuideOpen,
  offlineNotesOpen,
  combinedInstallStatusAnnouncement,
  registerSectionRef,
  setLocalInstallOverrides,
  setLocalEquipOverrides,
  setLocalPropOverrides,
  setLocalActionFeedback,
}: SettingsGroupSectionsProps) {
  const installSummary = getGroupSummary(model, 'install');
  const dataSummary = getGroupSummary(model, 'data');

  const hasInstallPort = typeof port?.onRequestPwaInstall === 'function';
  const hasExportBackupPort = typeof port?.onExportBackupJson === 'function';
  const hasSelectBackupPort = typeof port?.onSelectBackupFile === 'function';
  const hasApplyRestorePort = typeof port?.onApplyBackupRestore === 'function';
  const hasCancelRestorePort = typeof port?.onCancelBackupRestore === 'function';
  const hasRollbackRestorePort = typeof port?.onRollbackBackupRestore === 'function';
  const hasDismissRollbackPort = typeof port?.onDismissRollbackBanner === 'function';
  const hasToggleEquipPort = typeof port?.onToggleOwnedEquipment === 'function';
  const hasTogglePropPort = typeof port?.onToggleOwnedProp === 'function';

  return (
    <>
      <section
        ref={(el) => registerSectionRef('install', el)}
        id={`${instanceId}-group-install`}
        className={`pf-settings-group ${activeGroup === 'install' ? 'pf-settings-group--active' : ''}`}
        aria-labelledby={`${instanceId}-heading-install`}
        data-testid="settings-group-install"
      >
        <div className="pf-settings-group__top">
          <span className="pf-settings-page__eyebrow">{installSummary.eyebrow}</span>
          <div className="pf-settings-group__heading-row">
            <h3 id={`${instanceId}-heading-install`} className="pf-settings-group__title">
              3. {installSummary.titleKo}
            </h3>
            <span
              className="pf-settings-group__badge"
              data-testid="settings-current-value-install"
            >
              현재값: {installSummary.currentValueBadgeKo}
            </span>
          </div>
          <p className="pf-settings-group__desc" data-testid="settings-description-install">
            {installSummary.shortDescriptionKo}
          </p>
        </div>

        <dl className="pf-settings-kv-list">
          <div className="pf-settings-kv-item">
            <dt>실행 형태 현재값</dt>
            <dd>{model.install.currentRunModeLabelKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>오프라인 기본 화면</dt>
            <dd>{model.install.currentOfflineLabelKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>오프라인 상태 설명</dt>
            <dd data-testid="settings-install-offline-summary">
              {model.install.offlineDetailSummaryKo}
            </dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>오프라인·미디어 범위</dt>
            <dd data-testid="settings-install-offline-scope">
              {model.install.offlineScopeNoticeKo}
            </dd>
          </div>
        </dl>

        {model.install.showInstallButton && (
          <div className="pf-settings-actions">
            <button
              type="button"
              className="pf-settings-page__btn pf-settings-page__btn--primary"
              data-testid="settings-install-action-btn"
              disabled={!hasInstallPort}
              onClick={() => {
                if (!hasInstallPort) return;
                setLocalInstallOverrides((prev) => ({
                  ...prev,
                  requestFeedback: '설치 창 열기를 요청했어요. 브라우저 안내에 따라 선택해 주세요.',
                }));
                port?.onRequestPwaInstall?.();
              }}
            >
              이 기기에 설치
            </button>
          </div>
        )}

        {!hasInstallPort && !model.install.installed && (
          <p className="pf-settings-guard-box" data-testid="settings-install-unconnected-guide">
            이 요약 영역에서는 바로 설치를 실행하지 않습니다. 메뉴의 ‘앱 설치’ 버튼이나 아래 브라우저
            메뉴 설치 방법을 이용해 주세요.
          </p>
        )}

        {combinedInstallStatusAnnouncement && (
          <p role="status" className="pf-settings-status" data-testid="settings-install-status">
            {combinedInstallStatusAnnouncement}
          </p>
        )}

        {!model.install.installed &&
          (model.install.platform === 'ios-safari' ? (
            <div className="pf-settings-guard-box" data-testid="settings-install-ios-safari">
              <strong>iPhone·iPad Safari 설치 3단계:</strong> 1) 공유 버튼 선택 → 2) 홈 화면에
              추가 선택 → 3) 웹 앱으로 열기 확인 후 추가.
            </div>
          ) : model.install.platform === 'ios-other' ? (
            <p className="pf-settings-guard-box" data-testid="settings-install-ios-other">
              이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.
            </p>
          ) : (
            <details
              className="pf-settings-details"
              open={manualGuideOpen}
              onToggle={(event) => {
                const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                setLocalInstallOverrides((prev) => ({
                  ...prev,
                  manualGuideOpen: isOpen,
                }));
              }}
              data-testid="settings-install-manual-guide"
            >
              <summary>설치 버튼이 보이지 않을 때 수동 설치 방법</summary>
              <div className="pf-settings-details__body">
                <p>
                  Android Chrome: 브라우저 ⋮ 메뉴 → 홈 화면에 추가 → 설치를 선택하세요. PC에서는
                  주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치를 확인하세요.
                </p>
                <p>
                  Mac Safari: 파일 → Dock에 추가를 선택하세요. 브라우저나 기기 정책에 따라 설치를
                  지원하지 않을 수 있습니다.
                </p>
              </div>
            </details>
          ))}

        <details
          className="pf-settings-details"
          open={offlineNotesOpen}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setLocalInstallOverrides((prev) => ({
              ...prev,
              offlineNotesOpen: isOpen,
            }));
          }}
          data-testid="settings-install-offline-notes"
        >
          <summary>오프라인·자료 분리 보관 안내</summary>
          <div className="pf-settings-details__body">
            <p>{model.install.offlineDetailSummaryKo}</p>
            <p>{model.install.offlineScopeNoticeKo}</p>
            <p>
              특히 iPhone·iPad는 Safari와 홈 화면 앱의 저장 공간이 분리될 수 있으니, 앱으로 옮기기
              전 아래 데이터 관리에서 전체 JSON 백업을 먼저 보관해 주세요.
            </p>
          </div>
        </details>
      </section>

      <section
        ref={(el) => registerSectionRef('data', el)}
        id={`${instanceId}-group-data`}
        className={`pf-settings-group ${activeGroup === 'data' ? 'pf-settings-group--active' : ''}`}
        aria-labelledby={`${instanceId}-heading-data`}
        data-testid="settings-group-data"
      >
        <div className="pf-settings-group__top">
          <span className="pf-settings-page__eyebrow">{dataSummary.eyebrow}</span>
          <div className="pf-settings-group__heading-row">
            <h3 id={`${instanceId}-heading-data`} className="pf-settings-group__title">
              4. {dataSummary.titleKo}
            </h3>
            <span className="pf-settings-group__badge" data-testid="settings-current-value-data">
              현재값: {dataSummary.currentValueBadgeKo}
            </span>
          </div>
          <p className="pf-settings-group__desc" data-testid="settings-description-data">
            {dataSummary.shortDescriptionKo}
          </p>
        </div>

        <dl className="pf-settings-kv-list">
          <div className="pf-settings-kv-item">
            <dt>보관된 수업 자료</dt>
            <dd>{model.data.currentRecordsSummaryKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>내 보유 기구·소도구</dt>
            <dd>{model.data.currentInventorySummaryKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>백업·복구 상태</dt>
            <dd>{model.data.currentRecoveryLabelKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>데이터 보호 정책</dt>
            <dd>{model.data.nonDestructivePolicyLabelKo}</dd>
          </div>
        </dl>

        {model.data.persistenceErrorKo && (
          <p role="alert" className="pf-settings-alert" data-testid="settings-data-error">
            {model.data.persistenceErrorKo}
          </p>
        )}

        {model.data.backupMessageKo && (
          <p role="status" className="pf-settings-status" data-testid="settings-data-message">
            {model.data.backupMessageKo}
          </p>
        )}

        <div className="pf-settings-guard-box" data-testid="settings-data-no-delete-guard">
          <strong>데이터 삭제 동작 금지 보호:</strong> 실수로 수업 시퀀스·커스텀 동작·수업 기록이
          영구 삭제되지 않도록 이 설정 화면에서는 ‘전체 데이터 삭제/초기화’ 기능을 제공하지
          않습니다. 백업 불러오기는 항상 기존 자료와 병합하며 즉시 되돌리기를 지원합니다.
        </div>

        <div className="pf-settings-actions">
          <button
            type="button"
            className="pf-settings-page__btn pf-settings-page__btn--primary"
            data-testid="settings-data-export-btn"
            disabled={!hasExportBackupPort}
            onClick={() => {
              if (!hasExportBackupPort) return;
              setLocalActionFeedback(
                '백업 파일 내보내기를 요청했습니다. 안전한 곳에 JSON 파일을 보관해 주세요.',
              );
              port?.onExportBackupJson?.();
            }}
          >
            전체 JSON 백업 내보내기
          </button>

          <button
            type="button"
            className="pf-settings-page__btn"
            data-testid="settings-data-import-btn"
            disabled={!hasSelectBackupPort}
            onClick={() => {
              if (!hasSelectBackupPort) return;
              setLocalActionFeedback(
                '백업 JSON 파일을 읽기 전용으로 검사합니다. 적용 전까지 현재 자료는 바뀌지 않습니다.',
              );
              port?.onSelectBackupFile?.('flow-atelier-backup.json', 12288);
            }}
          >
            백업 불러오기 (복구 전 확인)
          </button>
        </div>

        {!hasSelectBackupPort && (
          <p className="pf-settings-guard-box" data-testid="settings-data-unconnected-guide">
            백업 파일 불러오기와 복구 전 확인·되돌리기는 바로 위 ‘백업 불러오기’ 버튼을 이용해
            주세요. 전체 백업 내보내기와 기구·소도구 선택은 여기서 바로 반영됩니다.
          </p>
        )}

        {model.data.recoveryStage === 'preview-ready' && model.data.recoveryPreview && (
          <div
            className="pf-settings-status"
            role="region"
            aria-label="복구 전 확인 요약"
            data-testid="settings-data-recovery-preview"
          >
            <strong>복구 전 확인: {model.data.recoveryPreview.sourceLabel}</strong>
            <p style={{ margin: '6px 0' }}>
              새로 추가 {model.data.recoveryPreview.newItems}개 · 기존 충돌{' '}
              {model.data.recoveryPreview.conflicts}개 · 기본 예시 복원{' '}
              {model.data.recoveryPreview.restoredExamples}개 (기존 수정본 유지)
            </p>
            {model.data.recoveryPreview.stale && (
              <p style={{ margin: '4px 0', fontWeight: 600 }}>
                검토 후 현재 자료가 달라졌습니다. 다시 검토한 뒤 적용해 주세요.
              </p>
            )}
            {model.data.recoveryPreview.diskBlocked &&
              model.data.recoveryPreview.errorMessage && (
                <p role="alert" className="pf-settings-alert">
                  {model.data.recoveryPreview.errorMessage}
                </p>
              )}
            <div className="pf-settings-actions">
              <button
                type="button"
                className="pf-settings-page__btn pf-settings-page__btn--primary"
                data-testid="settings-data-preview-apply-btn"
                disabled={
                  !hasApplyRestorePort ||
                  model.data.recoveryPreview.stale ||
                  model.data.recoveryPreview.diskBlocked
                }
                onClick={() => {
                  if (
                    !hasApplyRestorePort ||
                    model.data.recoveryPreview?.stale ||
                    model.data.recoveryPreview?.diskBlocked
                  ) {
                    return;
                  }
                  port?.onApplyBackupRestore?.();
                }}
              >
                이 내용으로 복원 적용
              </button>
              <button
                type="button"
                className="pf-settings-page__btn"
                data-testid="settings-data-preview-cancel-btn"
                disabled={!hasCancelRestorePort}
                onClick={() => {
                  if (!hasCancelRestorePort) return;
                  port?.onCancelBackupRestore?.();
                }}
              >
                복원 취소
              </button>
            </div>
          </div>
        )}

        {model.data.recoveryStage === 'rollback-available' && model.data.rollbackPoint && (
          <div className="pf-settings-status" data-testid="settings-data-rollback-bar">
            <strong>
              직전 백업 복원 되돌리기 가능 (+{model.data.rollbackPoint.addedCount}개 항목)
            </strong>
            <div className="pf-settings-actions">
              <button
                type="button"
                className="pf-settings-page__btn"
                data-testid="settings-data-rollback-btn"
                disabled={!hasRollbackRestorePort}
                onClick={() => {
                  if (!hasRollbackRestorePort) return;
                  port?.onRollbackBackupRestore?.();
                }}
              >
                복원 이전 상태로 되돌리기
              </button>
              <button
                type="button"
                className="pf-settings-page__btn"
                data-testid="settings-data-rollback-dismiss-btn"
                disabled={!hasDismissRollbackPort}
                onClick={() => {
                  if (!hasDismissRollbackPort) return;
                  port?.onDismissRollbackBanner?.();
                }}
              >
                되돌리기 닫기
              </button>
            </div>
          </div>
        )}

        <details
          className="pf-settings-details"
          open
          data-testid="settings-data-inventory-details"
        >
          <summary>내 보유 기구·소도구 선택 ({model.data.currentInventorySummaryKo})</summary>
          <div className="pf-settings-details__body">
            <p style={{ marginTop: 0 }}>
              추천 시퀀스는 선택한 기구·소도구 안에서만 구성됩니다. 캐딜락·타워·바렐 종류는 서로
              대체하지 않습니다.
            </p>
            <fieldset className="pf-settings-fieldset" disabled={!hasToggleEquipPort}>
              <legend>보유 기구 · 여러 개 선택</legend>
              <div className="pf-settings-check-grid">
                {model.data.equipmentOptions.map((item) => (
                  <label
                    key={item.id}
                    className={`pf-settings-check-label ${!hasToggleEquipPort ? 'pf-settings-check-label--disabled' : ''}`}
                    data-testid={`settings-equipment-label-${item.id}`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`settings-equipment-check-${item.id}`}
                      checked={item.selected}
                      disabled={!hasToggleEquipPort}
                      onChange={() => {
                        if (!hasToggleEquipPort) return;
                        setLocalEquipOverrides((prev) => ({
                          ...prev,
                          [item.id]: !item.selected,
                        }));
                        port?.onToggleOwnedEquipment?.(item.id);
                      }}
                    />
                    <span>{item.labelKo}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="pf-settings-fieldset" disabled={!hasTogglePropPort}>
              <legend>보유 소도구 · 여러 개 선택</legend>
              <div className="pf-settings-check-grid">
                {model.data.propOptions.map((item) => (
                  <label
                    key={item.id}
                    className={`pf-settings-check-label ${!hasTogglePropPort ? 'pf-settings-check-label--disabled' : ''}`}
                    data-testid={`settings-prop-label-${item.id}`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`settings-prop-check-${item.id}`}
                      checked={item.selected}
                      disabled={!hasTogglePropPort}
                      onChange={() => {
                        if (!hasTogglePropPort) return;
                        setLocalPropOverrides((prev) => ({
                          ...prev,
                          [item.id]: !item.selected,
                        }));
                        port?.onToggleOwnedProp?.(item.id);
                      }}
                    />
                    <span>{item.labelKo}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </details>

        <details className="pf-settings-details" data-testid="settings-data-safety-notes">
          <summary>추천 기준·골반 메모·운동 전 안전 확인 안내</summary>
          <div className="pf-settings-details__body">
            <p style={{ marginTop: 0 }}>
              추천은 기구·시간·난이도·목표 조건 조합이며 의료·교정 효과를 보증하지 않습니다. 수업
              전 강사가 대상자의 상태와 스프링을 직접 확인해 주세요.
            </p>
            <p style={{ marginBottom: 8 }}>
              새로 생기거나 악화하는 통증·저림·근력 저하가 있으면 전문가에게 평가받으세요.
            </p>
            <a
              className="pf-settings-page__link-btn"
              href="https://www.nhs.uk/conditions/back-pain/"
              target="_blank"
              rel="noreferrer"
              data-testid="settings-nhs-safety-link"
            >
              NHS 허리 통증·응급 증상 안내
            </a>
          </div>
        </details>
      </section>
    </>
  );
}
