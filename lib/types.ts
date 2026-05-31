export type DocumentType = 'folder' | 'doc'

export interface Document {
  id: string
  parent_id: string | null
  type: DocumentType
  title: string
  content: string | null
  slug: string | null
  sort_order: number
  owner_id: string
  created_at: string
  updated_at: string
}
