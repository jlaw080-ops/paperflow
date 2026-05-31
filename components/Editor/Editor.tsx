'use client'

import { useState, useEffect } from 'react'
import type { Document } from '@/lib/types'
import MarkdownView from '@/components/MarkdownView/MarkdownView'

interface EditorProps {
  document: Document
  onSave: (id: string, updates: { title: string; content: string; slug: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function Editor({ document, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(document.content ?? '')
  const [slug, setSlug] = useState(document.slug ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // 문서가 바뀌면 상태 초기화
  useEffect(() => {
    setTitle(document.title)
    setContent(document.content ?? '')
    setSlug(document.slug ?? '')
    setMode('edit')
    setSaved(false)
  }, [document.id])

  async function handleSave() {
    setSaving(true)
    await onSave(document.id, { title, content, slug })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const viewUrl = slug ? `/view/${slug}` : null

  async function handleCopyLink() {
    if (!viewUrl) return
    const fullUrl = `${window.location.origin}${viewUrl}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 권한 거부·비보안 컨텍스트 폴백: 직접 복사할 수 있게 표시
      window.prompt('아래 링크를 복사하세요:', fullUrl)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <div
        className="app-toolbar flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        <input
          className="flex-1 text-base font-medium bg-transparent outline-none"
          style={{ color: 'var(--text)' }}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목"
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMode('edit')}
            className="text-xs px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: mode === 'edit' ? 'var(--accent)' : 'transparent',
              color: mode === 'edit' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${mode === 'edit' ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            편집
          </button>
          <button
            onClick={() => setMode('preview')}
            className="text-xs px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: mode === 'preview' ? 'var(--accent)' : 'transparent',
              color: mode === 'preview' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${mode === 'preview' ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            미리보기
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50 shrink-0"
          style={{
            background: saved ? '#D1FAE5' : 'var(--accent)',
            color: saved ? '#065F46' : '#fff',
          }}
        >
          {saving ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
        </button>
      </div>

      {/* 슬러그 / 공개 링크 */}
      <div
        className="no-print flex items-center gap-2 px-4 py-1.5 border-b text-xs shrink-0"
        style={{ borderColor: 'var(--border)', background: '#F9FAFB', color: 'var(--text-secondary)' }}
      >
        <span>공개 링크:</span>
        <span>/view/</span>
        <input
          className="flex-1 bg-transparent outline-none"
          style={{ color: 'var(--text)' }}
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, ''))}
          placeholder="url-slug"
        />
        {viewUrl && (
          <>
            <button
              onClick={handleCopyLink}
              className="px-2 py-0.5 rounded-md transition-colors shrink-0"
              style={{
                border: '1px solid var(--border)',
                color: copied ? '#065F46' : 'var(--text-secondary)',
                background: copied ? '#D1FAE5' : 'transparent',
              }}
            >
              {copied ? '복사됨 ✓' : '링크 복사'}
            </button>
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:opacity-75 shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              열기 ↗
            </a>
          </>
        )}
      </div>

      {/* 편집 / 미리보기 영역 */}
      <div className="flex-1 overflow-auto">
        {mode === 'edit' ? (
          <textarea
            className="w-full h-full p-6 resize-none outline-none"
            style={{
              fontFamily: "'D2Coding', ui-monospace, monospace",
              fontSize: '14px',
              lineHeight: '1.7',
              color: 'var(--text)',
              background: 'var(--bg)',
            }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="마크다운을 입력하세요…&#10;&#10;<!-- pagebreak --> 를 넣으면 인쇄 시 새 페이지가 시작됩니다."
            spellCheck={false}
          />
        ) : (
          <MarkdownView content={content} />
        )}
      </div>

      {/* 위험 영역 */}
      <div
        className="no-print flex items-center justify-end px-4 py-2 border-t shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={async () => {
            if (confirm(`"${title}" 문서를 삭제하시겠습니까?`)) {
              await onDelete(document.id)
            }
          }}
          className="text-xs px-3 py-1 rounded-md transition-colors"
          style={{ color: '#B91C1C', border: '1px solid #FCA5A5' }}
        >
          문서 삭제
        </button>
      </div>
    </div>
  )
}
