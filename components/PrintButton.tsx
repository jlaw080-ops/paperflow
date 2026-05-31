'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs px-3 py-1.5 rounded-md transition-colors"
      style={{
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      🖨 인쇄 / PDF
    </button>
  )
}
