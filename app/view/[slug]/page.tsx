import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MarkdownView from '@/components/MarkdownView/MarkdownView'
import PrintButton from '@/components/PrintButton'
import type { Document } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('title')
    .eq('slug', slug)
    .eq('type', 'doc')
    .single()

  return { title: data?.title ? `${data.title} — PaperFlow` : 'PaperFlow' }
}

export default async function ViewPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .eq('type', 'doc')
    .single()

  if (!doc) notFound()

  const document = doc as Document

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 인쇄 버튼 (화면에서만 표시) */}
      <div
        className="no-print flex justify-end px-6 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <PrintButton />
      </div>

      <MarkdownView content={document.content ?? ''} title={document.title} />
    </div>
  )
}
