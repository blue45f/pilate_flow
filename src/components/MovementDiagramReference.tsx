import { useMemo, useState } from 'react';
import type { PilatesExercise } from '../types/pilates';
import { toMovementPhaseDiagramProps } from '../features/motionCoverage/adapters';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import '../styles/movement-diagram-reference.css';

/** Single authored reference only; no verified motion sequence or class-side instruction. */
export function MovementDiagramReference({ exercise }: { exercise: PilatesExercise }) {
  return <DiagramDisclosure key={exercise.id} exercise={exercise} />;
}

function DiagramDisclosure({ exercise }: { exercise: PilatesExercise }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="movement-diagram-reference"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>참고 자세 그림</summary>
      {open && <DiagramContent exercise={exercise} />}
    </details>
  );
}

function DiagramContent({ exercise }: { exercise: PilatesExercise }) {
  const props = useMemo(
    () =>
      toMovementPhaseDiagramProps(exercise, 'start', {
        activeSide: 'right',
        mirrored: false,
        showMuscles: false,
        showAlignment: false,
        showDirection: false,
        showGhostStartPose: false,
        label: `${exercise.nameKo} · 직접 작성한 참고 자세 그림 · 해부학 미검증`,
      }),
    [exercise],
  );
  return (
    <section className="movement-diagram-reference-content" aria-label="참고 자세 정지 그림">
      {!props ? (
        <p>이 동작과 일치하는 도해가 아직 없어요. 다른 동작의 그림으로 대신하지 않아요.</p>
      ) : (
        <>
          <p className="muted">
            직접 작성한 정지 그림 한 장이에요. 실제 단계별 프레임이 검증되지 않아 단계 탐색이나
            재생은 제공하지 않아요.
          </p>
          <div className="movement-diagram-reference-canvas">
            <MovementPhaseDiagramSvg {...props} />
          </div>
          <p className="muted">
            기준 그림: 오른쪽 · 화면 반전 없음. 수업안의 좌우 설정과 연결되지 않아요.
          </p>
          <p className="muted">
            해부학적 정확성과 운동 안전성은 검증되지 않았어요. 실제 운동 시범이나 3D 모델이 아닌
            참고 자료예요.
          </p>
        </>
      )}
    </section>
  );
}
