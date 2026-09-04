-- 로그인 기능 제거에 따른 DB 반영
-- 앱에서 Supabase Auth 로그인을 없앴으므로, 더 이상 auth.uid() 기반 소유자 권한이 존재하지 않는다.
-- documents 테이블은 anon 키로 완전히 공개 접근(읽기/쓰기/삭제) 가능해진다.
-- 주의: 이 마이그레이션 이후 이 앱의 편집 기능은 URL을 아는 누구나 사용할 수 있다.

-- =============================
-- 1. documents 테이블 RLS
-- =============================
DROP POLICY IF EXISTS "owner_all" ON public.documents;
DROP POLICY IF EXISTS "public_read_doc" ON public.documents;

CREATE POLICY "public_all" ON public.documents
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 기존 행은 owner_id 값을 유지하되, 앱이 더 이상 이 값을 채우지 않으므로 NOT NULL 제약을 푼다.
ALTER TABLE public.documents ALTER COLUMN owner_id DROP NOT NULL;

-- =============================
-- 2. document-images 스토리지 버킷
-- =============================
-- 기존 정책(auth.uid() 폴더 격리)을 제거하고 anon 전체 허용으로 교체한다.
DROP POLICY IF EXISTS "doc_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "doc_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "doc_images_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "doc_images_public_read" ON storage.objects;

CREATE POLICY "document_images_public_all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'document-images')
  WITH CHECK (bucket_id = 'document-images');
