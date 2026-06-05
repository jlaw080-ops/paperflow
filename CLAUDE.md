# 프로젝트: PaperFlow (마크다운 문서 웹 퍼블리싱 앱)

> 이 파일은 AI가 코딩할 때 제일 먼저 읽는 "헌법"이다. 목차 역할만 하고, 상세는 `docs/`에 둔다.

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Supabase (데이터 저장 + 로그인 Auth + RLS 보안)
- react-markdown + remark-gfm (마크다운 렌더링)
- 배포: Vercel

## 아키텍처 규칙
- CRITICAL: 공개 보기 라우트(`/view/[slug]`)는 **읽기 전용**이다. 이 경로에 편집·삭제·쓰기 기능이나 소유자 전용 데이터를 절대 노출하지 말 것.
- CRITICAL: 편집·삭제·쓰기 권한은 **Supabase RLS로 DB 차원에서 강제**한다. 앱 코드의 화면 숨김만으로 권한을 처리하지 말 것(우회 가능).
- CRITICAL: **표준 마크다운(GFM, 표 포함)만** 렌더링한다. Obsidian 전용 문법(`[[위키링크]]`, `![[임베드]]`, 콜아웃)을 임의로 구현하지 말 것.
- 예외: ` ```mermaid ` 코드블록은 다이어그램/플로우차트로 렌더한다(GitHub 방식). 클라이언트에서 SVG로 렌더하며 `securityLevel:'strict'` + raw HTML 비활성 유지(공개 뷰 XSS 방어). mermaid 외 다른 다이어그램 런타임은 임의 추가 금지.
- CRITICAL: 인쇄용 CSS는 `styles/print.css`(`@media print`)에 격리한다. 인쇄 스타일이 화면 레이아웃을 깨뜨리지 말 것. (A4 분할 방식은 `docs/ARCHITECTURE.md` 참조)
- 폴더/문서는 `documents` 한 테이블 + `parent_id` 트리로 표현한다. (스키마는 `docs/ARCHITECTURE.md`)
- 전역 상태 라이브러리(Redux 등)를 추가하지 말 것. Server Component + `useState`로 충분하다.
- CRITICAL: 사이드바 드래그앤드롭(`FileTree`)에서 `onDragStart` 중 **동기 `setState`로 드래그 소스의 스타일을 바꾸거나 DOM을 삽입/제거하지 말 것**. Chrome이 드래그 이미지 캡처 직후 드래그를 즉시 취소(dragstart→즉시 dragend)한다. 드래그 시각 상태 변경(opacity·드롭존 표시 등)은 `setTimeout(…, 0)`으로 다음 틱에 미룰 것. `setData`만 dragstart에서 동기 호출.

## 범위 규칙
- CRITICAL: `docs/PRD.md`의 **MVP 제외 사항**에 있는 기능을 임의로 만들지 말 것(양방향 동기화, 협업/댓글/버전관리, 검색, 수식 등). 필요해 보이면 먼저 사람에게 물을 것.
  - 범위 변경 이력: 다이어그램(mermaid)은 사용자 승인으로 MVP 범위에 편입됨(구현 완료).
  - 범위 변경 이력: 이미지 업로드는 사용자 승인으로 MVP 범위에 편입됨(구현 완료). Supabase Storage 공개 버킷 `document-images`(쓰기는 `{auth.uid()}/` 폴더로 RLS 격리, 읽기 공개). 에디터에서 붙여넣기·드래그드롭·버튼으로 올리고 **표준 `![alt](url)` 문법으로 삽입**한다. Obsidian `![[...]]` 임베드 문법은 여전히 미구현(파싱하지 않음).
  - 범위 변경 이력: 단일 줄바꿈(soft break) → `<br>` 렌더링은 사용자 승인으로 채택됨(`remark-breaks`). Obsidian/GitHub 댓글과 동일 동작이며, 원본 노트의 줄나눔을 그대로 보존한다. (이는 줄바꿈 *렌더링 정책*일 뿐, Obsidian 전용 *문법* 구현이 아님.)

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 **테스트를 먼저 작성**하고, 그 테스트가 통과하는 구현을 작성할 것 (TDD).
- 환경변수(Supabase URL/Key)는 `.env.local`에 두고 **절대 커밋하지 말 것**.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:).
- 작업 중 같은 유형의 실패가 반복되면, 그 원인을 이 파일의 CRITICAL에 "하지 말 것"으로 추가할 것.

## 명령어
```
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
```

## 세부 문서
- `docs/PRD.md` — 뭘 만드는지 (기능, MVP 제외, 성공 기준)
- `docs/ARCHITECTURE.md` — 어떻게 만드는지 (구조, 데이터 모델, A4 인쇄)
- `docs/ADR.md` — 왜 이렇게 만드는지 (결정과 트레이드오프)
- `docs/UI_GUIDE.md` — 어떻게 보여야 하는지 (색상, 타이포, 금지 패턴)
