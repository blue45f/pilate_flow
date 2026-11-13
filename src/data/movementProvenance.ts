import type { PilatesExercise } from '../types/pilates';
import { parseYouTubeReference } from '../schemas/pilatesSchema';
import { getExpandedMovementSource } from './expandedMovements';
import { getExerciseSourcePageReferences, getExerciseVideoEvidence } from './exerciseVideoBindings';

export interface MovementProvenance {
  kind: 'original' | 'manual' | 'legacy';
  label: string;
  shortLabel: string;
  description: string;
  rights: string;
}

export function getMovementProvenance(exercise: PilatesExercise): MovementProvenance {
  if (exercise.id.startsWith('expanded-')) {
    const source = getExpandedMovementSource(exercise);
    return {
      kind: 'legacy',
      label: source ? '제작자 원문·영상 제목 확인' : '입력 링크·내용 미확인',
      shortLabel: source ? '제작자 자료 · 메타데이터 확인' : '입력 링크 · 재확인 필요',
      description: source
        ? `${source.checkedAt}에 제작자 페이지와 YouTube 제목·채널을 확인한 자료입니다. 전체 영상 재생, 단계별 동작 그림, 개인별 적합성 검수는 포함하지 않습니다.`
        : '등록된 기구나 영상 연결이 확인 당시의 자료와 다릅니다. 현재 링크와 내용을 다시 확인해 주세요.',
      rights:
        '제작자 원문 링크와 공식 영상 플레이어로 참조합니다. 영상의 권리는 제작자에게 있습니다.',
    };
  }
  if (exercise.id.startsWith('original-')) {
    const videoEvidence = getExerciseVideoEvidence(exercise);
    const sourcePages = getExerciseSourcePageReferences(exercise);
    const hasInputLink = Boolean(exercise.youtube.url.trim());
    return {
      kind: 'original',
      label: videoEvidence
        ? '직접 작성 · 관련 영상 메타데이터 대조'
        : hasInputLink
          ? '직접 작성 · 입력 영상 미확인'
          : sourcePages.length
            ? '직접 작성 · 공개 원문 참조'
            : '직접 작성 · 원본 영상 출처 없음',
      shortLabel: '오리지널 계획 자료',
      description:
        '앱에서 직접 작성한 수업 계획용 이름·태그·큐입니다. 전문가가 자세 정확성이나 개인별 적합성을 검증한 자료가 아닙니다.' +
        (videoEvidence
          ? ` ${videoEvidence.relationshipNoteKo} 제목·출처 메타데이터만 대조했으며 실제 재생·동일 시범·정확한 구간은 미검수입니다.`
          : sourcePages.length
            ? ' 공개 원문의 설명을 참조하며 실제 영상 재생이나 동일 동작 시범을 검수하지 않았습니다.'
            : ''),
      rights:
        '설명과 기구 도식은 이 앱을 위해 직접 작성했습니다. 도식은 기구를 구분하는 그림이며 동작 시범이 아닙니다. 외부 참조의 권리는 원 제작자에게 있습니다.',
    };
  }
  const videoEvidence = getExerciseVideoEvidence(exercise);
  if (videoEvidence) {
    return {
      kind: 'manual',
      label: '수집 계획 · 개별 영상 제목·출처 대조',
      shortLabel: '수집 자료 · 메타데이터 대조',
      description: `${videoEvidence.relationshipNoteKo} 실제 영상 재생·동일 시범·시작과 종료 구간·전문가 검수는 포함하지 않습니다.`,
      rights: '외부 원문 링크와 공식 플레이어를 제공하며 영상의 권리는 원 제작자에게 있습니다.',
    };
  }
  if (!exercise.youtube.videoId && getExerciseSourcePageReferences(exercise).length) {
    return {
      kind: 'manual',
      label: '공개 원문 본문 확인 · 영상 연결 미확인',
      shortLabel: '원문 참조 · 영상 미연결',
      description:
        '동작 설명과 연결 단계에 관한 공개 원문을 참조합니다. 정확한 영상 ID와 실제 재생·동작 구간은 확인하지 않았습니다.',
      rights: '원문 링크만 제공합니다. 외부 이미지와 영상을 복제하지 않습니다.',
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
    label: '기존 자료 · 출처 대조 확인',
    shortLabel: '출처 대조 확인',
    description:
      '카탈로그 원장 및 공개 출처 대조를 거친 참조 자료입니다. 수업 적용 전 현장 기구 세팅과 대상자 상태를 확인해 주세요.',
    rights:
      '공개 원문 링크와 카탈로그 대조 정보를 제공하며, 썸네일이나 영상 파일은 별도로 복제·보관하지 않습니다.',
  };
}

export function getMovementVideoLink(exercise: PilatesExercise): string | null {
  const reference = parseYouTubeReference(exercise.youtube.url);
  if (!reference || reference.videoId !== exercise.youtube.videoId) return null;
  const start = Math.max(0, Math.floor(exercise.youtube.startSec || 0));
  return `${reference.url}&t=${start}s`;
}
