import type { MemberBookableSlot } from './memberBookingBridge';

export const MEMBER_COMPANION_STORAGE_KEY = 'pf_member_companion_v1';

export interface MemberCompanionState {
  readonly preferredSpotByApparatus: Readonly<Record<string, string>>;
  readonly checkedInSlotIds: Readonly<Record<string, string>>;
}

const INITIAL_COMPANION_STATE: MemberCompanionState = {
  preferredSpotByApparatus: {},
  checkedInSlotIds: {},
};

export function readMemberCompanionState(): MemberCompanionState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_COMPANION_STATE;
  }
  try {
    const raw = window.localStorage.getItem(MEMBER_COMPANION_STORAGE_KEY);
    if (!raw) return INITIAL_COMPANION_STATE;
    const parsed = JSON.parse(raw) as Partial<MemberCompanionState> | null;
    if (!parsed || typeof parsed !== 'object') return INITIAL_COMPANION_STATE;
    const preferred: Record<string, string> = {};
    if (parsed.preferredSpotByApparatus && typeof parsed.preferredSpotByApparatus === 'object') {
      for (const [k, v] of Object.entries(parsed.preferredSpotByApparatus)) {
        if (typeof v === 'string' && v.length <= 16) preferred[k] = v;
      }
    }
    const checkedIn: Record<string, string> = {};
    if (parsed.checkedInSlotIds && typeof parsed.checkedInSlotIds === 'object') {
      for (const [k, v] of Object.entries(parsed.checkedInSlotIds)) {
        if (typeof v === 'string' && v.length <= 64) checkedIn[k] = v;
      }
    }
    return {
      preferredSpotByApparatus: preferred,
      checkedInSlotIds: checkedIn,
    };
  } catch {
    return INITIAL_COMPANION_STATE;
  }
}

export function writeMemberCompanionState(next: MemberCompanionState): MemberCompanionState {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(MEMBER_COMPANION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  return next;
}

export interface PassDdaySummary {
  readonly daysRemaining: number;
  readonly ddayLabelKo: string;
  readonly urgencyTone: 'calm' | 'soon' | 'expired';
  readonly creditSimulationNoteKo: string;
}

export function computePassDdaySummary(params: {
  readonly expiresAtIso: string;
  readonly todayIso: string;
  readonly remainingCount: number;
  readonly totalCount: number;
}): PassDdaySummary {
  const { expiresAtIso, todayIso, remainingCount, totalCount } = params;
  const parseIsoDay = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y || 2026, (m || 1) - 1, d || 1);
  };
  const diffDays = Math.round((parseIsoDay(expiresAtIso) - parseIsoDay(todayIso)) / 86_400_000);
  if (diffDays < 0) {
    return {
      daysRemaining: diffDays,
      ddayLabelKo: '만료됨',
      urgencyTone: 'expired',
      creditSimulationNoteKo: '유효기간이 지나 센터 연장이 필요해요.',
    };
  }
  const urgencyTone = diffDays <= 7 || remainingCount <= 2 ? 'soon' : 'calm';
  const ddayLabelKo = diffDays === 0 ? '오늘 만료 (D-Day)' : `만료 D-${diffDays}`;
  const afterNextBooking = Math.max(0, remainingCount - 1);
  const creditSimulationNoteKo =
    remainingCount <= 0
      ? `잔여 0 / ${totalCount}회 · 새 수강권 갱신 후 예약 가능`
      : `1회 차감 기준 · 다음 수업 예약 시 잔여 ${afterNextBooking} / ${totalCount}회`;

  return {
    daysRemaining: diffDays,
    ddayLabelKo,
    urgencyTone,
    creditSimulationNoteKo,
  };
}

export interface MemberHomeCarePrescription {
  readonly headlineKo: string;
  readonly workedFocusKo: string;
  readonly hydrationAndRecoveryNoteKo: string;
  readonly homeExercises: ReadonlyArray<{
    readonly titleKo: string;
    readonly durationKo: string;
    readonly cueKo: string;
  }>;
}

