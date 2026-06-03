'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocItem } from './toc'

interface TableOfContentsProps {
  items: TocItem[]
}

// 헤딩의 스크롤 컨테이너를 찾는다. 편집기 미리보기는 내부 overflow-auto div,
// 열기 화면은 윈도우 스크롤이므로 둘을 구분해 하단 도달 여부를 정확히 판정한다.
function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null // null이면 윈도우/문서 스크롤
}

const ACTIVE_THRESHOLD_PX = 130 // 뷰포트 상단에서 이 선을 넘긴 마지막 헤딩이 현재 섹션

// 위치 기반 스크롤스파이.
// - 본문이 움직이면(스크롤) 상단 선을 넘긴 마지막 헤딩을 활성으로 → 목차가 따라 이동.
// - 캡처 단계 scroll 리스너로 내부 div 스크롤·윈도우 스크롤을 하나로 처리.
// - 하단 도달 시 마지막 헤딩을 활성으로(밴드 방식의 "마지막 섹션 미활성" 문제 해결).
function useScrollSpy(ids: string[]): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '')
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (ids.length === 0) return

    function compute() {
      const els = ids
        .map(id => [id, document.getElementById(id)] as const)
        .filter((pair): pair is readonly [string, HTMLElement] => pair[1] !== null)
      if (els.length === 0) return

      const scrollParent = getScrollParent(els[0][1])
      const atBottom = scrollParent
        ? scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 4
        : window.innerHeight + window.scrollY >=
          (document.scrollingElement ?? document.documentElement).scrollHeight - 4

      if (atBottom) {
        setActiveId(els[els.length - 1][0])
        return
      }

      let current = els[0][0]
      for (const [id, el] of els) {
        if (el.getBoundingClientRect().top <= ACTIVE_THRESHOLD_PX) current = id
        else break
      }
      setActiveId(current)
    }

    function onScroll() {
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        compute()
      })
    }

    compute() // 초기 위치 반영
    // capture=true: 내부 스크롤 div의 scroll 이벤트는 버블링하지 않으므로 캡처 단계로 잡는다.
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [ids.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  return [activeId, setActiveId]
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const ids = items.map(item => item.id)
  const [activeId, setActiveId] = useScrollSpy(ids)

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
    setActiveId(id) // 클릭 즉시 반영 (스크롤 애니메이션 완료 전)
  }

  return (
    <nav className="mv-toc no-print" aria-label="목차">
      <p className="mv-toc-title">목차</p>
      <ul className="mv-toc-list">
        {items.map(item => {
          const isActive = item.id === activeId
          return (
            <li key={item.id} className={`mv-toc-item depth-${item.depth}`}>
              <a
                href={`#${item.id}`}
                onClick={e => handleClick(e, item.id)}
                className={isActive ? 'active' : ''}
                aria-current={isActive ? 'location' : undefined}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
