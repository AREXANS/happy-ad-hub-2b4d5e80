-- Create table for package discounts and promo codes
CREATE TABLE public.package_discounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    discount_type TEXT NOT NULL DEFAULT 'duration_based', -- duration_based, promo_code, percentage
    min_days INTEGER, -- Minimum days to apply discount (for duration_based)
    discount_percent INTEGER NOT NULL DEFAULT 0, -- Discount percentage
    promo_code TEXT, -- Promo code (for promo_code type)
    package_name TEXT, -- Apply to specific package or NULL for all
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    notify_users BOOLEAN NOT NULL DEFAULT false, -- Send notification to all users when active
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_discounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage package discounts" 
ON public.package_discounts 
FOR ALL 
USING (true);

CREATE POLICY "Anyone can read active discounts" 
ON public.package_discounts 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_package_discounts_updated_at
BEFORE UPDATE ON public.package_discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for discounts
ALTER PUBLICATION supabase_realtime ADD TABLE public.package_discounts;