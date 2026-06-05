'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Components } from 'react-markdown'
import MermaidDiagram from './MermaidDiagram'
import TableOfContents from './TableOfContents'
import { buildToc } from './toc'

// 코드블록의 텍스트 내용을 안전하게 추출 (children이 문자열/배열/엘리먼트 혼합일 수 있음)
function extractText(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props?: { children?: unknown } }).props?.children)
  }
  return ''
}

interface MarkdownViewProps {
  content: string
  title?: string
}

// <!-- pagebreak --> 를 .page-break div로 변환
function preprocessContent(content: string): string {
  return content.replace(/<!--\s*pagebreak\s*-->/gi, '\n<div class="page-break"></div>\n')
}

const components: Components = {
  // 인라인 HTML (page-break div 등) 허용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  div: ({ className, children, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  // ```mermaid 코드블록 → 다이어그램으로 렌더. 그 외 코드는 기본 <code> 유지.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ node, className, children, ...props }: any) => {
    if (/\blanguage-mermaid\b/.test(className || '')) {
      return <MermaidDiagram code={extractText(children).replace(/\n$/, '')} />
    }
    return <code className={className} {...props}>{children}</code>
  },
  // mermaid 블록은 <pre> 래퍼를 제거 (<pre><figure> 잘못된 중첩 방지)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ node, children, ...props }: any) => {
    const child = Array.isArray(children) ? children[0] : children
    const cls = child?.props?.className || ''
    if (/\blanguage-mermaid\b/.test(cls)) return <>{children}</>
    return <pre {...props}>{children}</pre>
  },
}

// h1~h3에 목차와 매칭되는 id를 부여하는 컴포넌트를 생성.
// CRITICAL: 렌더 중 상태를 가진 슬러거를 호출하면 React StrictMode 이중 렌더에서 id가 어긋나
//   하이드레이션 불일치가 발생한다. 따라서 id는 소스 라인(node.position) → idByLine 순수 조회로 부여한다.
// node prop은 DOM으로 새어 나가면 경고가 나므로 구조분해로 제거한다.
function makeHeading(Tag: 'h1' | 'h2' | 'h3', idByLine: Map<number, string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function Heading({ node, children, ...props }: any) {
    const line: number | undefined = node?.position?.start?.line
    const id = line != null ? idByLine.get(line) : undefined
    return <Tag id={id} {...props}>{children}</Tag>
  }
  Heading.displayName = `Heading(${Tag})`
  return Heading
}

function buildHeadingComponents(idByLine: Map<number, string>): Components {
  return {
    h1: makeHeading('h1', idByLine),
    h2: makeHeading('h2', idByLine),
    h3: makeHeading('h3', idByLine),
  }
}

