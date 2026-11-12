export type LiveHandsfreeCommandKind =
  | 'pause'
  | 'resume'
  | 'toggle-play'
  | 'next-step'
  | 'prev-step'
  | 'extend-15s'
  | 'extend-30s'
  | 'extend-60s'
  | 'trim-30s'
  | 'undo'
  | 'toggle-cuesheet'
  | 'jump-main'
  | 'jump-cooldown';

export interface ParsedLiveCommand {
  kind: LiveHandsfreeCommandKind;
  labelKo: string;
  source: 'voice' | 'remote-key';
  rawTrigger: string;
}

export interface HandsfreeCommandReferenceItem {
  categoryKo: '타이머·이동' | '시간 미세 조절' | '구간·큐시트';
  voicePhrasesKo: string;
  remoteKeysKo: string;
  effectKo: string;
}

export const LIVE_HANDSFREE_COMMAND_GUIDE: readonly HandsfreeCommandReferenceItem[] = [
  {
    categoryKo: '타이머·이동',
    voicePhrasesKo: '“시작 / 재생”, “일시정지 / 멈춰”',
    remoteKeysKo: 'Space · Play/Pause · P',
    effectKo: '타이머 시작·일시정지 전환',
  },
  {
    categoryKo: '타이머·이동',
    voicePhrasesKo: '“다음 / 다음 동작”, “이전 / 뒤로”',
    remoteKeysKo: '→ / PageDown / . (다음) · ← / PageUp / , (이전)',
    effectKo: '블루투스 포인터·풋페달·키보드로 이전/다음 동작 이동',
  },
  {
    categoryKo: '시간 미세 조절',
    voicePhrasesKo: '“15초 추가”, “30초 추가”, “1분 추가”, “30초 줄이기”',
    remoteKeysKo: '] (+15초) · + / = (+30초) · - (-30초)',
    effectKo: '티칭 흐름 끊김 없이 현재 동작/휴식 시간 즉시 가감',
  },
  {
    categoryKo: '구간·큐시트',
    voicePhrasesKo: '“큐시트”, “본운동 구간”, “마무리 구간”, “되돌리기”',
    remoteKeysKo: 'C (큐시트) · Backspace (되돌리기)',
    effectKo: '전체 큐시트 토글, 본운동/쿨다운 점프, 직전 조작 복구',
  },
];

/**
 * Parses a Korean or English Web Speech transcript into a deterministic stage command.
 * Ordered from most specific (e.g., 15s/30s/1min extensions) to general movement words.
 */
