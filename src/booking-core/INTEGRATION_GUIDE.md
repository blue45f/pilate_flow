# Pilates-flow 예약 도메인 코어 별도 통합 안내서 (`INTEGRATION_GUIDE.md`)

본 문서는 독립 구현된 `gemini-pilates-booking-core-20261110-519fcfc3` 패키지를 향후 기존 `/Users/hjunkim/WebstormProjects/pilates-flow` 애플리케이션에 연결할 때 참고하기 위한 **비침투적(Non-intrusive) 통합 가이드**입니다. 본 작업에서는 원본 앱 파일 수정이나 운영 반영을 수행하지 않았습니다.

## 1. 기존 `pilates-flow` 모듈과의 연결 지점

1. **강사 스케줄 회차(`InstructorScheduleOccurrence`) 직접 연동**
   * `pilates-flow/src/utils/instructorSchedule.ts`의 `expandInstructorSchedule(data, start, end)`가 생성하는 `InstructorScheduleOccurrence` 객체(`id`, `classId`, `date`, `startTime`, `endTime`, `locationId`, `title`, `participantAlias`, `status`, `movedTo`, `reason`)를 변환 없이 그대로 `engine.registerSession({ ...occurrence, apparatus: 'reformer', capacity: 4 })`에 전달할 수 있습니다.
   * `status`가 `'cancelled'`, `'closed'`, `'moved'`인 회차는 자동으로 예약을 차단하고 각각 `SESSION_CANCELLED`, `SESSION_CLOSED`, `SESSION_MOVED` 오류와 상세 메타데이터(`movedTo`, `reason`)를 반환합니다.
2. **기구 분류(`ApparatusType`) 및 수업 유형(`ClassGroupProfile.type`) 호환**
   * `pilates-flow/src/types/pilates.ts`의 `ApparatusType`(`'reformer' | 'cadillac' | 'chair' | 'barrel' | 'mat'`)을 회원권의 `allowedApparatus` 배열 및 세션의 `apparatus` 필드에 그대로 사용할 수 있습니다.

## 2. 어댑터 연동 코드 예시

```javascript
import {
  PilatesBookingEngine,
  WaitlistCreditPolicy,
  LateCancelPolicy,
} from '../gemini-pilates-booking-core-20261110-519fcfc3/src/index.mjs';

export function createBookingEngineFromScheduleOccurrences(occurrences, members, memberships, policyOverrides = {}) {
  const engine = new PilatesBookingEngine({
    policy: {
      bookingOpenHoursBeforeStart: 168,
      bookingCloseMinutesBeforeStart: 30,
      freeCancelMinutesBeforeStart: 1440,
      waitlistCreditPolicy: WaitlistCreditPolicy.HOLD_ON_WAITLIST,
      lateCancelPolicy: LateCancelPolicy.FORFEIT_CREDIT,
      ...policyOverrides,
    },
    members,
    memberships,
    sessions: occurrences.map((occ) => ({
      ...occ,
      apparatus: occ.apparatus ?? 'reformer',
      capacity: occ.capacity ?? 4,
      waitlistCapacity: occ.waitlistCapacity ?? 2,
    })),
  });

  return engine;
}
```

## 3. 실제 완료 항목과 미검증(별도 통합) 구분

* **실제 완료 및 검증됨**:
  * 원본 `pilates-flow`의 스케줄·날짜·시각·겹침·상태·멱등성 규칙 출처 확인 및 일치 구현
  * 정원/중복 예약/대기순번/취소 후 자동 승급/회원권 잔여 횟수 및 만료/기간 경계/반복 요청 중복 차감 방지/구조화된 오류 모듈 구현
  * 가상 fixture 기반 45개 경계·실패 테스트 스위트 `node:test` 실제 실행 및 통과 확인
* **미검증 및 향후 통합 시 수행 필요**:
  * 원본 `pilates-flow` UI 컴포넌트(`InstructorScheduleView.tsx`) 및 Zustand 스토어와의 직접 바인딩(원본 보호 지침에 따라 미수정)
  * 멀티 디바이스 클라우드 백업(`backend/backupService.ts`) 스냅샷 스키마에 회원 예약·회원권 원장 컬렉션을 포함할지 여부에 대한 스키마 확장 및 E2E 테스트
