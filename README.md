# 엘시티 1/2 간소화 뷰어

원본의 정확한 복원이 아닌 독립적인 시공 가능 새 설계의 브라우저 뷰어다.
외접 실제값 26×51×72, 낮은 동 56·낮은 동 56·높은 동 72, 전체 6,642블록.

## 실행

- `npm install --ignore-scripts --no-audit --no-fund` (최초 1회, `three@0.180.0` 고정)
- `npm start` → `http://127.0.0.1:4173/lct-half-viewer.html`
- 포트 점유 시 서버 프로세스를 죽이지 않고 `python3 -m http.server 4174 --bind 127.0.0.1`로 안내한다.

## 검증

- `npm run verify:model` — 6,642블록·재료 분할·외접·동별 단일 연결·설치 가능 확인
- `npm test` — 모델·CSV·도면 회귀 9개
- `npm run generate` — `output/`에 모델 JSON·블록 CSV·재료 CSV·전체 도면 HTML 생성

## 조작

관찰: 왼쪽 드래그 회전, 휠 확대, 오른쪽 드래그 이동. 자유 이동: WASD 이동,
Space 상승, Shift 하강, 마우스 시선, Esc 해제. 벽을 통과하는 관람이며 생존
물리·충돌이 없다. 입구 버튼은 북쪽(-z)을 바라보고 눈 높이는 블록 y와 다르다.

## 구현·모델

- 사용 모델: opencode-go/muse-spark-1.3-contributor, 수작업 설계+검증 병행
- 단일 원천 `src/model.mjs`, 렌더 `src/viewer.mjs`, 상태 `src/app.mjs`,
  도면 `src/blueprints.mjs`, 직렬화 `src/exports.mjs`
- 유리 불투명·앞면 렌더(깨짐 방지), 섬록암 자체 16픽셀 텍스처, CDN 없음
- 검증 결과: `npm run verify:model` 통과, `npm test` 9/9, 실브라우저 전체·회전·
  확대·층 절단·재료 필터·내부 이동·복귀·도면 셀 선택·전체 CSV(6,643행=헤더+6642)·
  도면집 76면 확인. 콘솔·페이지 오류 없음(수정 전 highlight 오류 5건 해결).
