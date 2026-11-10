# Pilates 예약 참조 UI — 실브라우저 키보드·모달 격리 재현 Fixture

이 폴더는 [`../PilatesScheduleAndMembershipSample.tsx`](../PilatesScheduleAndMembershipSample.tsx)의 실제 브라우저 키보드 이벤트 순서와 모달 격리·복수 인스턴스 동작을 로컬에서 재현·확인하기 위한 최소 독립 fixture입니다(가상 데이터만 사용하며 실제 사용자 데이터·외부 네트워크 리소스를 사용하지 않습니다).

## 포함 파일
- `index.html`: 로컬 Vite 엔트리 HTML
- `mount-fixture.tsx`: React `StrictMode` 마운트 엔트리
- `PilatesKeyboardBrowserFixtureApp.tsx`: 동일 화면에 두 개의 `<PilatesScheduleAndMembershipSample />` 인스턴스(`인스턴스 A`, `인스턴스 B`)를 나란히 렌더링하는 재현 화면

## 실브라우저 수동/자동 점검 항목
1. **열기 직후 키 떼기 (`Space` `keydown → keyup`)**: `인스턴스 A`의 `09:00 모닝 코어 리포머 예약하기` 버튼에 포커스한 뒤 `Space`를 눌렀다 뗄 때, 새로 포커스된 동의 체크박스가 의도치 않게 자동 체크되지 않는지 확인합니다.
2. **키 반복 (`Enter`/`Space`/`Escape` 길게 누르기)**: 확인 버튼·닫기 버튼·`Escape`를 길게 눌렀을 때 중복 차감이나 닫힘 직후 재열림이 발생하지 않는지 확인합니다.
3. **닫기/확정 직후 키 떼기 및 열기→닫기→재열기 포커스 복귀**: `닫기` 또는 `Escape`로 닫은 직후 키를 떼어도 모달이 다시 열리지 않고 원래 슬롯 트리거 버튼으로 포커스가 복귀하며, 재열기 시 이전 동의 체크 상태가 초기화되어 있는지 확인합니다.
4. **모달 뒤 CTA 포인터·키보드 격리**: 모달이 열려 있는 동안 스크림 백드롭(`data-testid="pilates-modal-backdrop"`)과 `pointer-events: none` 및 `tabIndex={-1}`이 배경 슬롯 CTA(`인스턴스 B` 포함)의 클릭·탭 진입을 차단하는지 확인합니다.
5. **복수 인스턴스 고유 Dialog ID 및 포커스 소유**: `인스턴스 A`와 `인스턴스 B` 각각의 모달 `aria-labelledby`/`aria-describedby` 대상 ID가 충돌하지 않고 각자의 트리거 버튼으로 포커스가 독립 복귀하는지 확인합니다.

## 로컬 실행 방법 (브라우저 실행이 허용된 로컬 터미널)
저장소 루트(`~/WebstormProjects/pilates-flow`)에서 비충돌 임시 루프백 포트로 실행한 뒤 확인 후 종료합니다.

```bash
pnpm dev --host 127.0.0.1 --port 0
```
출력된 로컬 주소 뒤 경로로 `/docs/pilates-toonstudio-ui-ux-20261110/reference-samples/pilates-keyboard-browser-check/index.html`을 열어 확인합니다.
