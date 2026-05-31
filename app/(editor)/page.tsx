import { createClient } from '@/lib/supabase/server'
import type { Document } from '@/lib/types'
import EditorDashboard from '@/components/EditorDashboard'

export default async function EditorPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // layout.tsx에서 이미 redirect 처리

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user.id)
    .order('sort_order')

  return (
    <EditorDashboard
      initialDocuments={(documents ?? []) as Document[]}
      userId={user.id}
      userEmail={user.email ?? ''}
    />
  )
}
