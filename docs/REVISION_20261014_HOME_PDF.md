# 홈 바로가기 PDF 원본 반영 — 2026-10-14

- 제품 버전: v0.1.22. Google 서버 버전 7과 저장 형식 2는 그대로 사용한다.
- 사용자 제공 `주식왕_홈탭용.pdf`의 6개 버튼을 기존 홈 3×2 바로가기에 연결한다. 순서: 친구 / 경제 지표 / 내 총자산, 출석 보상 / 업적 / 보상함.
- 바깥 흰 배경을 투명하게 제거하고, 금색 테두리·버튼 내부 색상·그림·원래 문구·화살표를 보존한다. 별도 HTML 문구를 겹치지 않는다.
- 내장 ImageGen 도구에는 “Remove ONLY the exterior white background OUTSIDE the rounded gold outer frame; preserve the complete button and original Korean lettering”으로 편집을 요청했다. 결과의 투명도만 사용하고 RGB는 PDF에서 추출한 원본을 사용했다. 보관한 원본 해상도 컷아웃의 RGB 불일치는 0이다.
- 최종 자산: `assets/ui/reference/home-shortcut-{friends,economy,total,gift,trophy,chest}-v22.webp`. 원본 해상도 컷아웃은 저장소 밖 `배포자료/20261014_홈탭원본/`에 보존하며, 서비스용은 640px 무손실 WebP로 줄였다.
- 실제 버튼의 기존 `data-action`, 대리 조회의 친구 제외, 키보드 포커스와 접근성 이름을 유지한다. `object-fit: contain`으로 전체 이미지 비율을 유지한다.
- 서비스워커 캐시 이름을 v0.1.22로 바꾸고 새 자산 6개를 포함한다. 설치 이름과 v20 설치 아이콘은 변경하지 않는다.

검증: 자동 회귀 182개 통과; 서버 22개 파일과 HTML/JS/manifest 참조 검사 통과; 격리 Chrome 320/375/480px에서 3×2 배치·이미지 로드·가로 넘침 없음·6개 버튼의 실제 이동과 출석 팝업·대리 조회·서비스워커 자산 저장 확인. 실제 휴대폰의 OS 키보드, 설치 캐시, 터치와 소리 출력 검증은 별도다.

증거: 저장소 밖 `배포자료/20261014_홈탭원본/asset-verification.json`, `home-verification.json`, `tests.log`, `home-*.png`, `shortcuts-*.png`.

기존 삭제 표시된 기획기록과 미추적 `docs/V0_UI_GUIDE.md`는 그대로 보존하며, 비공개 관리자 설정과 운영 데이터를 변경하지 않았다.
