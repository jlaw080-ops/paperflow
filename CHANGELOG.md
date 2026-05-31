# Changelog

PaperFlow 작업 기록. 최신 항목이 위에 옵니다.

## 2026-05-31

좌측 사이드바 드래그앤드롭 복구부터 공개 링크 복사까지 일련의 버그 수정·기능 추가.

### Fixed
- **사이드바 드래그앤드롭이 시작되지 않던 문제** (`1177ae3`)
  - 원인: `FileTree`의 `onDragStart` 중 `setDraggedId`의 **동기 리렌더**(드래그 소스 opacity 변경 + 루트 드롭존 삽입)가 발생 → Chrome이 드래그 이미지 캡처 직후 드래그를 즉시 취소(`dragstart`→즉시 `dragend`).
  - 해결: 시각 상태 변경을 `setTimeout(0)`으로 다음 틱에 지연. `setData`는 dragstart에서 동기 유지.
  - 재발 방지 규칙을 `CLAUDE.md`에 CRITICAL로 추가.
- **한글 slug 공개 링크 404** (`d856d6d`)
  - 원인: Next.js 16이 동적 라우트 파라미터 `params.slug`를 URL 디코딩하지 않아 한글 slug가 `%EC%83%88…` 인코딩 상태로 DB 조회 → 불일치 → `notFound()`.
  - 해결: `app/view/[slug]/page.tsx`에서 `decodeURIComponent`(실패 시 원본 폴백) 후 조회. `single()`→`maybeSingle()`로 정상 404 처리.
  - RLS(`public_read_doc`, `owner_all`)·`proxy.ts`·서버 클라이언트는 정상으로 확인됨.

### Added
- **문서 본문/인쇄(PDF) 양식 보강** (`7610f7b`)
  - 문서 본문 강조색 리포트 blue `#1e40af`(제목 위계·표 헤더). 앱 UI(사이드바·헤더·툴바)는 기존 teal 유지.
  - 인쇄: A4 여백(20/18/22/18mm), 제목 pt 위계, 표 헤더 배경 인쇄(`print-color-adjust:exact`)·`thead` 반복·행 잘림 방지, orphans/widows. 인쇄 CSS는 `styles/print.css`(@media print)에 격리.
  - 한계: 흐르는 단일 문서라 커스텀 페이지 번호는 Chrome 인쇄 미지원(브라우저 머리글/바닥글 옵션 사용). 자동 목차·H1 강제 분할은 범위에서 제외.
- **Mermaid 다이어그램/플로우차트 렌더링** (`a072a92`, 규칙 갱신 `7e5e00a`)
  - ` ```mermaid ` 코드블록을 클라이언트에서 SVG로 렌더(`components/MarkdownView/MermaidDiagram.tsx`).
  - 동적 import로 지연 로드(다이어그램 있는 문서만), `securityLevel:'strict'`로 공개 `/view` XSS 방어, raw HTML은 계속 비활성. 인쇄 시 SVG로 그대로 출력.
  - 기존 문서 3개(0518 기획서 2부 + 0519 명세서)의 ASCII 텍스트 흐름도 6개 블록을 mermaid로 변환(DB 콘텐츠, 백업 후 surgical 교체 — git 외 작업).
  - MVP 제외였던 "다이어그램"을 사용자 승인으로 범위 편입, `CLAUDE.md` 갱신.
- **공개 링크 복사 버튼** (`f65c672`)
  - 에디터 슬러그 줄에 "링크 복사" 추가. `navigator.clipboard`로 전체 URL 복사, "복사됨 ✓" 피드백, 비보안 컨텍스트 `prompt` 폴백.

### Notes
- "열기"·"링크 복사"는 **현재 입력된(미저장 가능) slug**를 사용 → slug 변경 시 저장 후 사용해야 실제 접속됨.
- 모든 변경은 `master` 푸시 → Vercel 자동 배포로 반영.