export default function MarkdownView({ content, title }: MarkdownViewProps) {
  // ReactMarkdown이 파싱하는 문자열과 동일한 processed로 TOC를 만들어야 라인 번호가 일치한다.
  const processed = preprocessContent(content)
  const toc = useMemo(() => buildToc(processed), [processed])
  const idByLine = useMemo(() => new Map(toc.map(item => [item.line, item.id])), [toc])

  const allComponents: Components = useMemo(
    () => ({ ...components, ...buildHeadingComponents(idByLine) }),
    [idByLine]
  )

  return (
    <div className="mv-shell">
      <div className="mv-layout">
        {toc.length > 1 && <TableOfContents items={toc} />}

        <article
          className="markdown-view"
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: '2rem 1.5rem',
            color: 'var(--text)',
            fontFamily: "'Pretendard', -apple-system, sans-serif",
            fontSize: '16px',
            lineHeight: '1.7',
          }}
        >
          {title && (
            <h1
              id="doc-top"
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#1e40af',
                marginBottom: '2rem',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid #1e40af',
              }}
            >
              {title}
            </h1>
          )}

          <div className="prose-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={allComponents}
              // raw HTML(page-break div) 허용
              allowedElements={undefined}
              unwrapDisallowed={false}
            >
              {processed}
            </ReactMarkdown>
          </div>
        </article>
      </div>

      <style>{`
        .prose-content h1 { font-size: 1.75rem; font-weight: 700; color: #1e40af; margin: 2rem 0 1rem; }
        .prose-content h2 { font-size: 1.375rem; font-weight: 600; color: #1e40af; border-left: 4px solid #1e40af; padding-left: 10px; margin: 1.75rem 0 0.75rem; }
        .prose-content h3 { font-size: 1.125rem; font-weight: 600; color: #374151; margin: 1.5rem 0 0.5rem; }
        .prose-content p  { margin: 0 0 1rem; }
        .prose-content ul, .prose-content ol { margin: 0 0 1rem 1.5rem; }
        .prose-content li { margin-bottom: 0.25rem; }
        .prose-content blockquote {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-secondary);
        }
        .prose-content code {
          font-family: 'D2Coding', ui-monospace, monospace;
          font-size: 0.875rem;
          background: #F3F4F6;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
        }
        .prose-content pre {
          background: #F3F4F6;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0 0 1rem;
          border: 1px solid var(--border);
        }
        .prose-content pre code { background: none; padding: 0; }
        .prose-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 1rem;
          font-size: 0.9375rem;
        }
        .prose-content th, .prose-content td {
          border: 1px solid var(--border);
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .prose-content th { background: #1e40af; color: #fff; font-weight: 600; }
        .prose-content a { color: var(--accent); text-decoration: underline; }
        .prose-content img { max-width: 100%; height: auto; }
        .prose-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
        .prose-content .page-break { break-before: page; }
        .prose-content .mermaid-figure { margin: 1.5rem 0; text-align: center; }
        .prose-content .mermaid-figure svg { max-width: 100%; height: auto; }
        .prose-content .mermaid-loading { color: var(--text-secondary); font-size: 0.875rem; padding: 1rem 0; }
        .prose-content .mermaid-error { background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; }

        /* 클릭 이동 시 헤딩이 스크롤 컨테이너 최상단에 딱 붙지 않도록 여백 */
        .prose-content h1, .prose-content h2, .prose-content h3 { scroll-margin-top: 1.5rem; }

        /* ── 좌측 동적 목차 레이아웃 ──
           .mv-shell이 컨테이너 → 편집기 미리보기(좁음)·열기 화면(넓음) 각각의
           실제 가용 폭에 맞춰 목차 표시 여부를 결정한다. */
        .mv-shell { container-type: inline-size; }
        .mv-layout {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 2.5rem;
          padding: 1.5rem 0;
        }
        /* 목차를 본문과 구분되는 독립 카드로 표현 */
        .mv-toc {
          position: sticky;
          top: 1.5rem;
          align-self: flex-start;
          flex-shrink: 0;
          width: 248px;
          max-height: calc(100vh - 3rem);
          overflow-y: auto;
          padding: 1.25rem 1rem;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          font-family: 'Pretendard', -apple-system, sans-serif;
        }
        .mv-toc-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 0.75rem;
          padding: 0 0 0.75rem 0.5rem;
          border-bottom: 1px solid var(--border); /* 제목과 항목 구분선 */
        }
        .mv-toc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.15rem; }
        .mv-toc-item { margin: 0; }
        .mv-toc-item a {
          display: block;
          padding: 0.45rem 0.6rem;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.45;
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
          word-break: keep-all;       /* 한글은 단어 단위로만 줄바꿈 */
          overflow-wrap: break-word;
        }
        .mv-toc-item.depth-1 a { font-weight: 600; color: var(--text); }
        .mv-toc-item.depth-2 a { padding-left: 1.1rem; }
        .mv-toc-item.depth-3 a { padding-left: 1.7rem; font-size: 0.8125rem; }
        .mv-toc-item a:hover { color: var(--text); background: #F3F4F6; }
        /* 활성 항목: 본문 제목과 동일한 파랑(#1e40af) 알약으로 강조 */
        .mv-toc-item a.active,
        .mv-toc-item a.active:hover {
          color: #1e40af;
          background: #EEF2FF;
          font-weight: 700;
        }

        /* 가용 폭이 좁으면(편집기 분할 화면 등) 목차를 숨기고 본문만 중앙 정렬 */
        @container (max-width: 1080px) {
          .mv-toc { display: none; }
        }
      `}</style>
    </div>
  )
}
