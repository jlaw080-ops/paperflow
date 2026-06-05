'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/types'
import FileTree from '@/components/FileTree/FileTree'
import Editor from '@/components/Editor/Editor'
import ImportDropzone from '@/components/ImportDropzone/ImportDropzone'

interface EditorDashboardProps {
  initialDocuments: Document[]
  userId: string
  userEmail: string
}

export default function EditorDashboard({ initialDocuments, userId, userEmail }: EditorDashboardProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)
      .order('sort_order')
    if (data) setDocuments(data as Document[])
  }, [userId])

  async function handleNewFolder(parentId: string | null) {
    const title = prompt('폴더 이름:')
    if (!title?.trim()) return
    await supabase.from('documents').insert({
      parent_id: parentId,
      type: 'folder',
      title: title.trim(),
      content: null,
      slug: null,
      sort_order: 999,
      owner_id: userId,
    })
    await refresh()
  }

  async function handleNewDoc(parentId: string | null) {
    const title = prompt('문서 제목:') ?? '새 문서'
    const slug = `${title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '')}-${Date.now()}`
    const { data } = await supabase.from('documents').insert({
      parent_id: parentId,
      type: 'doc',
      title: title.trim() || '새 문서',
      content: '',
      slug,
      sort_order: 999,
      owner_id: userId,
    }).select().single()

    await refresh()
    if (data) setSelectedDoc(data as Document)
  }

  async function handleRename(id: string, title: string) {
    await supabase.from('documents').update({ title }).eq('id', id)
    await refresh()
    if (selectedDoc?.id === id) setSelectedDoc(prev => prev ? { ...prev, title } : null)
  }

  async function handleDelete(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    await refresh()
    if (selectedDoc?.id === id) setSelectedDoc(null)
  }

  async function handleSave(id: string, updates: { title: string; content: string; slug: string }) {
    await supabase.from('documents').update({
      title: updates.title,
      content: updates.content,
      slug: updates.slug || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await refresh()
    setSelectedDoc(prev => prev ? { ...prev, ...updates } : null)
  }

  async function handleMove(id: string, targetParentId: string | null) {
    await supabase.from('documents').update({ parent_id: targetParentId }).eq('id', id)
    await refresh()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header
        className="app-header flex items-center px-4 py-2 border-b shrink-0 no-print"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>PaperFlow</span>
        <span className="flex-1" />
        <span className="text-xs mr-3" style={{ color: 'var(--text-secondary)' }}>{userEmail}</span>
        <button
          onClick={handleLogout}
          className="text-xs px-2.5 py-1 rounded-md transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          로그아웃
        </button>
      </header>

      {/* 본문 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside
          className="app-sidebar flex flex-col border-r shrink-0 no-print"
          style={{ width: 'var(--sidebar-width)', borderColor: 'var(--border)' }}
        >
          {/* 사이드바 상단 액션 */}
          <div
            className="flex items-center gap-1 px-3 py-2 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => handleNewFolder(null)}
              className="flex-1 text-xs px-2 py-1 rounded-md transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              + 폴더
            </button>
            <button
              onClick={() => handleNewDoc(null)}
              className="flex-1 text-xs px-2 py-1 rounded-md transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              + 문서
            </button>
          </div>

          {/* 파일 트리 */}
          <FileTree
            documents={documents}
            selectedId={selectedDoc?.id ?? null}
            onSelect={setSelectedDoc}
            onNewFolder={handleNewFolder}
            onNewDoc={handleNewDoc}
            onRename={handleRename}
            onDelete={handleDelete}
            onMove={handleMove}
          />

          {/* .md 가져오기 */}
          <div className="border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
            <ImportDropzone
              userId={userId}
              parentId={null}
              onImported={refresh}
            />
          </div>
        </aside>

        {/* 에디터 영역 */}
        <main className="flex-1 overflow-hidden">
          {selectedDoc ? (
            <Editor
              key={selectedDoc.id}
              document={selectedDoc}
              userId={userId}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full"
              style={{ color: 'var(--text-secondary)' }}
            >
              <p className="text-sm">좌측에서 문서를 선택하거나 새로 만드세요.</p>
              <p className="text-xs mt-1">.md 파일을 끌어다 놓아 가져올 수도 있습니다.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
