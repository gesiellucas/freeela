DROP POLICY IF EXISTS "upload_own" ON storage.objects;
CREATE POLICY "upload_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'freeela' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "read_own" ON storage.objects;
CREATE POLICY "read_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'freeela' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "delete_own" ON storage.objects;
CREATE POLICY "delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'freeela' AND auth.uid()::text = (storage.foldername(name))[1]);