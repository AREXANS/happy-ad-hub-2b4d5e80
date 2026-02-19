
-- Create package_discounts table
CREATE TABLE public.package_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_type TEXT NOT NULL DEFAULT 'duration_based',
  min_days INTEGER,
  max_days INTEGER,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  promo_code TEXT,
  package_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  notify_users BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.package_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package_discounts" ON public.package_discounts FOR SELECT USING (true);
CREATE POLICY "Service role can manage package_discounts" ON public.package_discounts FOR ALL USING (true);

-- Create lua_scripts table
CREATE TABLE public.lua_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  script_type TEXT NOT NULL DEFAULT 'main',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lua_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lua_scripts" ON public.lua_scripts FOR SELECT USING (true);
CREATE POLICY "Service role can manage lua_scripts" ON public.lua_scripts FOR ALL USING (true);

-- Add proof_image column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_image TEXT;

-- Add device_id column to transactions (used in create-payment)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS device_id TEXT;
