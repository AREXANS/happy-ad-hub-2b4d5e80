-- Add link_location to social_links for separating links for home vs payment success
ALTER TABLE public.social_links ADD COLUMN IF NOT EXISTS link_location text NOT NULL DEFAULT 'home';

-- Add is_approved to admin_login_history for device confirmation
ALTER TABLE public.admin_login_history ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Create site_settings table for loadstring script and other settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for site_settings
CREATE POLICY "Anyone can view site_settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage site_settings" 
ON public.site_settings 
FOR ALL 
USING (true);

-- Insert default loadstring script setting
INSERT INTO public.site_settings (key, value, description)
VALUES ('loadstring_script', 'loadstring(game:HttpGet("https://pastebin.com/raw/rwH3C1Xb"))()', 'Script yang ditampilkan setelah pembayaran berhasil')
ON CONFLICT (key) DO NOTHING;