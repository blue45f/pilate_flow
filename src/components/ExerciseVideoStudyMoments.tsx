import { formatSecondsToMMSS } from '../utils/sequenceEngine';

interface StudyMoment {
  second: number;
  cue: string;
}

interface StudySource {
  source: 'chapter' | 'playback' | 'caption';
  moments: StudyMoment[];
}

// Chapter times come from the publisher's description. Playback observations
// are documented with the original links in docs/research/2026-11-19-video-playback.md.
const studySources: Record<string, StudySource> = {
  M2Y9FWJYO0k: {
    source: 'caption',
    moments: [
      {
        second: 242,
        cue: '누워서 골반을 편안하게 두고, 숨을 들이쉴 때 갈비뼈가 양옆으로 넓어지는지 느껴 봐요.',
      },
    ],
  },
  '9v6mYwGxnuE': {
    source: 'caption',
    moments: [
      {
        second: 68,
        cue: '서서 하는 런지부터 시작해요. 한쪽 무릎을 굽혀 내려갔다가 뒤꿈치로 지지하며 일어서요.',
      },
    ],
  },
  Y0XdJQkqBrU: {
    source: 'caption',
    moments: [
      {
        second: 77,
        cue: '강사가 손을 좌석 양옆에 짚고 두 발을 페달에 올리는 순서를 말로 설명해요.',
      },
    ],
  },
  '3GBwBBt63Xw': {
    source: 'chapter',
    moments: [
      { second: 41, cue: '골반을 앞뒤로 작게 기울여요.' },
      { second: 147, cue: '이번에는 오른쪽과 왼쪽으로 움직여요.' },
      { second: 243, cue: '앞뒤와 좌우 움직임을 이어 원을 그려요.' },
      { second: 321, cue: '반대 방향으로도 돌아보세요.' },
    ],
  },
  '73TP6x-OtIk': {
    source: 'chapter',
    moments: [
      { second: 56, cue: '헌드레드 기본 자세를 살펴봐요.' },
      { second: 138, cue: '강사가 난이도를 낮추는 방법을 소개해요.' },
      { second: 219, cue: '익숙해진 뒤에 시도하는 변형을 볼 수 있어요.' },
    ],
  },
  'IZaOcdYl-Ec': {
    source: 'playback',
    moments: [
      { second: 29, cue: '양손으로 발목을 잡고 다리를 든 채 균형을 잡다가 등 쪽으로 굴러가요.' },
    ],
  },
  JWjHmpg6aXI: {
    source: 'playback',
    moments: [
      { second: 10, cue: '박스에 엎드려 내렸던 팔을 엉덩이 옆으로 당길 때 가슴도 함께 올라와요.' },
    ],
  },
  GpQQX2XEEP8: {
    source: 'playback',
    moments: [
      {
        second: 161,
        cue: '테이블에 등을 대고 누워 위쪽 프레임에 매달린 스트랩에 발을 건 자세를 볼 수 있어요.',
      },
    ],
  },
  Xg2Y7681Tl8: {
    source: 'playback',
    moments: [
      {
        second: 581,
        cue: '한 발을 좌석에 두고 반대 발을 페달 쪽으로 보내요. 몸을 낮출 때 지지하는 무릎을 살펴보세요.',
      },
    ],
  },
  'waGj9pn2e-U': {
    source: 'playback',
    moments: [
      {
        second: 315,
        cue: '바렐에 걸터앉아 몸통을 기울인 채 양팔을 머리 위로 든 자세를 볼 수 있어요.',
      },
    ],
  },
  bV3bdRsTRVM: {
    source: 'playback',
    moments: [
      {
        second: 80,
        cue: '프레임 옆에 서서 발 사이를 넓히고 팔을 바깥으로 보내면 스프링이 대각선으로 펴져요.',
      },
    ],
  },
  U7g6fBvJSAI: {
    source: 'playback',
    moments: [
      { second: 103, cue: '등을 바렐에 대고 양손을 머리 너머로 보냈다가 몸 옆으로 돌아와요.' },
    ],
  },
};

export function ExerciseVideoStudyMoments({
  videoId,
  startSec = 0,
  endSec,
}: {
  videoId: string;
  startSec?: number;
  endSec?: number;
}) {
  const source = Object.hasOwn(studySources, videoId) ? studySources[videoId] : undefined;
  if (!source) return null;
  const moments = source.moments.filter(
    ({ second }) => second >= startSec && (endSec === undefined || second < endSec),
  );
  if (!moments.length) return null;
  return (
    <div>
      <dt>
        {source.source === 'chapter'
          ? '제작자가 나눈 구간'
          : source.source === 'caption'
            ? '자동 자막에서 확인한 설명'
            : '재생해서 확인한 장면'}
      </dt>
      <dd>
        {moments.map(({ second, cue }) => (
          <p key={second}>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}&t=${second}s`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${formatSecondsToMMSS(second)}부터 YouTube에서 보기. ${cue}`}
            >
              {formatSecondsToMMSS(second)}
            </a>{' '}
            {cue}
          </p>
        ))}
      </dd>
    </div>
  );
}
