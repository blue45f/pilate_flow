import { z } from 'zod';

export const ApparatusSchema = z.enum(['reformer', 'cadillac', 'chair', 'barrel', 'mat']);
export { propSchema as PropSchema } from './cloudBackupSchema';
export const BlockCategorySchema = z.enum([
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
]);
export const DifficultyLevelSchema = z.enum(['1.0', '1.5', '2.0']);

/** Parse only official YouTube hosts. This checks the reference format, not video availability. */
export function parseYouTubeReference(value: string): { videoId: string; url: string } | null {
  try {
    const parsed = new URL(value.trim());
    if (
      !['https:', 'http:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return null;
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      if (!/^\/[A-Za-z0-9_-]{11}\/?$/.test(parsed.pathname)) return null;
      videoId = parsed.pathname.split('/')[1];
    } else if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)
    ) {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v');
      else {
        const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/);
        videoId = match?.[1] ?? null;
      }
    }
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  } catch {
    return null;
  }
}

/** MM:SS or HH:MM:SS; seconds and the middle minute field must be in range. */
export function parseReferenceTime(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d{1,3}:)?\d{1,3}:[0-5]\d$/.test(text)) return null;
  const parts = text.split(':').map(Number);
  if (parts.length === 3 && parts[1] > 59) return null;
  const seconds =
    parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  return seconds <= 24 * 3600 ? seconds : null;
}

export interface ManualChapter {
  startSec: number;
  title: string;
}

/** Reads user supplied timestamps only; never infers setup, springs or instruction. */
export function parseManualChapters(value: string): {
  chapters: ManualChapter[];
  error: string | null;
} {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chapters: ManualChapter[] = [];
  if (lines.length > 100) return { chapters, error: '한 번에 100개 이하의 구간을 입력해 주세요.' };
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^((?:\d{1,3}:)?\d{1,3}:[0-5]\d)\s+(.+)$/);
    const startSec = match ? parseReferenceTime(match[1]) : null;
    if (!match || startSec === null || match[2].trim().length < 2) {
      return { chapters: [], error: `${index + 1}번째 줄을 확인해 주세요. 예: 02:30 동작 이름` };
    }
    if (chapters.length && startSec <= chapters[chapters.length - 1].startSec) {
      return { chapters: [], error: `${index + 1}번째 줄의 시간은 이전 구간보다 늦어야 합니다.` };
    }
    chapters.push({ startSec, title: match[2].trim().slice(0, 160) });
  }
  return { chapters, error: null };
}

export const YouTubeClipImportSchema = z.object({
  nameKo: z.string().trim().min(2, '동작 이름을 2자 이상 입력해 주세요.').max(160),
  nameEn: z.string().trim().max(160),
  youtubeUrl: z
    .string()
    .refine(
      (value) => parseYouTubeReference(value) !== null,
      '유효한 YouTube 영상 링크를 입력해 주세요. youtube.com 또는 youtu.be만 지원합니다.',
    ),
  channelName: z.string().trim().min(1, '직접 확인한 채널명을 입력해 주세요.').max(160),
  startTimeText: z
    .string()
    .refine(
      (value) => parseReferenceTime(value) !== null,
      '시간을 MM:SS 또는 HH:MM:SS 형식으로 입력해 주세요.',
    ),
  apparatus: ApparatusSchema,
  blockCategory: BlockCategorySchema,
  level: DifficultyLevelSchema,
  defaultDurationMin: z.number().finite().min(0.5).max(20),
  springs: z.string().trim().max(240),
  breathPattern: z.string().trim().max(500),
  cueText: z.string().trim().max(3000),
});

export const LogClassHistorySchema = z.object({
  sequenceId: z.string().min(1),
  groupId: z.string().min(1, '수업 대상 반을 선택해 주세요.'),
  taughtAt: z.string().min(1),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  intensity: z.enum(['relaxed', 'moderate', 'intense']),
  instructorReflection: z.string().min(2, '다음 수업 참고 메모를 2자 이상 남겨 주세요.'),
});

export type YouTubeClipImportInput = z.infer<typeof YouTubeClipImportSchema>;
export type LogClassHistoryInput = z.infer<typeof LogClassHistorySchema>;
