import { describe, expect, it } from 'vitest';
import { parseManualChapters, parseReferenceTime, parseYouTubeReference } from './pilatesSchema';

const id = 'AbCdEf_12-3';
describe('manual YouTube reference validation', () => {
  it('accepts supported official video URL forms and produces a canonical link', () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${id}&t=25s`,
      `https://youtu.be/${id}`,
      `https://m.youtube.com/shorts/${id}`,
      `https://youtube.com/live/${id}`,
      `https://youtube.com/embed/${id}`,
    ]) {
      expect(parseYouTubeReference(url)).toEqual({
        videoId: id,
        url: `https://www.youtube.com/watch?v=${id}`,
      });
    }
  });
  it('rejects lookalike hosts, credentials, unsupported protocols and malformed IDs', () => {
    for (const url of [
      `https://youtube.com.evil.test/watch?v=${id}`,
      `https://notyoutube.com/watch?v=${id}`,
      `https://evil.test/?v=${id}`,
      `https://youtube.com@evil.test/watch?v=${id}`,
      `https://user@youtube.com/watch?v=${id}`,
      `javascript:youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=short`,
      `https://youtu.be/${id}extra`,
      `https://youtu.be/${id}/other`,
      'not a url',
    ]) {
      expect(parseYouTubeReference(url)).toBeNull();
    }
  });
  it('parses timestamps with bounded seconds and rejects invalid times', () => {
    expect(parseReferenceTime('03:20')).toBe(200);
    expect(parseReferenceTime('01:02:03')).toBe(3723);
    expect(parseReferenceTime('00:00')).toBe(0);
    for (const time of ['03:99', '01:60:00', '-1:30', '2', '1:2', '25:00:00'])
      expect(parseReferenceTime(time)).toBeNull();
  });
  it('reads only entered titles and timestamps, without inferring movement instructions', () => {
    expect(parseManualChapters('00:00 준비\n03:20 임의 제목 (2R)')).toEqual({
      chapters: [
        { startSec: 0, title: '준비' },
        { startSec: 200, title: '임의 제목 (2R)' },
      ],
      error: null,
    });
  });
  it('rejects reversed, duplicate or malformed chapter lines rather than silently importing them', () => {
    for (const text of [
      '03:20 첫 구간\n02:10 다음 구간',
      '00:00 준비\n00:00 중복',
      '00:80 잘못된 시간',
      '설명만 있는 줄',
      '00:00 준비\n이 줄도 오류',
    ]) {
      const parsed = parseManualChapters(text);
      expect(parsed.chapters).toEqual([]);
      expect(parsed.error).toBeTruthy();
    }
  });
});
