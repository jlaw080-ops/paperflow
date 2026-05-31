-- PaperFlow 초기 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하거나
-- Supabase CLI: supabase db push 로 적용합니다.

-- =============================
-- 1. documents 테이블
-- =============================
CREATE TABLE IF NOT EXISTS public.documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('folder', 'doc')),
  title       text NOT NULL,
  content     text,
  slug        text UNIQUE,
  sort_order  integer NOT NULL DEFAULT 999,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS documents_owner_id_idx ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS documents_parent_id_idx ON public.documents(parent_id);
CREATE INDEX IF NOT EXISTS documents_slug_idx ON public.documents(slug) WHERE slug IS NOT NULL;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================
-- 2. RLS (Row Level Security)
-- =============================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 소유자는 자신의 문서에 대해 모든 권한
CREATE POLICY "owner_all" ON public.documents
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 누구나 doc 타입 문서를 slug로 조회 가능 (공개 보기)
CREATE POLICY "public_read_doc" ON public.documents
  FOR SELECT
  TO anon, authenticated
  USING (type = 'doc');

-- =============================
-- 설명
-- =============================
-- 보안 핵심:
--   - 쓰기/수정/삭제는 owner_id = auth.uid() 일 때만 허용
--   - 읽기: doc 타입은 anon(비로그인)도 가능 → /view/[slug] 공개 열람
--   - 폴더 목록은 소유자만 조회 가능 (public_read_doc 정책이 doc만 허용)
-- 주의:
--   - 이 마이그레이션은 멱등성을 위해 IF NOT EXISTS 사용
--   - 실제 운영 전 Supabase Auth에서 이메일 확인 설정을 원하는 대로 조정하세요
