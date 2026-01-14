-- Create social_links table for editable icons/links on home page
CREATE TABLE public.social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_type TEXT NOT NULL DEFAULT 'whatsapp',
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_login_history table for device detection
CREATE TABLE public.admin_login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_info JSONB,
  ip_address TEXT,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT true
);

-- Disable RLS for these tables since they are admin-only
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;

-- Allow public read for social_links (for home page)
CREATE POLICY "Social links are viewable by everyone" 
ON public.social_links 
FOR SELECT 
USING (true);

-- Allow all operations for social_links (no auth needed as admin uses password)
CREATE POLICY "Allow all operations on social_links" 
ON public.social_links 
FOR ALL 
USING (true);

-- Allow all operations for admin_login_history
CREATE POLICY "Allow all operations on admin_login_history" 
ON public.admin_login_history 
FOR ALL 
USING (true);

-- Insert default social links
INSERT INTO public.social_links (name, icon_type, url, label, sort_order) VALUES
('whatsapp_group', 'whatsapp-group', 'https://chat.whatsapp.com/HlXpv77lO783OUKWeKPaiG', 'Grup', 0),
('whatsapp_contact', 'whatsapp-contact', 'https://wa.me/6289518030035', 'Kontak', 1);