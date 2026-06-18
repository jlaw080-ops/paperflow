'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

interface HtmlViewProps {
  html: string
  title?: string
}

// 공개 페이지(/view)에 임의 HTML을 노출하므로 2중 방어를 적용한다.
//   1) DOMPurify로 <script>·이벤트 핸들러(on*)·javascript: URL 등을 제거(sanitize)
//   2) sandbox iframe(스크립트 비활성)에 렌더 → JS 실행 원천 차단 + 리포트 자체 CSS를
//      앱 전역 스타일과 격리(self-contained HTML 문서가 깨지지 않고 그대로 보임)
export default function HtmlView({ html, title }: HtmlViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // DOMPurify는 window가 필요하므로 마운트 후(클라이언트)에서만 sanitize한다.
  // srcdoc은 state가 아니라 ref로 명령형 설정 → SSR 하이드레이션 불일치를 피한다.
  useEffect(() => {
    const clean = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      // DOMPurify는 on* 핸들러와 javascript: URL을 기본 제거한다. 아래는 추가 차단.
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'form'],
    })
    if (iframeRef.current) iframeRef.current.srcdoc = clean
  }, [html])

  // 내용 높이에 맞춰 iframe 높이를 맞춘다. allow-same-origin이라 contentDocument 접근 가능.
  function resize() {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (iframe && doc?.documentElement) {
      iframe.style.height = `${doc.documentElement.scrollHeight}px`
    }
  }

  function handleLoad() {
    resize()
    // 이미지 등 늦게 로드되는 리소스로 높이가 변할 수 있어 한 번 더 측정한다.
    setTimeout(resize, 300)
  }

  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <iframe
      ref={iframeRef}
      title={title ?? 'HTML 문서'}
      onLoad={handleLoad}
      // allow-same-origin만 부여: 높이 측정을 위한 동일 출처 접근은 허용하되,
      // allow-scripts는 주지 않아 iframe 내부 JS 실행을 차단한다.
      sandbox="allow-same-origin"
      className="html-view-frame"
      style={{ width: '100%', border: 'none', display: 'block', minHeight: '60vh' }}
    />
  )
}
