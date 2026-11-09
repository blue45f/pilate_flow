# Gemini Pilates Booking Core (`gemini-pilates-booking-core-20261110-519fcfc3`)

Pilates-flow 수업 예약 도메인 로직과 자동화된 경계·실패 테스트 스위트를 외부 의존성 없이 순수 JavaScript (`Node.js >= 18` 표준 내장 `node:test`, `node:assert/strict`)로 구현한 독립 패키지입니다.

## 1. 작업 격리 및 기존 `pilates-flow` 앱 규칙 출처·일치 기록

원본 저장소(`/Users/hjunkim/WebstormProjects/pilates-flow`)는 읽기 전용으로만 확인했으며, 원본 파일·브랜치·의존성·서버는 일절 수정하지 않고 저장소 외부 경로인 `/Users/hjunkim/WebstormProjects/gemini-pilates-booking-core-20261110-519fcfc3`에 독립 패키지를 구성했습니다.

| 규칙 영역 | 원본 `pilates-flow` 출처 파일 | 원본 규칙 내용 및 본 모듈 일치 여부 |
| :--- | :--- | :--- |
| **기구 분류 (`ApparatusType`)** | `src/types/pilates.ts` | `'reformer' \| 'cadillac' \| 'chair' \| 'barrel' \| 'mat'` 5종 기구 분류 및 50분 표준 수업 단위 일치 (`normalizeApparatusType`으로 대소문자 호환 지원) |
| **수업 형태 (`ClassGroupProfile.type`)** | `src/types/pilates.ts` | `'group' \| 'private'` 구분 일치 (`private` 기본 정원 1명, `group` 정원 설정 지원) |
| **스케줄 회차 상태 (`status`)** | `src/types/instructorSchedule.ts`, `src/utils/instructorSchedule.ts` | `InstructorScheduleOccurrence.status`의 `'scheduled' \| 'cancelled' \| 'closed' \| 'moved'` 4가지 상태와 100% 일치. `'scheduled'`만 예약 가능하며 `'cancelled'`, `'closed'`, `'moved'`는 각각 `SESSION_CANCELLED`, `SESSION_CLOSED`, `SESSION_MOVED`(`movedTo` 포함)로 예약 차단 |
| **날짜·시각 형식 및 선후 검증** | `src/schemas/instructorScheduleSchema.ts` | `isScheduleDate`(`YYYY-MM-DD`, 1900~2199년, 실제 달력 날짜 검증), `scheduleTimeSchema`(`HH:MM` 00:00~23:59), `endTime > startTime`(`종료 시각은 시작보다 늦어야 합니다`) 검증 규칙 100% 일치 |
| **시간대 겹침 (`intervalsOverlap`)** | `src/utils/instructorSchedule.ts` (`findInstructorScheduleConflicts`) | 활성(`scheduled`) 수업에 대해 반열린 구간 `[startTime, endTime)` 기준 겹침 판정 (`left.startTime >= right.endTime \|\| right.startTime >= left.endTime`이면 비충돌, 즉 `10:50 === 10:50` 연속 수업 허용) 100% 일치 |
| **주간 시작일 계산 (`scheduleWeekStart`)** | `src/utils/instructorSchedule.ts` | 월요일 시작 주간 기준(`(day + 6) % 7`) 계산식 100% 일치 (주간 예약 횟수 제한 `weeklyBookingLimit` 판정에 사용) |
| **반복 요청 멱등성 및 키 충돌** | `BACKEND.md`, `backend/backupService.ts` | 고유 요청 키(`requestId` / `idempotencyKey`) + 요청 본문 지문(fingerprint) 비교를 통해 동일 요청 재시도 시 부작용 없이 재응답(`idempotentReplay: true`)하고, 다른 페이로드로 키 재사용 시 `409 Conflict`(`IDEMPOTENCY_KEY_CONFLICT`) 반환 |
| **회원 예약 정원·대기열·승급·회원권 차감** | 원본 `src/` 내 미구현 (`waitlist`, `capacity` 검색 결과 0건) | 원본 앱이 강사용 시퀀스·일정 관리 중심이므로, 회원 예약 정원(`capacity`), 대기 정원(`waitlistCapacity`), 대기순번 재정렬, 확정 취소 시 대기 1순위 자동 승급, 회원권 잔여 횟수/만료/예약·취소 마감 시간 창은 `src/config.mjs`의 `DEFAULT_BOOKING_POLICY`에 명시적 기본값으로 정의하고 모든 옵션을 구성 가능(configurable)하게 구현 |

## 2. 패키지 파일 목록

* `package.json`: 패키지 메타데이터 및 `node --test` 실행 스크립트
* `src/index.mjs`: 공개 모듈 엔트리포인트
* `src/booking-engine.mjs`: 핵심 예약 도메인 엔진 (`PilatesBookingEngine`)
* `src/config.mjs`: 설정 가능한 스튜디오 예약/취소/대기/승급 정책 (`DEFAULT_BOOKING_POLICY`, `createBookingPolicy`)
* `src/errors.mjs`: 구조화된 도메인 오류 클래스 및 오류 코드 (`PilatesBookingError`, `BookingErrorCode`, `ErrorCategory`)
* `src/time-utils.mjs`: `isScheduleDate`, `isScheduleTime`, 밀리초 경계 검증, 반열린 구간 시간 겹침, KST 일간/주간 버킷 유틸리티
* `src/fixtures.mjs`: 외부 DB·실제 고객 정보가 없는 순수 가상 스튜디오 fixture 생성기 (`createVirtualStudioFixtures`)
* `test/booking-engine.test.mjs`: `node:test` 기반 45개 경계·실패·원본 규칙 호환 테스트 스위트
* `INTEGRATION_GUIDE.md`: 기존 `pilates-flow` 앱과 안전하게 연결하기 위한 별도 통합 안내서

## 3. 테스트 실행 명령

외부 패키지 설치(`npm install` / `pnpm install`)나 네트워크 연결 없이 Node.js 내장 테스트 러너로 즉시 실행됩니다.

```bash
node --test /Users/hjunkim/WebstormProjects/gemini-pilates-booking-core-20261110-519fcfc3/test/booking-engine.test.mjs
```
