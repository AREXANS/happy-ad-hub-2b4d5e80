
-- Add duration and lifetime support to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS fixed_price integer DEFAULT NULL;
