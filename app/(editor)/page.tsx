import { createClient } from '@/lib/supabase/server'
import type { Document } from '@/lib/types'
import EditorDashboard from '@/components/EditorDashboard'

export default async function EditorPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('sort_order')

  return <EditorDashboard initialDocuments={(documents ?? []) as Document[]} />
}
