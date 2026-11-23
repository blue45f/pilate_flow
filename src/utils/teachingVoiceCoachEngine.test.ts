import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeTeachingTranscript,
  compareWithPreviousCoachEntry,
  isBrowserSpeechRecognitionSupported,
  KOREAN_FILLER_WORDS,
  loadTeachingCoachHistory,
  MAX_TEACHING_COACH_HISTORY_ENTRIES,
  SAMPLE_TEACHING_SCRIPTS,
  sanitizeTeachingCoachText,
  saveTeachingCoachEntry,
  TEACHING_COACH_HISTORY_KEY,
} from './teachingVoiceCoachEngine';

describe('teachingVoiceCoachEngine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    const win = window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('빈 발화 입력을 안전하게 처리한다', () => {
    const result = analyzeTeachingTranscript({ transcript: '   ', durationSec: 60 });
    expect(result.wordsPerMinute).toBe(0);
    expect(result.syllablesPerMinute).toBe(0);
    expect(result.totalFillers).toBe(0);
    expect(result.fillerCounts).toEqual([]);
    expect(result.cueBalance).toEqual({
      breathCount: 0,
      alignmentCount: 0,
      encouragementCount: 0,
      breathRatio: 0,
      alignmentRatio: 0,
      encouragementRatio: 0,
    });
    expect(result.overallScore).toBe(0);
    expect(result.coachingTipsKo.length).toBeGreaterThanOrEqual(1);
  });

  it('발화 속도에 따라 calm / fast / slow 템포를 정확히 판별한다', () => {
    const calmSample = SAMPLE_TEACHING_SCRIPTS.find((s) => s.id === 'calm-reformer');
    const fastSample = SAMPLE_TEACHING_SCRIPTS.find((s) => s.id === 'fast-filler-rehearsal');
    expect(calmSample).toBeDefined();
    expect(fastSample).toBeDefined();

    const calmAnalysis = analyzeTeachingTranscript({
      transcript: calmSample!.transcript,
      durationSec: calmSample!.durationSec,
      pauseCount: calmSample!.pauseCount,
    });
    expect(calmAnalysis.paceRating).toBe('calm');
    expect(calmAnalysis.syllablesPerMinute).toBeGreaterThanOrEqual(140);
    expect(calmAnalysis.syllablesPerMinute).toBeLessThanOrEqual(255);
    expect(calmAnalysis.strengthsKo).toHaveLength(2);
    expect(calmAnalysis.coachingTipsKo.length).toBeLessThanOrEqual(3);

    const fastAnalysis = analyzeTeachingTranscript({
      transcript: fastSample!.transcript,
      durationSec: fastSample!.durationSec,
      pauseCount: fastSample!.pauseCount,
    });
    expect(fastAnalysis.paceRating).toBe('fast');
    expect(fastAnalysis.syllablesPerMinute).toBeGreaterThan(255);
    expect(fastAnalysis.overallScore).toBeLessThan(calmAnalysis.overallScore);

    const slowAnalysis = analyzeTeachingTranscript({
      transcript: '코로 천천히 숨을 마시고 골반 중립을 느껴볼게요. 아주 좋아요.',
      durationSec: 60,
    });
    expect(slowAnalysis.paceRating).toBe('slow');
    expect(slowAnalysis.syllablesPerMinute).toBeLessThan(140);
  });

  it('9종 한국어 필라테스 습관어를 집계하고 일반 단어(자세·어깨·다음) 오탐을 차단한다', () => {
    const transcript =
      '자, 어, 음... 이제 약간만 어깨를 내리고 자연스러운 자세를 잡아요. 다음 호흡에 조금씩 한번 가볼게요. 그냥 일단 한 번 더 복부를 지켜주세요.';
    const analysis = analyzeTeachingTranscript({
      transcript,
      durationSec: 60,
    });

    const countByWord = new Map(analysis.fillerCounts.map((item) => [item.word, item.count]));
    for (const filler of KOREAN_FILLER_WORDS) {
      expect(countByWord.get(filler), `습관어 '${filler}' 누락`).toBeGreaterThanOrEqual(1);
    }

    // '자세', '자연스러운'이 '자'로, '어깨를'이 '어'로, '다음'이 '음'으로 오탐되지 않아야 한다.
    expect(countByWord.get('자')).toBe(1);
    expect(countByWord.get('어')).toBe(1);
    expect(countByWord.get('음')).toBe(1);
    expect(countByWord.get('한번')).toBe(2); // '한번' + '한 번'
    expect(analysis.totalFillers).toBe(10);
    expect(analysis.fillerRatePerMin).toBe(10);
  });

  it('호흡·정렬·격려 큐 개수와 비율(합계 1.0)을 정확히 계산한다', () => {
    const transcript =
      '코로 마시고 내쉬는 숨에 흉곽과 갈비뼈를 감싸요. 골반 중립, 어깨와 견갑, 척추와 복부 코어, 무릎과 발목 정렬을 유지합니다. 아주 좋아요, 천천히 부드럽게 편안하게 잘하셨어요, 멋져요.';
    const analysis = analyzeTeachingTranscript({ transcript, durationSec: 60 });

    expect(analysis.cueBalance.breathCount).toBe(5);
    expect(analysis.cueBalance.alignmentCount).toBe(10);
    expect(analysis.cueBalance.encouragementCount).toBe(7);

    const ratioSum =
      analysis.cueBalance.breathRatio +
      analysis.cueBalance.alignmentRatio +
      analysis.cueBalance.encouragementRatio;
    expect(ratioSum).toBeCloseTo(1, 3);
    expect(analysis.cueBalance.breathRatio).toBeGreaterThan(0);
    expect(analysis.cueBalance.alignmentRatio).toBeGreaterThan(0);
    expect(analysis.cueBalance.encouragementRatio).toBeGreaterThan(0);
  });

  it('3종 기본 샘플 스크립트가 서로 뚜렷한 티칭 패턴을 보여준다', () => {
    expect(SAMPLE_TEACHING_SCRIPTS).toHaveLength(3);

    const [calm, fast, exemplar] = SAMPLE_TEACHING_SCRIPTS.map((script) =>
      analyzeTeachingTranscript({
        transcript: script.transcript,
        durationSec: script.durationSec,
        pauseCount: script.pauseCount,
        sequenceTitle: script.sequenceTitle,
      }),
    );

    expect(calm.paceRating).toBe('calm');
    expect(fast.paceRating).toBe('fast');
    expect(fast.totalFillers).toBeGreaterThanOrEqual(15);

    expect(exemplar.paceRating).toBe('calm');
    expect(exemplar.totalFillers).toBe(0);
    expect(exemplar.overallScore).toBeGreaterThanOrEqual(90);
    expect(exemplar.overallScore).toBeGreaterThan(fast.overallScore);
    expect(exemplar.strengthsKo).toHaveLength(2);
    expect(exemplar.coachingTipsKo.length).toBeGreaterThanOrEqual(1);
    expect(exemplar.coachingTipsKo.length).toBeLessThanOrEqual(3);
  });

  it('SpeechRecognition / webkitSpeechRecognition 브라우저 지원 여부를 판별한다', () => {
    expect(isBrowserSpeechRecognitionSupported()).toBe(false);

    const win = window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    win.webkitSpeechRecognition = class MockWebkitSpeech {};
    expect(isBrowserSpeechRecognitionSupported()).toBe(true);

    delete win.webkitSpeechRecognition;
    win.SpeechRecognition = class MockStandardSpeech {};
    expect(isBrowserSpeechRecognitionSupported()).toBe(true);
  });

  it('로컬 저장 시 회원 실명·연락처·이메일을 자동 제거하고 최근 10건만 유지한다', () => {
    const clean = sanitizeTeachingCoachText(
      '김민지 회원님 010-1234-5678, test@example.com 선생님 안내처럼 호흡을 마시고 골반 중립 유지해요.',
    );
    expect(clean.redacted).toBe(true);
    expect(clean.sanitized).not.toContain('김민지');
    expect(clean.sanitized).not.toContain('010-1234-5678');
    expect(clean.sanitized).not.toContain('test@example.com');
    expect(clean.sanitized).toContain('선생님');

    const sampleScript = SAMPLE_TEACHING_SCRIPTS[0];
    const analysis = analyzeTeachingTranscript({
      transcript: sampleScript.transcript,
      durationSec: sampleScript.durationSec,
    });

    for (let i = 1; i <= 12; i += 1) {
      const saved = saveTeachingCoachEntry({
        sample: {
          transcript: `이서연 회원님 010-9876-5432 ${sampleScript.transcript}`,
          durationSec: 60,
          sequenceTitle: `리허설 ${i}`,
        },
        analysis,
        savedAt: `2026-11-23T10:${String(i).padStart(2, '0')}:00.000Z`,
      });
      expect(saved.ok).toBe(true);
      expect(saved.redactedPersonalInfo).toBe(true);
    }

    const loaded = loadTeachingCoachHistory();
    expect(loaded).toHaveLength(MAX_TEACHING_COACH_HISTORY_ENTRIES);
    expect(loaded[0].sequenceTitle).toBe('리허설 12');
    expect(loaded[9].sequenceTitle).toBe('리허설 3');

    const rawStored = window.localStorage.getItem(TEACHING_COACH_HISTORY_KEY) ?? '';
    expect(rawStored).not.toContain('이서연');
    expect(rawStored).not.toContain('010-9876-5432');
  });

  it('저장 공간 초과나 손상된 JSON 상황에서도 예외 없이 정직하게 복구한다', () => {
    window.localStorage.setItem(TEACHING_COACH_HISTORY_KEY, '{broken-json');
    expect(loadTeachingCoachHistory()).toEqual([]);

    const quotaStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
    };
    const analysis = analyzeTeachingTranscript({
      transcript: SAMPLE_TEACHING_SCRIPTS[2].transcript,
      durationSec: 60,
    });
    const failedSave = saveTeachingCoachEntry(
      {
        sample: {
          transcript: SAMPLE_TEACHING_SCRIPTS[2].transcript,
          durationSec: 60,
          sequenceTitle: '모범 리허설',
        },
        analysis,
      },
      quotaStorage,
    );

    expect(failedSave.ok).toBe(false);
    expect(failedSave.errorKo).toContain('저장');
  });

  it('직전 저장 리포트와의 비교 변화량을 계산한다', () => {
    const fastAnalysis = analyzeTeachingTranscript({
      transcript: SAMPLE_TEACHING_SCRIPTS[1].transcript,
      durationSec: SAMPLE_TEACHING_SCRIPTS[1].durationSec,
    });
    const saved = saveTeachingCoachEntry({
      sample: {
        transcript: SAMPLE_TEACHING_SCRIPTS[1].transcript,
        durationSec: SAMPLE_TEACHING_SCRIPTS[1].durationSec,
        sequenceTitle: '첫 리허설',
      },
      analysis: fastAnalysis,
    });

    const exemplarAnalysis = analyzeTeachingTranscript({
      transcript: SAMPLE_TEACHING_SCRIPTS[2].transcript,
      durationSec: SAMPLE_TEACHING_SCRIPTS[2].durationSec,
    });

    const comparison = compareWithPreviousCoachEntry(exemplarAnalysis, saved.entry);
    expect(comparison).not.toBeNull();
    expect(comparison!.scoreDelta).toBeGreaterThan(0);
    expect(comparison!.fillerRateDelta).toBeLessThan(0);
  });
});
