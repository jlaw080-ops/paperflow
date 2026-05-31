'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImportDropzoneProps {
  userId: string
  parentId: string | null
  onImported: () => void
}

export default function ImportDropzone({ userId, parentId, onImported }: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function processFiles(files: FileList) {
    const mdFiles = Array.from(files).filter(f => f.name.endsWith('.md'))
    if (mdFiles.length === 0) {
      setError('.md 파일만 가져올 수 있습니다.')
      return
    }

    setImporting(true)
    setError(null)

    const supabase = createClient()
    const results = await Promise.allSettled(
      mdFiles.map(async (file, i) => {
        const content = await file.text()
        const title = file.name.replace(/\.md$/, '')
        const slug = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '')}-${Date.now() + i}`

        const { error } = await supabase.from('documents').insert({
          parent_id: parentId,
          type: 'doc',
          title,
          content,
          slug,
          sort_order: 999,
          owner_id: userId,
        })
        if (error) throw error
      })
    )

    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) setError(`${failed}개 파일을 가져오지 못했습니다.`)

    setImporting(false)
    onImported()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
  }

  return (
    <div className="px-3 py-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center rounded-md cursor-pointer transition-colors text-xs py-2"
        style={{
          border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent-light)' : 'transparent',
          color: dragging ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {importing ? '가져오는 중…' : '.md 파일 가져오기'}
      </div>

      {error && (
        <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".md"
        multiple
        className="hidden"
        onChange={e => e.target.files && processFiles(e.target.files)}
      />
    </div>
  )
}
