# 로딩 구조·홈 바로가기·선택형 입력 개선 계획

> 사용자 승인: 현재 Google 서버에서 장부와 조회 구조를 개선하고, 새 홈 사진과 선택에 따른 입력 항목 변경을 구현한다. 이 세 작업을 순서대로 직접 구현하고 각 단계에서 검증한다.

**Goal:** 전체 시세 기록의 반복 읽기·쓰기와 불필요한 조회 저장을 줄이면서 거래 정확성을 유지하고, 홈 접근성과 조건부 입력을 고친다.

**Architecture:** 같은 비공개 Google 스프레드시트에 실시간 상태와 종목별 압축 시세 기록을 분리한다. 필요한 시점에만 전체 시세를 읽고, 일반 화면은 실제 최근 시세와 미리 계산한 캔들을 사용한다. 변경된 구획과 회원 행만 기존 원자적 Sheets batchUpdate로 저장한다. 캐시는 검증된 구획의 보조 사본이며 원본과 인증을 대신하지 않는다. 기존 형식을 읽으며 명시적 전환 전에는 기존 형식으로 운영한다.

**Tech Stack:** Apps Script V8, Google Sheets v4, CacheService, Utilities gzip, Vanilla JavaScript, node:test, 합성 Chrome 모바일 검증.

**Spec:** 이 파일의 승인 요구 및 인수인계 최신 파일의 2026-10-13 로딩 조사.

## 공통 제약

- 기존 삭제된 기획기록과 미커밋 V0_UI_GUIDE, 원본 이미지 및 비공개 자료를 보존한다.
- 새 클라우드 서비스·요금제·외부 데이터 이전을 만들지 않는다.
- 관리자 기존 암호·서명키·세션·시트 연결을 유지한다. 공개 소스에는 실제 암호 검증값을 넣지 않는다.
- 매매·예약·배당·출석·보상은 서버 계산과 원자적 저장, 같은 요청 재시도를 유지한다.
- 조회도 시장 갱신이나 기본값 이전 등 실제 변경이 있으면 저장한다. 단순히 읽기라는 이유로 갱신을 버리지 않는다.
- 저장 형식 전환과 역전환은 같은 잠금에서 검증하고 원자적으로 반영한다. 초기 설치 함수를 재실행하지 않는다.
- 원본 과거 시세를 삭제하거나 가짜 차트 수치를 만들지 않는다. 전체 원장을 브라우저에 보내지 않는다.

## 1. 시세 지연 로딩 및 동일한 화면

Files: server/HistoryViews.gs, server/Engine.gs, tests/history-views.test.cjs.

Interfaces: `King.forkState(state)`는 복사된 상태와 지연 시세 배열을 반환한다. `King.historyPreview(stock)`는 마지막 240개 실제 시세, `King.historyBars(stock)`는 기존 시간봉·일봉과 동일한 캔들을 반환한다. `King.attachHistory(stock, load, preview, bars)`는 배열을 실제 읽을 때 파생 캐시를 무효화한다.

- [x] 원본 상태의 시세가 복사본 가격 정정·분할·시장 갱신으로 바뀌지 않는 회귀를 작성하고 실패를 확인한다.
- [x] 지연 상태에서 친구 조회가 전체 시세 로더를 호출하지 않는 회귀를 작성한다.
- [x] 기존 `King.chartBars`와 비교해 시세·봉 결과가 같도록 구현한다.

검증 예: `assert.deepEqual(newBars, oldBars); assert.equal(historyLoads,0)`.

## 2. 구획 저장 및 운영 전환

Files: server/StorageSegments.gs, server/Storage.gs, server/Code.gs, server/StorageDiagnostics.gs, tests/storage-segments.test.cjs.

Interfaces: `KingStore.read`와 `KingStore.write`의 기존 호출을 유지한다. 구획 원본은 같은 문서의 `서버구획` 시트, 현재 구획 위치·해시와 리비전은 `서버원장` 메타 행에 둔다. `enableSegmentedStockKingStorage()` / `restoreLegacyStockKingStorage()`는 소유자 실행 전환 함수다.

- [x] 기존 형식 → 분리 형식 → 기존 형식의 전체 상태 대조 회귀를 작성한다.
- [x] 저장 응답 유실 후 거래 재시도 1회 지급, 커밋 실패 후 이전 장부 유지 회귀를 작성한다.
- [x] 가상 7일 시세에서 친구 조회의 시세 읽기 0회와 실제 저장량 감소를 측정한다.
- [x] 변경 없는 구획과 회원 행을 다시 쓰지 않는다. 구획 해시가 맞지 않거나 캐시가 비면 원본을 재조회한다.
- [ ] 사용 중인 장부 전환은 모든 검증 후 수행하고 실제 데이터 대조 결과를 기록한다.

## 3. 변경 없는 조회와 반복 요청 감소

Files: server/Engine.gs, server/Code.gs, js/app.js, tests/read-performance.test.cjs.

- [x] 시장·계정·업적 등 변화가 없는 경량 조회는 원본 상태를 반환해 저장을 생략한다.
- [x] 시장 분이 지났거나 기본값이 처음 생긴 경우 갱신·저장이 계속되는지 검증한다.
- [x] 동일 화면의 중복 조회를 통합하고 이미 있는 친구·기록·채팅 캐시를 재사용한다. 거래와 인증은 서버 확인을 유지한다.

## 4. 홈 바로가기와 조건부 입력

Files: js/game-panels.js, js/views.js, js/admin-ui.js, js/trade-ui.js, js/conditional-fields.js, js/app.js, reference-ui.css, tests/conditional-fields.test.cjs.

- [x] 홈 차트 아래에 친구·경제 지표·내 총자산, 출석·업적·보상함의 3×2 바로가기를 놓고 하단의 중복 바로가기를 제거한다.
- [x] 보상 현금/종목/배지, 점검 시작/해제, 제한 시작/해제, 시장 운영 종류, OCO/일반 예약을 점검한다.
- [x] 비활성 항목은 숨기고 disabled 처리하여 브라우저 검증과 FormData에서 제외한다. 재선택 시 작성한 초안을 보존한다.
- [x] 확인창과 실제 서버 요청에는 해당 선택의 값만 들어가는지 검증한다.

## 5. 최종 검증·배포

- [x] 전체 회귀와 구문/파일 연결 검사, 320/375/480px 화면 및 실제 폼 제출을 검증한다.
- [x] 독립 코드 검토 후 발견된 중요 문제를 해결한다.
- [x] 서버 통합본·운영 전환/복구 절차·인수인계와 측정 증거를 갱신한다.
- [ ] 기존 사이트와 같은 Google 배포 URL로 적용하고 전후 응답 시간·전환 성공을 확인한다.

검증: 전체 182개 회귀 통과, 서버 22파일 구문/연결 통과, 320/375/480px 및 실제 조건부 폼 선택 22종 통과. 가상7일 시세 설정 저장 배치 5,475,908→53,845bytes (99.02% 감소), 변경 없는 친구 조회 archive0/commit0. Google 적용·실제 측정은 완료 증거 후 확정한다.
