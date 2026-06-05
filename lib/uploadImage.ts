import { createClient } from '@/lib/supabase/client'

// 버킷 차원에서도 동일하게 강제됨(마이그레이션 document_images_storage 참조).
const BUCKET = 'document-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const

/** <input accept> 및 클라이언트 검증에 쓰는 허용 MIME 목록. */
export const IMAGE_ACCEPT = ALLOWED_TYPES.join(',')

/** 파일명을 스토리지/URL 안전 문자열로 정리한다. 확장자는 보존. */
export function sanitizeImageName(name: string): string {
  const dot = name.lastIndexOf('.')
  const rawBase = dot > 0 ? name.slice(0, dot) : name
  const rawExt = dot > 0 ? name.slice(dot + 1) : ''
  const base =
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image'
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  return `${base}.${ext}`
}

/**
 * 소유자별 폴더로 격리된 스토리지 경로.
 * RLS가 첫 폴더 = auth.uid() 를 강제하므로 userId를 맨 앞에 둔다.
 */
export function buildImagePath(userId: string, fileName: string, now: number): string {
  return `${userId}/${now}-${sanitizeImageName(fileName)}`
}

/** 허용 타입/크기 위반 시 사용자용 한국어 메시지, 통과 시 null. */
export function validateImage(file: File): string | null {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return 'PNG·JPEG·GIF·WebP 이미지만 올릴 수 있습니다.'
  }
  if (file.size > MAX_BYTES) {
    return '이미지 크기는 5MB 이하만 가능합니다.'
  }
  return null
}

export interface UploadedImage {
  url: string
  alt: string
}

/** 이미지를 Storage에 올리고 공개 URL과 기본 alt를 반환한다. 실패 시 throw. */
export async function uploadImage(file: File, userId: string): Promise<UploadedImage> {
  const error = validateImage(file)
  if (error) throw new Error(error)

  const supabase = createClient()
  const path = buildImagePath(userId, file.name, Date.now())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const alt = sanitizeImageName(file.name).replace(/\.[a-z0-9]+$/, '')
  return { url: data.publicUrl, alt }
}
