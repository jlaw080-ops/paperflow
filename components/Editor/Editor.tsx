'use client'

import { useState, useEffect, useRef } from 'react'
import type { Document } from '@/lib/types'
import MarkdownView from '@/components/MarkdownView/MarkdownView'
import { uploadImage, IMAGE_ACCEPT } from '@/lib/uploadImage'

interface EditorProps {
  document: Document
  userId: string
  onSave: (id: string, updates: { title: string; content: string; slug: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function Editor({ document, userId, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(document.content ?? '')
  const [slug, setSlug] = useState(document.slug ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 현재 커서 위치에 텍스트를 삽입하고 커서를 삽입 끝으로 옮긴다(controlled textarea).
  function insertAtCursor(text: string) {
    const ta = textareaRef.current
    if (!ta) {
      setContent(c => c + text)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    setContent(c => c.slice(0, start) + text + c.slice(end))
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  // 이미지 파일들을 업로드하고 표준 마크다운 ![alt](url) 로 본문에 삽입한다.
  // 업로드 중에는 placeholder를 넣었다가 완료/실패 시 교체·제거한다.
  async function handleImageFiles(files: File[]) {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (images.length === 0) return
    setUploadError(null)

    for (const file of images) {
      const placeholder = `![업로드 중…](uploading-${Date.now()}-${Math.random().toString(36).slice(2)})`
      insertAtCursor(`${placeholder}\n`)
      try {
        const { url, alt } = await uploadImage(file, userId)
        setContent(c => c.replace(placeholder, `![${alt}](${url})`))
      } catch (e) {
        setContent(c => c.replace(`${placeholder}\n`, '').replace(placeholder, ''))
        setUploadError(e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.')
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files)
    if (files.some(f => f.type.startsWith('image/'))) {
      e.preventDefault()
      handleImageFiles(files)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer.files)
    if (files.some(f => f.type.startsWith('image/'))) {
      e.preventDefault()
      handleImageFiles(files)
    }
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
          {mode === 'edit' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2.5 py-1 rounded-md transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              title="이미지를 올려 본문에 삽입 (붙여넣기·드래그드롭도 가능)"
            >
              + 이미지
            </button>
          )}
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
          <div className="flex flex-col h-full">
            {uploadError && (
              <p className="text-xs px-6 pt-2" style={{ color: '#B91C1C' }}>{uploadError}</p>
            )}
            <textarea
              ref={textareaRef}
              className="w-full flex-1 p-6 resize-none outline-none"
              style={{
                fontFamily: "'D2Coding', ui-monospace, monospace",
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'var(--text)',
                background: 'var(--bg)',
              }}
              value={content}
              onChange={e => setContent(e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              placeholder="마크다운을 입력하세요…&#10;&#10;이미지는 붙여넣기·드래그드롭하거나 위 + 이미지 버튼으로 올립니다.&#10;<!-- pagebreak --> 를 넣으면 인쇄 시 새 페이지가 시작됩니다."
              spellCheck={false}
            />
          </div>
        ) : (
          <MarkdownView content={content} />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleImageFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
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
