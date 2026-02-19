
-- Create admin_sessions table (same structure as admin_login_history but used by useDeviceDetection)
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_info JSONB,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT true,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on admin_sessions" ON public.admin_sessions FOR ALL USING (true);

-- Add missing columns to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS fixed_price INTEGER;

-- Add missing column to ads (link_url as alias approach - rename link to link_url)
-- The ads table has 'link' but code expects 'link_url', so add link_url
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS link_url TEXT;
-- Copy existing link data to link_url
UPDATE public.ads SET link_url = link WHERE link_url IS NULL AND link IS NOT NULL;
