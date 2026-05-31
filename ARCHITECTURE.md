# 아키텍처

## 기술 스택
- **Next.js (App Router)** — React 기반 웹 프레임워크. Vercel 배포에 최적이고, "공개 보기"와 "비공개 편집" 라우트를 나누기 쉽다.
- **TypeScript (strict)** — 타입 검사로 실수를 미리 잡는다.
- **Tailwind CSS** — 스타일링.
- **Supabase** — 데이터 저장(PostgreSQL 데이터베이스) + 로그인(Auth). 이미 연결되어 있다.
- **react-markdown + remark-gfm** — 마크다운을 HTML로 렌더링(표 포함).
- **Vercel** — 배포.

## 디렉토리 구조
```
src/
├── app/
│   ├── (editor)/              # 로그인 필요 — 편집 영역
│   │   ├── page.tsx           #   대시보드(폴더 트리 + 편집기)
│   │   └── layout.tsx
│   ├── view/[slug]/           # 공개 — 인증 없이 읽기 전용
│   │   └── page.tsx           #   공유 링크로 열리는 문서 보기 페이지
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── FileTree/              # 좌측 폴더 트리
│   ├── Editor/                # 마크다운 편집기
│   ├── MarkdownView/          # 마크다운 → HTML 렌더링 (화면+인쇄 공용)
│   └── ImportDropzone/        # .md 드래그앤드롭 가져오기
├── lib/
│   ├── supabase/              # Supabase 클라이언트 (서버용/클라이언트용)
│   └── markdown.ts            # 렌더링 설정 (remark-gfm, 페이지나눔 처리)
└── styles/
    ├── globals.css
    └── print.css              # A4 인쇄용 CSS (핵심)
```

## 데이터 모델 (Supabase)
폴더와 문서를 **한 테이블**로 표현한다(부모-자식 관계로 트리 구성).

`documents` 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| parent_id | uuid (nullable) | 부모 폴더 ID. null이면 최상위 |
| type | text | `'folder'` 또는 `'doc'` |
| title | text | 폴더/문서 이름 |
| content | text | 마크다운 본문 (folder는 비움) |
| slug | text (unique, nullable) | 공개 링크용 주소 (doc만 사용) |
| sort_order | int | 같은 폴더 내 정렬 순서 |
| owner_id | uuid | 소유자(편집 권한 판단용) |
| created_at / updated_at | timestamptz | 생성/수정 시각 |

> **보안 핵심**: Supabase의 **RLS(Row Level Security — 데이터베이스 차원에서 "누가 무엇을 읽고 쓸 수 있는지"를 강제하는 기능)** 를 켠다.
> - 쓰기/수정/삭제: `owner_id = 로그인 사용자`일 때만 허용.
> - 읽기: 공개 보기를 위해 `type='doc'`은 누구나 읽기 허용(또는 `is_public` 플래그). 단, 트리 전체 구조·소유자 정보는 공개 라우트에 노출하지 않는다.

## 데이터 흐름
1. **가져오기**: 브라우저에서 `.md` 파일 읽기 → `documents`에 `type='doc'`으로 insert.
2. **편집**: 앱에서 `content` 수정 → 해당 행 update (`updated_at` 갱신).
3. **트리 탐색**: `parent_id` 기준으로 폴더/문서 계층을 조회해 사이드바에 표시.
4. **공개 보기**: `/view/[slug]` 에서 `slug`로 문서 1건 조회 → 마크다운을 HTML로 렌더 → 화면 표시.
5. **인쇄/PDF**: 같은 보기 페이지에서 브라우저 인쇄(Ctrl/⌘+P) → `print.css`가 A4로 분할.

## 상태 관리
- 별도 전역 상태 라이브러리(Redux 등)는 **쓰지 않는다**(MVP에 과함).
- 데이터 조회는 서버(Server Component) + Supabase에서, 편집기·트리의 일시적 상태는 React `useState`로 충분.

## A4 인쇄 분할 (핵심 기능)
화면과 인쇄를 **같은 HTML**로 처리하고, **CSS로만** 분기한다. (별도 PDF 생성 라이브러리 없이 브라우저 기본 인쇄→PDF를 쓴다.)

- **화면**: 일반 흐름 — 가운데 정렬된 `max-width` 컨테이너에 세로로 쭉 이어진다.
- **인쇄**: `@media print`에서 `@page { size: A4; margin: 20mm; }` 적용.
- **페이지 나눔 규칙**:
  - *자동*: 내용이 A4를 넘으면 브라우저가 자동으로 다음 장으로 넘긴다.
  - *요소 보호*: 표·이미지·코드블록은 중간에 잘리지 않도록 `break-inside: avoid`. 제목이 페이지 끝에 홀로 남지 않도록 `break-after: avoid`.
  - *수동 페이지 나눔*: 마크다운 본문에 `<!-- pagebreak -->` 주석을 넣으면, 렌더링 시 페이지나눔 요소로 변환해 인쇄에서 강제로 새 장에서 시작(`break-before: page`).
  - *UI 숨김*: 인쇄 시 사이드바·버튼 등은 `display: none`.

`styles/print.css` 예시(개념용):
```css
@media print {
  @page { size: A4; margin: 20mm; }
  .app-sidebar, .app-toolbar, .no-print { display: none; }
  .markdown-view { max-width: none; }
  table, pre, img, figure { break-inside: avoid; }
  h1, h2, h3 { break-after: avoid; }
  .page-break { break-before: page; }
}
```
