import { useRef, type ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { getExercisePracticeGuide } from '../utils/exercisePracticeGuide';
import type { PilatesExercise } from '../types/pilates';
import '../styles/exercise-practice-guide.css';

export function ExercisePracticeGuide({
  exercise,
  children,
}: {
  exercise: PilatesExercise;
  children?: ReactNode;
}) {
  const guide = getExercisePracticeGuide(exercise);
  const instructionHeading = useRef<HTMLHeadingElement>(null);
  if (!children) return <p className="practice-guide-benefit">{guide.benefit}</p>;
  return (
    <section className="practice-guide" aria-label={`${exercise.nameKo} 따라 하기`}>
      <div className="practice-guide-intro">
        <p className="practice-guide-benefit">{guide.benefit}</p>
        <button
          type="button"
          className="practice-guide-skip"
          onClick={() => instructionHeading.current?.focus()}
        >
          따라 하는 순서 <ArrowDown size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="practice-guide-layout">
        <div className="practice-guide-figure">{children}</div>
        <div className="practice-guide-instructions">
          <h3 ref={instructionHeading} tabIndex={-1}>
            이렇게 해 보세요
          </h3>
          <ol>
            {guide.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <dl>
            <div>
              <dt>숨은 이렇게</dt>
              <dd>{guide.breath}</dd>
            </div>
            <div>
              <dt>주로 쓰는 곳</dt>
              <dd>{guide.focus}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