export function parseLiveVoiceCommand(rawTranscript: string): ParsedLiveCommand | null {
  const normalized = rawTranscript.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();

  if (/15\s*초\s*(추가|연장|더)|\+15\s*초|십오\s*초\s*(추가|연장)|add\s*15/i.test(lower)) {
    return {
      kind: 'extend-15s',
      labelKo: '현재 구간 15초 연장',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/30\s*초\s*(줄이|감소|단축)|-30\s*초|삼십\s*초\s*줄이|trim\s*30/i.test(lower)) {
    return {
      kind: 'trim-30s',
      labelKo: '현재 구간 30초 단축',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/30\s*초\s*(추가|연장|더)|\+30\s*초|삼십\s*초\s*(추가|연장)|조금\s*더\s*연장|add\s*30/i.test(lower)) {
    return {
      kind: 'extend-30s',
      labelKo: '현재 구간 30초 연장',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/1\s*분\s*(추가|연장)|\+1\s*분|일\s*분\s*(추가|연장)|시간\s*추가|add\s*(one\s*|1\s*)?minute/i.test(lower)) {
    return {
      kind: 'extend-60s',
      labelKo: '현재 구간 1분 추가',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/일시\s*정지|정지|멈춤|멈춰|스톱|잠깐|pause|stop|hold/i.test(lower)) {
    return {
      kind: 'pause',
      labelKo: '일시정지',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/수업\s*시작|다시\s*시작|시작|재생|계속|출발|resume|start|play/i.test(lower)) {
    return {
      kind: 'resume',
      labelKo: '타이머 시작·재개',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/되돌리기|원래\s*위치|복구|취소|undo/i.test(lower)) {
    return {
      kind: 'undo',
      labelKo: '직전 조작 복구',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/큐\s*시트|큐\s*열기|큐\s*닫기|큐\s*보여|큐\s*숨겨|전체\s*순서|cue\s*sheet/i.test(lower)) {
    return {
      kind: 'toggle-cuesheet',
      labelKo: '전체 큐시트 토글',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/본\s*운동\s*구간|본\s*운동으로|메인\s*구간|main\s*section/i.test(lower)) {
    return {
      kind: 'jump-main',
      labelKo: '본운동 구간 이동',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/마무리\s*구간|쿨\s*다운|마무리로|스트레칭\s*구간|cool\s*down/i.test(lower)) {
    return {
      kind: 'jump-cooldown',
      labelKo: '마무리 구간 이동',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/다음\s*동작|다음으로|다음|넘기기|스킵|next/i.test(lower)) {
    return {
      kind: 'next-step',
      labelKo: '다음 동작 이동',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  if (/이전\s*동작|이전으로|이전|뒤로|앞\s*동작|previous|prev|back/i.test(lower)) {
    return {
      kind: 'prev-step',
      labelKo: '이전 동작 이동',
      source: 'voice',
      rawTrigger: normalized,
    };
  }

  return null;
}

/**
 * Maps keyboard, Bluetooth presentation clicker (PageDown/PageUp/.), foot-pedal, and media keys
 * to deterministic Live Stage commands.
 */
export function parseLiveRemoteKey(input: {
  key: string;
  code?: string;
}): ParsedLiveCommand | null {
  const { key, code = '' } = input;

  if (
    code === 'Space' ||
    key === ' ' ||
    key === 'MediaPlayPause' ||
    code === 'MediaPlayPause' ||
    key === 'p' ||
    key === 'P'
  ) {
    return {
      kind: 'toggle-play',
      labelKo: '리모컨/키보드 재생·일시정지',
      source: 'remote-key',
      rawTrigger: key === ' ' ? 'Space' : key,
    };
  }

  if (key === 'MediaPause' || code === 'MediaPause') {
    return {
      kind: 'pause',
      labelKo: '미디어 일시정지',
      source: 'remote-key',
      rawTrigger: 'MediaPause',
    };
  }

  if (key === 'MediaPlay' || code === 'MediaPlay') {
    return {
      kind: 'resume',
      labelKo: '미디어 재생',
      source: 'remote-key',
      rawTrigger: 'MediaPlay',
    };
  }

  if (
    key === 'ArrowRight' ||
    key === 'PageDown' ||
    key === 'MediaTrackNext' ||
    code === 'MediaTrackNext' ||
    key === '.'
  ) {
    return {
      kind: 'next-step',
      labelKo:
        key === 'PageDown' || key === 'MediaTrackNext' || key === '.'
          ? '블루투스 리모컨 다음 동작'
          : '다음 동작',
      source: 'remote-key',
      rawTrigger: key,
    };
  }

  if (
    key === 'ArrowLeft' ||
    key === 'PageUp' ||
    key === 'MediaTrackPrevious' ||
    code === 'MediaTrackPrevious' ||
    key === ','
  ) {
    return {
      kind: 'prev-step',
      labelKo:
        key === 'PageUp' || key === 'MediaTrackPrevious' || key === ','
          ? '블루투스 리모컨 이전 동작'
          : '이전 동작',
      source: 'remote-key',
      rawTrigger: key,
    };
  }

  if (key === ']' || code === 'BracketRight') {
    return {
      kind: 'extend-15s',
      labelKo: '현재 구간 +15초 연장',
      source: 'remote-key',
      rawTrigger: ']',
    };
  }

  if (key === '+' || key === '=' || code === 'Equal' || code === 'NumpadAdd') {
    return {
      kind: 'extend-30s',
      labelKo: '현재 구간 +30초 연장',
      source: 'remote-key',
      rawTrigger: key,
    };
  }

  if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
    return {
      kind: 'trim-30s',
      labelKo: '현재 구간 -30초 단축',
      source: 'remote-key',
      rawTrigger: key,
    };
  }

  if (key === 'c' || key === 'C') {
    return {
      kind: 'toggle-cuesheet',
      labelKo: '전체 큐시트 토글',
      source: 'remote-key',
      rawTrigger: key.toUpperCase(),
    };
  }

  if (key === 'Backspace') {
    return {
      kind: 'undo',
      labelKo: '직전 조작 복구',
      source: 'remote-key',
      rawTrigger: 'Backspace',
    };
  }

  return null;
}
