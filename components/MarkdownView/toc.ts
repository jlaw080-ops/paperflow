// 목차(TOC) 추출 + 헤딩 ID 생성 유틸 (순수 함수)
//
// CRITICAL: 목차 항목의 id와 MarkdownView가 헤딩에 부여하는 id는 반드시 일치해야 한다.
// 둘 다 createSlugger()로 "문서 순서대로" 같은 텍스트 시퀀스를 처리하면 동일한 id가 나온다.

export interface TocItem {
  depth: number // 1 | 2 | 3
  text: string
  id: string
  line: number // 파싱 대상 문자열에서의 1-based 라인 번호 (헤딩↔id 매칭 키)
}

// 텍스트 → URL 친화 슬러그. 한글/영문/숫자 보존(유니코드), 공백→하이픈.
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // 문자/숫자/공백/하이픈만 남김 (한글 포함)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// 중복 헤딩 텍스트에 -1, -2 … 접미사를 붙이는 슬러거. 호출 순서에 상태가 의존한다.
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text: string): string => {
    const base = slugify(text) || 'section'
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base}-${n}`
  }
}

// 헤딩 라인의 인라인 마크다운(강조/코드/링크)을 렌더 결과와 동일한 평문으로 정리.
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [텍스트](url) → 텍스트
    .replace(/[*_`~]/g, '')
    .trim()
}

// 마크다운 본문에서 h1~h3 헤딩을 문서 순서대로 추출. 코드펜스 내부는 무시한다.
// CRITICAL: ReactMarkdown이 파싱하는 것과 "동일한 문자열"을 넘겨야 line이 node.position과 일치한다.
export function buildToc(content: string): TocItem[] {
  const slug = createSlugger()
  const items: TocItem[] = []
  const lines = content.split('\n')
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/)
    if (!m) continue

    const text = stripInlineMarkdown(m[2])
    if (!text) continue
    items.push({ depth: m[1].length, text, id: slug(text), line: i + 1 })
  }

  return items
}
