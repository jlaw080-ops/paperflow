'use client'

import { useState, useRef } from 'react'
import type { Document } from '@/lib/types'

interface FileTreeProps {
  documents: Document[]
  selectedId: string | null
  onSelect: (doc: Document) => void
  onNewFolder: (parentId: string | null) => void
  onNewDoc: (parentId: string | null) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, targetParentId: string | null) => void
}

interface TreeNode extends Document {
  children: TreeNode[]
}

function buildTree(docs: Document[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  docs.forEach(doc => map.set(doc.id, { ...doc, children: [] }))
  docs.forEach(doc => {
    const node = map.get(doc.id)!
    if (doc.parent_id && map.has(doc.parent_id)) {
      map.get(doc.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    nodes.forEach(n => sort(n.children))
    return nodes
  }
  return sort(roots)
}

function collectDescendantIds(id: string, docs: Document[]): Set<string> {
  const result = new Set<string>([id])
  const queue = [id]
  while (queue.length > 0) {
    const cur = queue.shift()!
    docs.forEach(d => {
      if (d.parent_id === cur) { result.add(d.id); queue.push(d.id) }
    })
  }
  return result
}

// 드래그 이벤트에서 가장 가까운 [data-drag-id] 요소 찾기
function getDragTarget(e: React.DragEvent): { id: string; type: string } | null {
  const el = (e.target as HTMLElement).closest('[data-drag-id]') as HTMLElement | null
  if (!el) return null
  return { id: el.dataset.dragId!, type: el.dataset.dragType ?? '' }
}

// ────────────────────────────────────────────
// TreeNodeItem
// ────────────────────────────────────────────
interface TreeNodeProps {
  node: TreeNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  renamingId: string | null
  renameValue: string
  draggedId: string | null
  dragOverId: string | null
  onSelect: (doc: Document) => void
  onToggle: (id: string) => void
  onNewFolder: (parentId: string) => void
  onNewDoc: (parentId: string) => void
  onStartRename: (id: string, title: string) => void
  onFinishRename: (id: string) => void
  onRenameChange: (v: string) => void
  onDelete: (id: string) => void
  onStartMove: (id: string, title: string) => void
}

function TreeNodeItem({
  node, depth, selectedId, expandedIds, renamingId, renameValue,
  draggedId, dragOverId,
  onSelect, onToggle, onNewFolder, onNewDoc,
  onStartRename, onFinishRename, onRenameChange, onDelete, onStartMove,
}: TreeNodeProps) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isRenaming = renamingId === node.id
  const isDragging = draggedId === node.id
  const isDragOver = dragOverId === node.id && !isDragging

  return (
    <div style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div
        data-drag-id={node.id}
        data-drag-type={node.type}
        draggable={!isRenaming}
        className="group flex items-center gap-1 rounded-md cursor-pointer select-none transition-colors"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          background: isDragOver
            ? 'var(--accent-light)'
            : isSelected
            ? 'var(--accent-light)'
            : 'transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text)',
          outline: isDragOver && isFolder ? '1px solid var(--accent)' : 'none',
          outlineOffset: '-1px',
        }}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
      >
        {/* 아이콘 */}
        <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)', width: '16px' }}>
          {isFolder ? (isExpanded ? '▾' : '▸') : '·'}
        </span>

        {/* 제목 / 이름변경 입력 */}
        {isRenaming ? (
          <input
            autoFocus
            className="flex-1 text-sm outline-none rounded px-1"
            style={{ border: '1px solid var(--accent)', background: '#fff' }}
            value={renameValue}
            onChange={e => onRenameChange(e.target.value)}
            onBlur={() => onFinishRename(node.id)}
            onKeyDown={e => {
              if (e.key === 'Enter') onFinishRename(node.id)
              if (e.key === 'Escape') onFinishRename(node.id)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm truncate"
            onDoubleClick={e => { e.stopPropagation(); onStartRename(node.id, node.title) }}
          >
            {node.title}
          </span>
        )}

        {/* hover 액션 */}
        {!isRenaming && (
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {isFolder && (
              <>
                <button
                  title="새 폴더"
                  className="text-xs px-1 rounded"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={e => { e.stopPropagation(); onNewFolder(node.id) }}
                >＋📁</button>
                <button
                  title="새 문서"
                  className="text-xs px-1 rounded"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={e => { e.stopPropagation(); onNewDoc(node.id) }}
                >＋📄</button>
              </>
            )}
            <button
              title="이동 (클릭)"
              className="text-xs px-1 rounded"
              style={{ color: 'var(--text-secondary)' }}
              onClick={e => { e.stopPropagation(); onStartMove(node.id, node.title) }}
            >↗</button>
            <button
              title="삭제"
              className="text-xs px-1 rounded"
              style={{ color: '#B91C1C' }}
              onClick={e => {
                e.stopPropagation()
                if (confirm(`"${node.title}" 을(를) 삭제하시겠습니까?`)) onDelete(node.id)
              }}
            >✕</button>
          </span>
        )}
      </div>

      {/* 자식 */}
      {isFolder && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              renamingId={renamingId}
              renameValue={renameValue}
              draggedId={draggedId}
              dragOverId={dragOverId}
              onSelect={onSelect}
              onToggle={onToggle}
              onNewFolder={onNewFolder}
              onNewDoc={onNewDoc}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              onRenameChange={onRenameChange}
              onDelete={onDelete}
              onStartMove={onStartMove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// 클릭 이동 모달 (↗ 버튼 fallback)
// ────────────────────────────────────────────
interface MoveModalProps {
  movingTitle: string
  folders: Document[]
  excludedIds: Set<string>
  currentParentId: string | null
  onConfirm: (targetParentId: string | null) => void
  onCancel: () => void
}

function MoveModal({ movingTitle, folders, excludedIds, currentParentId, onConfirm, onCancel }: MoveModalProps) {
  const validFolders = folders.filter(f => !excludedIds.has(f.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg shadow-lg w-72 overflow-hidden"
        style={{ background: '#fff', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            이동: <span className="font-normal">{movingTitle}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>이동할 위치를 선택하세요</p>
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
            onClick={() => onConfirm(null)}
            disabled={currentParentId === null}
          >
            <span>📂</span>
            <span>최상위 (루트)</span>
            {currentParentId === null && (
              <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>현재 위치</span>
            )}
          </button>
          {validFolders.length === 0 && (
            <p className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>이동 가능한 폴더 없음</p>
          )}
          {validFolders.map(folder => {
            const isCurrent = folder.id === currentParentId
            return (
              <button
                key={folder.id}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
                onClick={() => onConfirm(folder.id)}
                disabled={isCurrent}
              >
                <span>📁</span>
                <span className="truncate">{folder.title}</span>
                {isCurrent && (
                  <span className="ml-auto text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>현재 위치</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            className="w-full text-xs py-1.5 rounded-md"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onClick={onCancel}
          >취소</button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// FileTree (root)
// ────────────────────────────────────────────
export default function FileTree({
  documents, selectedId,
  onSelect, onNewFolder, onNewDoc, onRename, onDelete, onMove,
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [movingItem, setMovingItem] = useState<{ id: string; title: string } | null>(null)

  // 드래그 상태
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const tree = buildTree(documents)
  const folders = documents.filter(d => d.type === 'folder')

  // ── 트리 기본 동작 ──────────────────────────

  function toggleFolder(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function startRename(id: string, title: string) {
    setRenamingId(id); setRenameValue(title)
  }

  function finishRename(id: string) {
    if (renameValue.trim()) onRename(id, renameValue.trim())
    setRenamingId(null)
  }

  function handleMoveConfirm(targetParentId: string | null) {
    if (movingItem) { onMove(movingItem.id, targetParentId); setMovingItem(null) }
  }

  // ── 드래그 이벤트 (컨테이너 레벨 위임) ─────

  function clearExpandTimer() {
    if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null }
  }

  function handleDragStart(e: React.DragEvent) {
    const target = getDragTarget(e)
    if (!target || target.id === '__root__') return
    setDraggedId(target.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const target = getDragTarget(e)
    const id = target?.id ?? '__root__'

    if (id === dragOverId) return  // 변화 없으면 skip
    setDragOverId(id)
    clearExpandTimer()

    // 폴더 위에 700ms 머물면 자동 펼침
    if (id && id !== '__root__' && target?.type === 'folder' && !expandedIds.has(id)) {
      expandTimerRef.current = setTimeout(() => {
        setExpandedIds(prev => new Set([...prev, id]))
      }, 700)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    // 컨테이너를 완전히 벗어날 때만 초기화
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverId(null)
      clearExpandTimer()
    }
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverId(null)
    clearExpandTimer()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const target = getDragTarget(e)
    const id = draggedId

    setDraggedId(null)
    setDragOverId(null)
    clearExpandTimer()

    if (!id) return

    const targetId = (target?.id === '__root__' || !target) ? null : target.id
    const targetType = target?.type ?? null

    if (targetId === id) return  // 자기 자신에 드롭

    const excluded = collectDescendantIds(id, documents)
    if (targetId && excluded.has(targetId)) return  // 자손에 드롭 금지

    let newParentId: string | null
    if (!targetId) {
      newParentId = null                                          // 루트 드롭존 or 빈 공간
    } else if (targetType === 'folder') {
      newParentId = targetId                                      // 폴더 안으로 이동
    } else {
      const targetDoc = documents.find(d => d.id === targetId)
      newParentId = targetDoc?.parent_id ?? null                  // 문서와 같은 위치로
    }

    onMove(id, newParentId)
  }

  const movingDoc = movingItem ? documents.find(d => d.id === movingItem.id) : null
  const excludedIds = movingItem ? collectDescendantIds(movingItem.id, documents) : new Set<string>()

  return (
    <>
      <div
        ref={containerRef}
        className="py-2 overflow-y-auto flex-1"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
      >
        {/* 루트 드롭존 — 드래그 중에만 표시 */}
        {draggedId && (
          <div
            data-drag-id="__root__"
            data-drag-type="root"
            className="mx-2 mb-1 rounded-md border-dashed border text-xs text-center py-1.5 transition-colors pointer-events-none"
            style={{
              borderColor: dragOverId === '__root__' ? 'var(--accent)' : 'var(--border)',
              background: dragOverId === '__root__' ? 'var(--accent-light)' : 'transparent',
              color: dragOverId === '__root__' ? 'var(--accent)' : 'var(--text-secondary)',
              pointerEvents: 'none',  // 실제 drop은 부모 컨테이너에서 처리
            }}
          >
            최상위(루트)로 이동
          </div>
        )}

        {tree.length === 0 && !draggedId && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
            문서가 없습니다.
          </p>
        )}

        {tree.map(node => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            renamingId={renamingId}
            renameValue={renameValue}
            draggedId={draggedId}
            dragOverId={dragOverId}
            onSelect={onSelect}
            onToggle={toggleFolder}
            onNewFolder={onNewFolder}
            onNewDoc={onNewDoc}
            onStartRename={startRename}
            onFinishRename={finishRename}
            onRenameChange={setRenameValue}
            onDelete={onDelete}
            onStartMove={(id, title) => setMovingItem({ id, title })}
          />
        ))}
      </div>

      {movingItem && movingDoc && (
        <MoveModal
          movingTitle={movingItem.title}
          folders={folders}
          excludedIds={excludedIds}
          currentParentId={movingDoc.parent_id}
          onConfirm={handleMoveConfirm}
          onCancel={() => setMovingItem(null)}
        />
      )}
    </>
  )
}
