-- documents.format 컬럼 추가
-- 본문(content)을 어떤 방식으로 렌더링할지 구분한다.
--   'markdown' (기본) = react-markdown(GFM)로 렌더
--   'html'            = DOMPurify로 sanitize 후 sandbox iframe에 렌더
-- 기존 행은 모두 'markdown'으로 채워지므로 하위 호환된다.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'markdown'
  CHECK (format IN ('markdown', 'html'));
