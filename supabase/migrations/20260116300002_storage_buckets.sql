-- ============================================
-- SUPABASE STORAGE BUCKETS
-- Pre dokumenty (poistky, STK, servis, pokuty)
-- ============================================

-- Vytvorit bucket pre dokumenty
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE RLS POLICIES
-- Struktura: documents/{household_id}/{type}/{record_id}/{filename}
-- ============================================

-- Policy pre SELECT (citanie)
CREATE POLICY "Users can read own household documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id::text = (storage.foldername(name))[1]
    AND hm.user_id = auth.uid()
  )
);

-- Policy pre INSERT (upload)
CREATE POLICY "Users can upload to own household"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id::text = (storage.foldername(name))[1]
    AND hm.user_id = auth.uid()
    AND hm.role IN ('owner', 'admin', 'member')
  )
);

-- Policy pre UPDATE (prepisanie)
CREATE POLICY "Users can update own household documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id::text = (storage.foldername(name))[1]
    AND hm.user_id = auth.uid()
    AND hm.role IN ('owner', 'admin', 'member')
  )
);

-- Policy pre DELETE (mazanie)
CREATE POLICY "Users can delete own household documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id::text = (storage.foldername(name))[1]
    AND hm.user_id = auth.uid()
    AND hm.role IN ('owner', 'admin')
  )
);
