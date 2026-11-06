import type { PilatesExercise } from '../types/pilates';
import { parseYouTubeReference } from '../schemas/pilatesSchema';

export interface MovementProvenance {
  kind: 'original' | 'manual' | 'legacy';
  label: string;
  shortLabel: string;
  description: string;
  rights: string;
}

export function getMovementProvenance(exercise: PilatesExercise): MovementProvenance {
  if (exercise.id.startsWith('original-')) {
    return {
      kind: 'original',
      label: '직접 작성 · 원본 영상 출처 없음',
      shortLabel: '오리지널 계획 자료',
      description:
        '앱에서 직접 작성한 수업 계획용 이름·태그·큐입니다. 전문가가 자세 정확성이나 개인별 적합성을 검증한 자료가 아닙니다.',
      rights:
        '설명과 기구 도식은 이 앱을 위해 직접 작성했습니다. 도식은 기구를 구분하는 그림이며 동작 시범이 아닙니다.',
    };
  }
  if (
    exercise.id.startsWith('ex-custom-own-') &&
    !exercise.sourceReference &&
    !exercise.youtube.url.trim()
  ) {
    return {
      kind: 'manual',
      label: '강사 직접 작성 · 외부 출처 없음',
      shortLabel: '내가 직접 작성한 동작',
      description:
        '사용자가 직접 입력한 동작과 수업 계획 메모입니다. 외부 영상 출처를 등록하지 않았으며, 직접 작성했다는 사실이 동작의 적합성 검수나 강사 자격 인증을 의미하지 않습니다.',
      rights:
        '직접 작성한 계획 내용입니다. 실제 강사 검토 기록은 아래에서 별도로 확인하며, 외부 기관의 자격 인증이나 의학적 승인으로 표시하지 않습니다.',
    };
  }
  if (exercise.isCustom) {
    return {
      kind: 'manual',
      label: '직접 등록 · 출처 자동 미확인',
      shortLabel: '내가 등록한 참고 자료',
      description:
        '사용자가 입력한 링크와 메모입니다. 영상의 존재·내용·채널 정보는 자동 확인하지 않았습니다. 구간과 계획 시간은 다를 수 있습니다.',
      rights:
        '영상의 권리는 원 권리자에게 있습니다. 링크와 공식 플레이어로 참조하며 영상 파일을 보관하지 않습니다.',
    };
  }
  return {
    kind: 'legacy',
    label: '기존 자료 · 출처 미검증',
    shortLabel: '출처 미검증',
    description:
      '이전 버전에서 가져온 자료입니다. 채널명·영상 제목·타임스탬프·동작 설명의 일치 여부와 정확성을 검증하지 않았습니다. 수업 전에 원본과 설정을 확인해 주세요.',
    rights:
      '기존 출처 표시는 검증 전 정보입니다. 공개된 링크가 설명·영상의 재사용 허가를 의미하지 않습니다. 썸네일이나 영상 파일은 복사하지 않습니다.',
  };
}

export function getMovementVideoLink(exercise: PilatesExercise): string | null {
  const reference = parseYouTubeReference(exercise.youtube.url);
  if (!reference || reference.videoId !== exercise.youtube.videoId) return null;
  const start = Math.max(0, Math.floor(exercise.youtube.startSec || 0));
  return `${reference.url}&t=${start}s`;
}