/**
 * Generates a calm, privacy-safe 3-minute post-class home-care recap card
 * inspired by boutique Pilates companion apps (Momence / Mariana Tek / Physitrack).
 */
export function buildMemberPostClassRecap(
  slot: Pick<MemberBookableSlot, 'title' | 'apparatus' | 'focusTagsKo'>,
): MemberHomeCarePrescription {
  const hay = `${slot.title} ${(slot.focusTagsKo ?? []).join(' ')}`.toLowerCase();
  const workedFocusKo =
    slot.focusTagsKo && slot.focusTagsKo.length > 0
      ? slot.focusTagsKo.join(' · ')
      : slot.apparatus === 'chair'
        ? '하지 지지력 · 심부 코어'
        : slot.apparatus === 'barrel'
          ? '측면 사슬 · 흉추 가동성'
          : '골반 중립 · 전신 협응';

  if (/하체|둔근|런지|풋워크|체어/.test(hay)) {
    return {
      headlineKo: '둔근·하지 정렬 수업 후 3분 매트 홈케어',
      workedFocusKo,
      hydrationAndRecoveryNoteKo:
        '오늘 활성화된 중둔근과 고관절 주변 근막이 부드럽게 회복되도록 따뜻한 수분을 보충해 주세요.',
      homeExercises: [
        {
          titleKo: '누워서 숫자 4(Figure-4) 둔근 이완 호흡',
          durationKo: '좌·우 각 45초',
          cueKo: '천골을 바닥에 무겁게 내려두고 날숨마다 고관절 바깥쪽 긴장을 풀어 줍니다.',
        },
        {
          titleKo: '골반 시계(Pelvic Clock) 12시-6시 미세 분절',
          durationKo: '90초 · 8회',
          cueKo: '복부 힘으로 억지로 누르지 말고, 호흡을 따라 허리 아래 작은 공기 공간을 부드럽게 움직입니다.',
        },
      ],
    };
  }

  if (/흉추|어깨|상체|스트레치|바렐|스완/.test(hay)) {
    return {
      headlineKo: '흉추·견갑 오픈 수업 후 3분 매트 홈케어',
      workedFocusKo,
      hydrationAndRecoveryNoteKo:
        '열린 쇄골과 윗등의 정렬이 일상 데스크 자세에서도 유지되도록 틈틈이 흉곽 호흡을 이어가 보세요.',
      homeExercises: [
        {
          titleKo: '옆으로 누워 오픈 북(Open Book) 흉추 회전',
          durationKo: '좌·우 각 1분',
          cueKo: '양 무릎이 떨어지지 않게 포갠 뒤, 시선과 가슴을 천장 너머로 부드럽게 열어 줍니다.',
        },
        {
          titleKo: '네발기기 캣-카우 & 레스트 포지션 호흡',
          durationKo: '1분 · 6회',
          cueKo: '손바닥으로 매트를 밀어 날개뼈 사이를 넓히고 등 뒤쪽 갈비뼈로 숨을 채웁니다.',
        },
      ],
    };
  }

  return {
    headlineKo: '코어·척추 분절 수업 후 3분 매트 홈케어',
    workedFocusKo,
    hydrationAndRecoveryNoteKo:
      '수업에서 깨운 심부 복횡근 감각을 자기 전 편안한 3차원 흉곽 호흡으로 연결해 보세요.',
    homeExercises: [
      {
        titleKo: '수파인 3D 흉곽 호흡 & 갈비뼈 닫기',
        durationKo: '90초 · 6호흡',
        cueKo: '코로 마실 때 등·옆구리 갈비뼈를 넓히고, 입으로 길게 내쉬며 아랫배를 납작하게 안정화합니다.',
      },
      {
        titleKo: '아티큘레이팅 숄더 브리지(반 브리지 분절)',
        durationKo: '90초 · 5회',
        cueKo: '꼬리뼈부터 등뼈를 하나씩 매트에서 떼고, 윗등부터 부드럽게 내려놓습니다.',
      },
    ],
  };
}
