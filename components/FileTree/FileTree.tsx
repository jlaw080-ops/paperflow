'use client'

import { useState } from 'react'
import type { Document } from '@/lib/types'

interface FileTreeProps {
  documents: Document[]
  selectedId: string | null
  onSelect: (doc: Document) => void
  onNewFolder: (parentId: string | null) => void
  onNewDoc: (parentId: string | null) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

interface TreeNode extends Document {
  children: TreeNode[]
}

function buildTree(docs: Document[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  docs.forEach(doc => {
    map.set(doc.id, { ...doc, children: [] })
  })

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

interface TreeNodeProps {
  node: TreeNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  renamingId: string | null
  renameValue: string
  onSelect: (doc: Document) => void
  onToggle: (id: string) => void
  onNewFolder: (parentId: string) => void
  onNewDoc: (parentId: string) => void
  onStartRename: (id: string, title: string) => void
  onFinishRename: (id: string) => void
  onRenameChange: (v: string) => void
  onDelete: (id: string) => void
}

function TreeNodeItem({
  node, depth, selectedId, expandedIds, renamingId, renameValue,
  onSelect, onToggle, onNewFolder, onNewDoc,
  onStartRename, onFinishRename, onRenameChange, onDelete
}: TreeNodeProps) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isRenaming = renamingId === node.id

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md cursor-pointer select-none"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          background: isSelected ? 'var(--accent-light)' : 'transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text)',
        }}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
      >
        {/* 아이콘 */}
        <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)', width: '16px' }}>
          {isFolder ? (isExpanded ? '▾' : '▸') : '·'}
        </span>

        {/* 제목 */}
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
            onDoubleClick={e => {
              e.stopPropagation()
              onStartRename(node.id, node.title)
            }}
          >
            {node.title}
          </span>
        )}

        {/* 폴더 액션 버튼들 */}
        {isFolder && !isRenaming && (
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              title="새 폴더"
              className="text-xs px-1 hover:text-accent rounded"
              style={{ color: 'var(--text-secondary)' }}
              onClick={e => { e.stopPropagation(); onNewFolder(node.id) }}
            >＋📁</button>
            <button
              title="새 문서"
              className="text-xs px-1 hover:text-accent rounded"
              style={{ color: 'var(--text-secondary)' }}
              onClick={e => { e.stopPropagation(); onNewDoc(node.id) }}
            >＋📄</button>
          </span>
        )}

        {/* 공통 삭제 버튼 */}
        {!isRenaming && (
          <button
            title="삭제"
            className="hidden group-hover:block text-xs px-1 rounded"
            style={{ color: '#B91C1C' }}
            onClick={e => {
              e.stopPropagation()
              if (confirm(`"${node.title}" 을(를) 삭제하시겠습니까?`)) {
                onDelete(node.id)
              }
            }}
          >✕</button>
        )}
      </div>

      {/* 하위 항목 */}
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
              onSelect={onSelect}
              onToggle={onToggle}
              onNewFolder={onNewFolder}
              onNewDoc={onNewDoc}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              onRenameChange={onRenameChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree({
  documents, selectedId,
  onSelect, onNewFolder, onNewDoc, onRename, onDelete
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const tree = buildTree(documents)

  function toggleFolder(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function startRename(id: string, title: string) {
    setRenamingId(id)
    setRenameValue(title)
  }

  function finishRename(id: string) {
    if (renameValue.trim()) onRename(id, renameValue.trim())
    setRenamingId(null)
  }

  return (
    <div className="py-2 overflow-y-auto flex-1">
      {tree.length === 0 && (
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
          onSelect={onSelect}
          onToggle={toggleFolder}
          onNewFolder={onNewFolder}
          onNewDoc={onNewDoc}
          onStartRename={startRename}
          onFinishRename={finishRename}
          onRenameChange={setRenameValue}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
