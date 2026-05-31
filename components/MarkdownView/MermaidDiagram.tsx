'use client'

import { useEffect, useRef, useState } from 'react'

// mermaid는 무겁다(수백 KB). 다이어그램이 실제로 있는 문서에서만 클라이언트에 로드한다.
// 모듈 1회만 import·initialize 하도록 캐시.
type MermaidApi = (typeof import('mermaid'))['default']
let mermaidPromise: Promise<MermaidApi> | null = null

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(mod => {
      const mermaid = mod.default
      // securityLevel:'strict' — 공개 /view 라우트에서 신뢰할 수 없는 콘텐츠를
      // 렌더하므로 클릭 이벤트·HTML 라벨 비활성 + DOMPurify 정화. raw HTML은 켜지 않는다.
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
      return mermaid
    })
  }
  return mermaidPromise
}

let idCounter = 0

interface MermaidDiagramProps {
  code: string
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const idRef = useRef(`mermaid-${(idCounter += 1)}`)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setFailed(false)
    loadMermaid()
      .then(mermaid => mermaid.render(idRef.current, code))
      .then(({ svg }) => { if (!cancelled) setSvg(svg) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [code])

  // 구문 오류 등 렌더 실패 시 원본 코드를 그대로 보여줌 (조용히 깨지지 않게)
  if (failed) {
    return (
      <pre className="mermaid-error" aria-label="다이어그램 렌더 실패">
        <code>{code}</code>
      </pre>
    )
  }

  if (!svg) {
    return <div className="mermaid-loading">다이어그램 렌더링 중…</div>
  }

  // mermaid가 securityLevel:'strict'로 정화한 SVG만 주입한다 (원본 사용자 HTML 아님).
  return (
    <figure
      className="pipeline-diagram mermaid-figure"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
