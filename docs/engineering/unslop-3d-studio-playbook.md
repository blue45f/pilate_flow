# AI 티를 벗겨낸 3D 창작·티칭 스튜디오 아키텍처 플레이북

> 적용 범위: **PilatesFlow (`pilates-flow`)** 및 **ToonStudio (`toonstudio`)** 공통 엔지니어링·디자인 기준서  
> 디자인 기반: Damir Sokolovsky (`@heydamir`, https://github.com/heydamir/unslop, CC BY 4.0) 9-Pass 시스템 및 단일 기준 에이전트 하네스(`AGENTS.md` · `DESIGN.md`)

## 1. 역발상: 3D 스튜디오의 완성도는 장식을 더할 때가 아니라 카드를 덜어낼 때 올라간다

생성형 AI가 만든 인터페이스가 한눈에 티가 나는 이유는 기능 부족 때문이 아니라 **과잉 장식(Decorative Slop)** 때문입니다. 3단 초록·보라 그라디언트 배너, 테두리 있는 카드 안의 또 다른 테두리 카드, 모든 버튼과 배지에 남발된 `9999px` 알약 반경은 정작 사용자가 집중해야 할 **3D 기구·포즈 뷰포트와 시퀀스 타이머**의 시선을 빼앗습니다.

* **해결 원칙:** 배경(`#faf8f4`) → 카드(`#ffffff`) → 강조 단차(`#efe9df`)의 3단 표면 위계와 `1px` 중립 헤어라인(`rgba(31, 27, 22, 0.08)`)만으로 구획을 나눕니다.
* **실제 적용:** `pilates-flow` 회원 수강권 히어로의 3단 녹색 그라디언트를 걷어내고 보타니컬 세이지(`#355441`) 단일 링 게이지로 압축했으며, `toonstudio` 3D 준비도 패널의 중첩 테두리 카드 4개를 평면 상단 헤어라인(`border-t border-line/60`) 5열 텔레메트리로 통합했습니다.

## 2. 현장 사고 회고: 대칭 복사한 3D 소품의 음수 스케일이 외곽선을 뒤집기까지

3D 모델링 도구(Blender)에서 기구 레일이나 건축 문짝을 대칭 복사(`Mirror` / `Scale -1`)한 뒤 스케일을 적용(`Ctrl+A`)하지 않고 `.glb`로 내보내면, 뷰포트 미리보기에서는 멀쩡해 보여도 브라우저 WebGPU/WebGL 렌더러에서 **면 법선(Face Normal)이 안쪽으로 뒤집히며 백페이스 컬링과 NPR 툰 외곽선이 깨지는 현상**이 발생합니다.

* **발단:** 대칭 복사된 메시에 `scale: [-1, 1, 1]` 변환 행렬이 남은 채 출하됨.
* **갈등:** 웹 뷰포트에서 기구 프레임 한쪽이 투명해지거나 웹툰 배경 외곽선이 검은 덩어리로 번짐.
* **해법:** 업로드 및 빌드 단계에서 `.glb`의 첫 20바이트 바이너리 헤더(`magic: 0x46546c67`, `version: 2`, `JSON chunk: 0x4e4f534a`)와 노드 트리의 `scale` 배열을 전수 검사하는 무할당(Zero-Allocation) 프리플라이트 가드(`inspectGlbBinaryHeader`, `inspectStudioBg3dGlbBinaryHeader`)를 도입해 음수 스케일 에셋 유입을 원천 차단했습니다.

## 3. 정량 출하 지표와 4GB 저사양 기기 필레이트 보호

감각적인 인상평 대신 CI와 하네스가 매 빌드마다 검증하는 정량 지표로 품질을 고정합니다.

| 검증 항목 | 측정 결과 | 검증 도구 |
| :--- | :--- | :--- |
| **실측 3D 리포머 GLB (`atelier-reformer-v9.glb`)** | `167,016` bytes (`32`메시, PBR 재질 `9`종, 음수 스케일 노드 `0`개) | `inspectGlbBinaryHeader` · `agent-harness.mjs` |
| **4GB 저사양 모바일 3D 필레이트 절감률** | 초당 픽셀 처리량 **`84.6%` 감소** (`2.25x @ 60fps` → `1.25x @ 30fps` 자동 보호) | `resolveAdaptive3dFrameBudget` (`studio3dResourceGuard.ts`) |
| **PWA 정적 자산 및 청크 순환성** | 정적 파일 `75`개 검증 완료, 순환 JS 청크 **`0`건** | `scripts/check-pwa-build.mjs` |
| **번들 소스맵 노출 감사** | 프로덕션 `dist` 내 `sourcesContent` 노출 **`0`건** | `REA_ANALYSIS_PROVIDER=ghidra rea audit-release-exposure dist` |
| **아키텍처 디렉터리 래칫 (`toonstudio`)** | `creatorRootFiles: 2,499 / 2,499` (루트 파일 팽창 `0`건) | `scripts/validate-source-layout.mjs` |

## 4. 한국어 웹·3D 앱을 하루 만에 프로덕션 급으로 다듬는 4단계 실전 체크리스트

1. **한글 조판 잠금 (`Korean Typography Lock`):** 모든 한국어 제목·버튼·칩·본문에 `word-break: keep-all; overflow-wrap: break-word; font-style: normal;`을 선언하고, 글자 굵기 상한을 `600`(`semibold`)으로 제한해 한글 겹받침 뭉개짐을 막습니다. 타이머·잔여 횟수·스프링 코드는 모두 `font-variant-numeric: tabular-nums`로 고정합니다.
2. **반경 동심원화 (`Concentric Radii`):** `9999px` 알약 남발을 멈추고 키캡·배지 `6px` → 행·칩 `8px` → 입력·버튼 `10px` → 세그먼트 `12px` → 카드 `16px` → 시트·모달 `20px` 공식을 지킵니다.
3. **내부 용어 격리 (`Plain Korean Chrome`):** 기본 화면에서 `canonical SceneDocument`, `sha256`, `GLB v2` 같은 엔진 내부 용어를 걷어내고 사용자 과업 언어(`장면 구성 확인`, `실측 기구 3D · 32파츠`)로 바꿉니다. 무결성 해시는 접힌 `<details>`(`기술 무결성 정보`) 안에서만 제공합니다.
4. **바이너리·GPU 리소스 가드 (`Deterministic Disposal`):** `.glb` 바이너리 헤더 검사와 함께 뷰포트 언마운트·컨텍스트 손실(`contextlost`) 시 캔버스 백버퍼(`width = 0; height = 0`)와 GPU 리소스를 결정론적으로 해제합니다.

## 5. 멀티 에이전트 규칙 표류(Rule Drift) 방지 하네스

여러 AI 에이전트(Claude Code, Gemini, Cursor, GitHub Copilot)가 동시에 작업할 때 가장 큰 위험은 에이전트마다 서로 다른 문서를 읽고 스타일·보안 규칙이 어긋나는 **규칙 표류(Rule Drift)**입니다.

* 모든 작업 규칙은 루트 `AGENTS.md`(정본)와 `DESIGN.md`(시각 계약) 두 파일에만 기록합니다.
* `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`는 `AGENTS.md`를 가리키는 얇은 어댑터로만 유지합니다.
* `pnpm harness:check`(`scripts/agent-harness.mjs`)가 정본·어댑터 연결, `.gitignore` 비밀정보 보호, 한글 조판 토큰, `999px`·그라디언트 슬롭 금지, 내부 용어 격리, `.glb` 바이너리 무결성을 한 번에 검증하여 어떤 에이전트가 커밋하더라도 동일한 프로덕션 기준을 강제합니다.
