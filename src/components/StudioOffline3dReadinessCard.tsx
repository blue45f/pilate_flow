import React, { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, DownloadCloud, Smartphone, Wifi } from 'lucide-react';
import { PfBadge, PfButton } from '../design-system';
import { usePwa } from '../lib/pwa';
import {
  inspectStudio3dOfflineCache,
  prewarmStudio3dOfflineCache,
  type Studio3dOfflineStatus,
} from '../utils/pwaStudioOffline';
import { STUDIO_3D_SIGNATURES } from '../utils/studio3dMotionCatalog';
import { ALL_LOSSLESS_MOTION_FRAME_URLS } from '../utils/motionFrameAssets';

const STUDIO_REFORMER_SHOWCASE_SRC = '/images/studio3d/atelier-reformer-unslop-v9.webp';
const STUDIO_REFORMER_GLB_SPEC = '실측 기구 3D · 32파츠';
const STUDIO_SPRING_CODES = ['2R', '1B', '1G', '1Y'] as const;

export const StudioOffline3dReadinessCard: React.FC = () => {
  const pwa = usePwa();
  const totalFamilies = Object.keys(STUDIO_3D_SIGNATURES).length;
  const totalCuts = ALL_LOSSLESS_MOTION_FRAME_URLS.length;
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

  const safeTotal = Math.max(1, cacheState.totalAssets);
  const cachePercent = Math.min(100, Math.round((cacheState.cachedAssets / safeTotal) * 100));

  return (
    <section
      className="pf-offline-3d-card"
      data-testid="studio-offline-3d-readiness-card"
      aria-label="모바일 현장 오프라인 및 3D 모션 보관 준비"
    >
      <div className="pf-offline-3d-card__grid">
        <figure
          className="pf-offline-3d-card__showcase"
          data-testid="studio-offline-3d-reformer-showcase"
        >
          <img
            src={STUDIO_REFORMER_SHOWCASE_SRC}
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            alt="화이트오크와 보타니컬 세이지 리포머 5스프링 스튜디오 3D 도해"
            className="pf-offline-3d-card__showcase-img"
          />
          <figcaption className="pf-offline-3d-card__keycaps" aria-label="기본 5스프링 구성 및 3D 규격">
            {STUDIO_SPRING_CODES.map((code) => (
              <kbd key={code} className="pf-spring-pill">
                {code}
              </kbd>
            ))}
            <kbd className="pf-spring-pill" data-testid="studio-offline-3d-glb-spec">
              {STUDIO_REFORMER_GLB_SPEC}
            </kbd>
          </figcaption>
        </figure>

        <div className="pf-offline-3d-card__content">
          <div className="pf-offline-3d-card__head">
            <div>
              <span className="eyebrow">오프라인 모션 보관</span>
              <h4 className="pf-offline-3d-card__title">
                현장 오프라인 · {totalCuts}컷 3D 모션 미리 보관
              </h4>
            </div>
            <div className="pf-class-badges-strip">
              <PfBadge tone={isOnline ? 'sage' : 'warning'} shape="rect">
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
              <PfBadge tone={pwa.standalone || pwa.installed ? 'brand' : 'sage'} shape="rect">
                <Smartphone size={12} aria-hidden="true" />{' '}
                {pwa.standalone ? '홈 화면 앱 실행 중' : '홈 화면 바로가기 지원'}
              </PfBadge>
            </div>
          </div>

          <p className="pf-offline-3d-card__desc">
            지하 스튜디오나 Wi-Fi가 불안정한 수업실에서도 시퀀스 빌더·라이브 타이머·{totalFamilies}개
            계열({totalCuts}컷) 시작·중간·정점 이미지를 기기 캐시에 미리 담아 둡니다. 영상 스트리밍과
            계정 연결은 인터넷이 필요하며, 브라우저에서 보관 자료를 지우면 다시 저장해야 합니다.
          </p>

          <div
            className="pf-offline-3d-card__progress"
            role="progressbar"
            aria-label="오프라인 3D 모션 캐시 진행률"
            aria-valuemin={0}
            aria-valuemax={safeTotal}
            aria-valuenow={cacheState.cachedAssets}
          >
            <span
              className="pf-offline-3d-card__progress-fill"
              style={{ width: `${cachePercent}%` }}
            />
          </div>

          <div className="pf-offline-3d-card__bar">
            <span className="pf-offline-3d-card__count" data-testid="studio-offline-3d-count">
              {cacheState.isComplete ? (
                <>
                  <CheckCircle2 size={15} aria-hidden="true" /> 3D 모션 {cacheState.cachedAssets} /{' '}
                  {cacheState.totalAssets}컷 오프라인 준비 완료
                </>
              ) : cacheState.cacheSupported ? (
                `오프라인 보관된 3D 모션: ${cacheState.cachedAssets} / ${cacheState.totalAssets}컷 (${cachePercent}%)`
              ) : (
                '이 브라우저에서 모션 오프라인 보관을 사용할 수 없습니다'
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
        </div>
      </div>
    </section>
  );
};
