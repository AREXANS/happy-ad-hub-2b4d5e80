-- Drop old site_settings table and create new backgrounds table
DROP TABLE IF EXISTS public.site_settings;

-- Create backgrounds table for multiple backgrounds
CREATE TABLE public.backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  background_type TEXT NOT NULL DEFAULT 'image',
  background_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backgrounds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view backgrounds" 
ON public.backgrounds 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage backgrounds" 
ON public.backgrounds 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_backgrounds_updated_at
BEFORE UPDATE ON public.backgrounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();