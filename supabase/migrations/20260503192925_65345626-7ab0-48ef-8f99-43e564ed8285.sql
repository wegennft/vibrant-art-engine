
-- Revoke execute from public role on all security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public;

-- Grant has_role back to authenticated only (needed for RLS policies)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

-- Restrict bucket listing: drop the broad SELECT and add a path-based one
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
CREATE POLICY "Anyone can view site assets by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets' AND (storage.foldername(name))[1] IN ('logos', 'banners'));
