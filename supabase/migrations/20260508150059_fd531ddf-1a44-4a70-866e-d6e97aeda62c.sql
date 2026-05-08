-- User credit balances
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages credits"
  ON public.user_credits FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log of credit changes
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('purchase', 'deduction', 'refund', 'admin_grant')),
  description TEXT,
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user_id ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages transactions"
  ON public.credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create credit row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Backfill existing users
INSERT INTO public.user_credits (user_id, balance)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Atomic deduction: returns new balance, or NULL if insufficient
CREATE OR REPLACE FUNCTION public.deduct_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance INTEGER;
BEGIN
  UPDATE public.user_credits
  SET balance = balance - _amount,
      total_used = total_used + _amount
  WHERE user_id = _user_id AND balance >= _amount
  RETURNING balance INTO _new_balance;

  IF _new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_user_id, -_amount, 'deduction', _description);

  RETURN _new_balance;
END;
$$;

-- Atomic credit (for purchases / admin grants); idempotent on stripe_session_id
CREATE OR REPLACE FUNCTION public.add_credits(
  _user_id UUID,
  _amount INTEGER,
  _kind TEXT,
  _description TEXT DEFAULT NULL,
  _stripe_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance INTEGER;
BEGIN
  -- Idempotency: if a session_id was provided and already recorded, no-op
  IF _stripe_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT balance INTO _new_balance FROM public.user_credits WHERE user_id = _user_id;
    RETURN _new_balance;
  END IF;

  INSERT INTO public.user_credits (user_id, balance, total_purchased)
  VALUES (_user_id, _amount, CASE WHEN _kind = 'purchase' THEN _amount ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + _amount,
        total_purchased = public.user_credits.total_purchased + CASE WHEN _kind = 'purchase' THEN _amount ELSE 0 END
  RETURNING balance INTO _new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description, stripe_session_id)
  VALUES (_user_id, _amount, _kind, _description, _stripe_session_id);

  RETURN _new_balance;
END;
$$;