-- =================================================================
-- ZAL BARI & POS SİSTEMİ — MİQRASİYA V2 (LOQO & STORAGE DƏSTƏYİ)
-- =================================================================
-- Bu skripti Supabase Dashboard -> SQL Editor bölməsində icra edin.
-- Mövcud məlumatlarınızı (satışlar, borclar, məhsullar) POZMADAN
-- fərdi loqo və Supabase Storage qovluğunu aktivləşdirir.

-- 1. App Settings cədvəlinə fərdi loqo sütununu əlavə et
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Loqolar üçün "app-assets" Storage Bucket-ini yarat (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage fayllarını hər kəsin oxuması üçün icazə (Public Read Policy)
DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
CREATE POLICY "Public Read Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'app-assets');

-- 4. Loqo yükləmək və dəyişmək üçün icazə (Insert & Update Policy)
DROP POLICY IF EXISTS "Allow Upload Assets" ON storage.objects;
CREATE POLICY "Allow Upload Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "Allow Update Assets" ON storage.objects;
CREATE POLICY "Allow Update Assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "Allow Delete Assets" ON storage.objects;
CREATE POLICY "Allow Delete Assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'app-assets');

-- 5. Realtime cədvəllər siyahısında app_settings-in olduğundan əmin ol
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
