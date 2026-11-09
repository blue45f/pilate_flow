# pilates-recurrence (`src/utils/recurrence`)

필라테스 주간 반복 시간표 확장 및 강사/룸 시간 겹침 탐지 전용 독립 모듈입니다.
외부 패키지 의존성 없이 Node.js 표준 라이브러리만 사용하며, `pilates-flow`의 `InstructorScheduleOccurrence`(`locationId` 별칭 및 `classId` + `originalDate` 키)와 호환됩니다.

## 핵심 기능 범위 (예약/회원권 로직 제외)

1. **KST(`+09:00`) 기준 날짜 범위 및 결정적 시계 (`src/kstCalendar.mjs`)**
   - 호스트 OS 타임존에 영향받지 않는 명시적 KST(`UTC+09:00`) 날짜 연산 (`kstDateToEpochMs`, `epochMsToKstParts`, `expandKstDateRange`, `addKstDays`, `diffKstDays`)
   - 테스트 재현성을 보장하는 결정적 시계 (`createDeterministicKstClock`) 및 시점 기준 상태 분류 (`past` / `ongoing` / `upcoming`)
2. **주차/요일 반복 규칙 (`src/recurrenceEngine.mjs`)**
   - 매주 요일 반복 (`weekdays: [0..6]`), 격주/N주 간격 반복 (`intervalWeeks`), 월별 특정 주차 반복 (`weeksOfMonth: [1..6]`, `weekday-ordinal` 및 `calendar-week` 모드 지원), 단발 수업 (`once`), 특정일 제외 (`excludeDates`)
3. **휴일 제외 (`holidays`)**
   - 전체 스튜디오 공휴일/휴관일 자동 제외 (`mode: 'skip'`) 또는 휴무 행 표시 (`includeHolidayRows: true`, `mode: 'closed'`)
   - 특정 룸(`roomIds`) 또는 특정 강사(`instructorIds`) 한정 휴일 지정 지원
4. **예외 일정 (`exceptions`)**
   - `cancel` (특정 회차 휴강/취소)
   - `reschedule` / `override` (다른 날짜·시간·강사·룸으로 회차 이동 및 대강, 조회 범위 밖에서 안으로 이동한 회차 포함, `originalDate` 식별자 보존)
   - `closed` (특정 날짜 전체 또는 특정 룸/강사 임시 휴무)
   - `extra` (정규 반복 규칙 변경 없는 보강/특강 1회성 추가)
5. **자정 경계 및 자정 넘김 처리 (`resolveKstTimeWindow`)**
   - `00:00` 정각 시작, `24:00` 정각 종료(`다음날 00:00 KST`), 자정 넘김 수업(`23:30` -> 다음날 `00:20`) 지원
   - 조회 시작일 전날(`rangeStart - 1`) 심야에 시작해 조회 시작일 새벽으로 넘어오는 회차 자동 포함 (`includeCrossMidnightSpillover`)
6. **강사/룸 시간 겹침 탐지 (`src/conflictDetector.mjs`)**
   - 활성(`scheduled`) 회차 간 실제 KST epoch 구간 비교를 통한 강사 중복(`instructor`), 룸 중복(`room`), 강사+룸 동시 중복(`instructor-and-room`) 정밀 탐지
   - 정각 연강(`09:50` 종료 후 `09:50` 시작, `24:00` 종료 후 다음날 `00:00` 시작) 인접 허용 및 선택적 준비/정비 버퍼 시간(`instructorBufferMinutes`, `roomBufferMinutes`) 위반 탐지

## 테스트 실행 방법

```bash
node --test src/utils/recurrence/test/pilates-recurrence.test.mjs
```
