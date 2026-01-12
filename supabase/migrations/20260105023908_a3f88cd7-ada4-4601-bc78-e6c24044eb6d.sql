-- Create site_settings table to store background configuration
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  background_type TEXT NOT NULL DEFAULT 'default',
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Service role can manage settings
CREATE POLICY "Service role can manage site settings"
ON public.site_settings
FOR ALL
USING (true);

-- Insert default settings
INSERT INTO public.site_settings (id, background_type)
VALUES ('main', 'default');

-- Add trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();