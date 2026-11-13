import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import '../styles/studio-motion-study.css';

/** A changed catalogue identity has no matching authored pose or implied video verification. */
export function UnmodeledMotionNotice({
  exercise,
  className = '',
}: {
  exercise: Pick<PilatesExercise, 'id' | 'nameKo' | 'apparatus'>;
  className?: string;
}) {
  return (
    <section
      className={`motion-source-reference ${className}`.trim()}
      data-testid="unmodeled-motion-reference"
      data-exercise-id={exercise.id}
      data-match-scope="unmodeled-exercise"
      data-native-motion-available="false"
      aria-label={`${exercise.nameKo} 전용 도해 안내`}
    >
      <div
        className="motion-source-reference__art"
        role="img"
        aria-label={`${exercise.nameKo} · 전용 도해 없음 · ${APPARATUS_LABELS[exercise.apparatus].ko} 기구 안내 이미지`}
      >
        <ApparatusIllustrationSvg apparatus={exercise.apparatus} />
        <span aria-hidden="true">기구 안내</span>
      </div>
      <div className="motion-source-reference__copy">
        <h3>{exercise.nameKo}</h3>
        <p>기구나 시작 자세가 변경되어 기존 도해를 표시하지 않습니다. 현재 동작에 연결된 자료를 확인해 주세요.</p>
      </div>
    </section>
  );
}
