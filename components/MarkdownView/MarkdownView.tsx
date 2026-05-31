'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import MermaidDiagram from './MermaidDiagram'

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

export default function MarkdownView({ content, title }: MarkdownViewProps) {
  const processed = preprocessContent(content)

  return (
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
          remarkPlugins={[remarkGfm]}
          components={components}
          // raw HTML(page-break div) 허용
          allowedElements={undefined}
          unwrapDisallowed={false}
        >
          {processed}
        </ReactMarkdown>
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
      `}</style>
    </article>
  )
}
