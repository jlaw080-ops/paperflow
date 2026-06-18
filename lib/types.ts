export type DocumentType = 'folder' | 'doc'

// 본문 렌더링 방식. 'markdown'은 react-markdown(GFM), 'html'은 sanitize 후 sandbox iframe.
export type DocumentFormat = 'markdown' | 'html'

export interface Document {
  id: string
  parent_id: string | null
  type: DocumentType
  title: string
  content: string | null
  slug: string | null
  format: DocumentFormat
  sort_order: number
  owner_id: string
  created_at: string
  updated_at: string
}
