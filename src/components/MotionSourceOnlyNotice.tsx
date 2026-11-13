import { ExternalLink, Play } from 'lucide-react';
import type { ApparatusType } from '../types/pilates';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import '../styles/studio-motion-study.css';

interface MotionSourceOnlyNoticeProps {
  exerciseId: string;
  nameKo: string;
  apparatus: ApparatusType;
  reasonKo: string;
  sourceUrl?: string;
  className?: string;
}

/** Linked source material remains separate from an un-authored native motion. */
export function MotionSourceOnlyNotice({
  exerciseId,
  nameKo,
  apparatus,
  reasonKo,
  sourceUrl,
  className = '',
}: MotionSourceOnlyNoticeProps) {
  return (
    <section
      className={`motion-source-reference ${className}`.trim()}
      data-testid="motion-source-reference"
      data-exercise-id={exerciseId}
      data-motion-status="source-video-only"
      data-match-scope="source-video-only"
      data-native-motion-available="false"
      aria-label={`${nameKo} 동작 영상 안내`}
    >
      <div className="motion-source-reference__art" aria-hidden="true">
        <ApparatusIllustrationSvg apparatus={apparatus} />
        <span><Play size={16} /> 영상으로 동작 확인</span>
      </div>
      <div className="motion-source-reference__copy">
        <p className="mpp-eyebrow">MOVEMENT VIDEO</p>
        <h3>{nameKo}</h3>
        <p>{reasonKo}</p>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            제작자 동작 영상 보기 <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
