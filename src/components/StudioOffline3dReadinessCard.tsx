import React, { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, DownloadCloud, Smartphone, Wifi } from 'lucide-react';
import { PfBadge, PfButton } from '../design-system';
import { usePwa } from '../lib/pwa';
import {
  inspectStudio3dOfflineCache,
  prewarmStudio3dOfflineCache,
  type Studio3dOfflineStatus,
} from '../utils/pwaStudioOffline';
import {
  ALL_STUDIO_3D_ASSET_URLS,
  STUDIO_3D_SIGNATURES,
} from '../utils/studio3dMotionCatalog';

export const StudioOffline3dReadinessCard: React.FC = () => {
  const pwa = usePwa();
  const totalFamilies = Object.keys(STUDIO_3D_SIGNATURES).length;
  const totalCuts = ALL_STUDIO_3D_ASSET_URLS.length;
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  );
  const [cacheState, setCacheState] = useState<Studio3dOfflineStatus>(() => ({
    totalAssets: totalCuts,
    cachedAssets: 0,
    cacheSupported: typeof window !== 'undefined' && 'caches' in window,
    isComplete: false,
  }));
  const [isWarming, setIsWarming] = useState(false);

  useEffect(() => {
    let active = true;
    void inspectStudio3dOfflineCache().then((next) => {
      if (active) setCacheState(next);
    });
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handlePrewarm = async () => {
    if (isWarming) return;
    setIsWarming(true);
    try {
      const next = await prewarmStudio3dOfflineCache((cachedCount, totalCount) => {
        setCacheState({
          totalAssets: totalCount,
          cachedAssets: cachedCount,
          cacheSupported: true,
          isComplete: cachedCount === totalCount,
        });
      });
      setCacheState(next);
    } finally {
      setIsWarming(false);
    }
  };

  return (
    <section
      className="pf-offline-3d-card"
      data-testid="studio-offline-3d-readiness-card"
      aria-label="모바일 현장 오프라인 및 3D 모션 보관 준비"
    >
      <div className="pf-offline-3d-card__head">
        <div>
          <span className="eyebrow">OFFLINE STUDIO PWA · P16</span>
          <h4 className="pf-offline-3d-card__title">
            현장 오프라인 &amp; {totalCuts}컷 3D 모션 미리 보관
          </h4>
        </div>
        <div className="pf-class-badges-strip">
          <PfBadge tone={isOnline ? 'sage' : 'warning'}>
            {isOnline ? (
              <>
                <Wifi size={12} aria-hidden="true" /> 온라인 연결됨
              </>
            ) : (
              <>
                <CloudOff size={12} aria-hidden="true" /> 오프라인 모드 동작 중
              </>
            )}
          </PfBadge>
          <PfBadge tone={pwa.standalone || pwa.installed ? 'brand' : 'sage'}>
            <Smartphone size={12} aria-hidden="true" />{' '}
            {pwa.standalone ? '홈 화면 앱 실행 중' : '홈 화면 바로가기 지원'}
          </PfBadge>
        </div>
      </div>

      <p className="pf-offline-3d-card__desc">
        지하 스튜디오나 Wi-Fi가 불안정한 수업실에서도 시퀀스 빌더·라이브 타이머·{totalFamilies}패밀리(
        {totalCuts}컷) 3D 기구 모션을 끊김 없이 열 수 있도록 기기 캐시에 미리 담아 둡니다. (YouTube
        외부 스트리밍과 클라우드 백업만 인터넷 필요)
      </p>

      <div className="pf-offline-3d-card__bar">
        <span className="pf-offline-3d-card__count" data-testid="studio-offline-3d-count">
          {cacheState.isComplete ? (
            <>
              <CheckCircle2 size={15} aria-hidden="true" /> 3D 모션 {cacheState.cachedAssets} /{' '}
              {cacheState.totalAssets}컷 오프라인 준비 완료
            </>
          ) : cacheState.cacheSupported ? (
            `오프라인 보관된 3D 모션: ${cacheState.cachedAssets} / ${cacheState.totalAssets}컷`
          ) : (
            '이 브라우저 환경에서는 기본 앱 화면 캐시를 사용합니다'
          )}
        </span>
        {cacheState.cacheSupported && (
          <PfButton
            variant={cacheState.isComplete ? 'secondary' : 'primary'}
            data-testid="prewarm-3d-offline-btn"
            disabled={isWarming || !isOnline}
            onClick={() => void handlePrewarm()}
          >
            <DownloadCloud size={15} aria-hidden="true" />{' '}
            {isWarming
              ? '3D 모션 담는 중…'
              : cacheState.isComplete
                ? `${totalCuts}컷 다시 확인`
                : `${totalCuts}컷 3D 모션 오프라인 미리 저장`}
          </PfButton>
        )}
      </div>
    </section>
  );
};
