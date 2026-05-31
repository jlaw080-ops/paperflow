import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MarkdownView from '@/components/MarkdownView/MarkdownView'
import PrintButton from '@/components/PrintButton'
import type { Document } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Next.js는 동적 라우트 파라미터를 URL 디코딩하지 않으므로 한글 등 비ASCII slug가
// %EC%83%88... 형태로 들어온다. DB에는 디코딩된 원문이 저장되어 있어 직접 비교 시 불일치한다.
// 잘못된 인코딩으로 인한 500을 막기 위해 실패 시 원본을 그대로 사용한다.
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('title')
    .eq('slug', decodeSlug(slug))
    .eq('type', 'doc')
    .maybeSingle()

  return { title: data?.title ? `${data.title} — PaperFlow` : 'PaperFlow' }
}

export default async function ViewPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', decodeSlug(slug))
    .eq('type', 'doc')
    .maybeSingle()

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
