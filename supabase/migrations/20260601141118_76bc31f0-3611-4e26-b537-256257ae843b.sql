
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- Restrict bucket listing: only allow reading own paths (user-id-prefixed) is overkill here; instead simply remove broad SELECT and rely on direct URL access for public bucket
DROP POLICY IF EXISTS "linen-photos read public" ON storage.objects;
-- Public bucket files are still accessible via their public URL even without a SELECT policy on storage.objects (Supabase serves them via CDN).
-- Re-add a narrow SELECT for authenticated users so the app can list its own uploads if needed.
CREATE POLICY "linen-photos auth select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'linen-photos');
