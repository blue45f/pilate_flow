import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import {
  ANATOMY_REGIONS,
  POSTURE_GUIDE,
  SPINE_GUIDE,
  mapAnatomyTags,
} from '../data/postureAnatomyGuide';
import type { BodyPosition, PilatesExercise, SpinalPlane } from '../types/pilates';
import { BodyPositionFigure } from './BodyPositionFigure';
import { PostureAnatomyGuide } from './PostureAnatomyGuide';

const exercise: PilatesExercise = {
  ...ORIGINAL_MOVEMENTS[0],
  nameKo: '그림 검증용 동작',
  targetMuscles: ['대둔근', '햄스트링', '척추분절근'],
  bodyPosition: 'supine',
  spinalPlanes: ['flexion', 'extension'],
};
afterEach(cleanup);

describe('posture and anatomy guide', () => {
  it.each(Object.keys(POSTURE_GUIDE) as BodyPosition[])(
    'labels the static %s orientation without claiming an exercise demonstration',
    (position) => {
      const { container } = render(<BodyPositionFigure position={position} />);
      const image = screen.getByRole('img', { name: new RegExp(POSTURE_GUIDE[position].label) });
      expect(image).toHaveAccessibleName(/실제 동작 시범이 아닙니다/);
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 180 110');
      expect(container.querySelectorAll('animate, animateTransform')).toHaveLength(0);
    },
  );

  it('connects requested muscles to numbered posterior regions and retains the ambiguous spine tag', () => {
    render(<PostureAnatomyGuide exercise={exercise} />);
    const region = screen.getByRole('region', { name: '자세·부위 한눈에' });
    const map = within(region).getByRole('img', { name: /부위 지도/ });
    expect(map).toHaveAccessibleName(
      /1번 엉덩이 뒤, 뒷면.*2번 허벅지 뒤, 뒷면.*3번 척추 주변, 뒷면/,
    );
    const legend = within(region).getByRole('list', { name: '부위 그림과 태그 연결' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
    for (const tag of exercise.targetMuscles) expect(legend).toHaveTextContent(tag);
    expect(region).toHaveTextContent('전문가가 검증한 시범이 아닙니다');
    fireEvent.click(within(region).getByText('부위의 역할·그림의 한계·참고 자료'));
    expect(region).toHaveTextContent('특정 해부학 근육명으로 확정하지 않음');
    expect(region).toHaveTextContent('대부분 고관절 폄에도 관여');
    expect(within(region).getAllByRole('link')).toHaveLength(4);
  });

  it('distinguishes muscles instead of using gluteal substring matches or front/back guesses', () => {
    const result = mapAnatomyTags([
      '둔근',
      '중둔근',
      '대둔근',
      '심부경추굴곡근',
      '상완삼두근',
      '후면삼각근',
      '요방형근',
      '대퇴근막장근',
    ]);
    expect(result.mapped.map((tag) => tag.region)).toEqual([
      'glute',
      'side-hip',
      'glute',
      'neck-front',
      'arms-back',
      'shoulder-back',
      'waist-back',
      'side-hip-front',
    ]);
    expect(result.mapped[0].note).toContain('대둔근 하나로 확정하지 않음');
    expect(ANATOMY_REGIONS['neck-front'].view).toBe('front');
    expect(ANATOMY_REGIONS['arms-back'].view).toBe('back');
  });

  it('preserves unmapped tags, distinguishes goals, and does not infer contractions from relaxation tags', () => {
    const tags = [
      ' 중둔근 ',
      '중둔근',
      '햄스트링 이완',
      '대둔근과 별개 태그',
      '호흡',
      '균형',
      '',
      '새로운'.repeat(100),
    ];
    const original = [...tags];
    const result = mapAnatomyTags(tags);
    expect(result.mapped).toHaveLength(2);
    expect(result.mapped[1].label).toBe('햄스트링 이완');
    expect(result.mapped[1].note).toContain('이완·스트레칭 메모');
    expect(result.unmapped).toEqual(['대둔근과 별개 태그', '새로운'.repeat(100)]);
    expect(result.nonAnatomical).toEqual(['호흡', '균형']);
    expect(tags).toEqual(original);
    render(<PostureAnatomyGuide exercise={{ ...exercise, targetMuscles: tags }} compact />);
    expect(screen.getByText('대둔근과 별개 태그 · ' + '새로운'.repeat(100))).toBeInTheDocument();
    expect(screen.getByText('특정 근육 하나에 연결하지 않았어요.')).toBeInTheDocument();
  });

  it('treats inherited property names as unknown text', () => {
    expect(mapAnatomyTags(['constructor', '__proto__', 'toString']).unmapped).toEqual([
      'constructor',
      '__proto__',
      'toString',
    ]);
  });

  it('covers every original catalog posture and regional tag without creating new muscle claims', () => {
    for (const item of ORIGINAL_MOVEMENTS) {
      expect(POSTURE_GUIDE[item.bodyPosition]).toBeDefined();
      expect(mapAnatomyTags(item.targetMuscles).unmapped).toEqual([]);
    }
  });

  it('shows all recorded spinal directions once and leaves the selected exercise unchanged', () => {
    const item = {
      ...exercise,
      spinalPlanes: [...Object.keys(SPINE_GUIDE), 'flexion'] as SpinalPlane[],
    };
    const before = structuredClone(item);
    render(<PostureAnatomyGuide exercise={item} />);
    const planes = screen.getByLabelText('계획에 기록된 척추 방향');
    expect(planes.querySelectorAll('svg')).toHaveLength(5);
    for (const plane of Object.values(SPINE_GUIDE))
      expect(planes).toHaveTextContent(plane.description);
    expect(item).toEqual(before);
  });

  it('handles empty tags and repeated mounting with unique accessible image IDs', () => {
    const { container } = render(
      <>
        <PostureAnatomyGuide exercise={{ ...exercise, targetMuscles: [], spinalPlanes: [] }} />
        <PostureAnatomyGuide exercise={exercise} compact />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(screen.getByText(/표시할 부위 정보가 없어요/)).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: '자세·부위 한눈에' })).toHaveLength(2);
  });
});
