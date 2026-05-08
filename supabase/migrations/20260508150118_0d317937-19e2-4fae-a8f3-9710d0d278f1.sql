REVOKE ALL ON FUNCTION public.deduct_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;