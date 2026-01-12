-- Create packages table for pricing management
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_per_day INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Service role can manage packages" ON public.packages FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default packages
INSERT INTO public.packages (name, display_name, price_per_day, description, features, is_active, sort_order) VALUES
('NORMAL', 'Normal', 2000, 'Paket dasar dengan semua fitur standar', ARRAY['Semua fitur dasar', 'Update berkala', 'Support all executor'], true, 0),
('VIP', 'VIP', 3000, 'Paket premium dengan fitur eksklusif', ARRAY['Semua fitur Normal', 'Premium scripts', 'Priority support', 'Early access features'], true, 1);