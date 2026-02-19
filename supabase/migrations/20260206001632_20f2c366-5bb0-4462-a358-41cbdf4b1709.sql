-- Add max_days column to support range-based discounts (e.g., 20-30 days)
ALTER TABLE public.package_discounts ADD COLUMN IF NOT EXISTS max_days integer NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.package_discounts.max_days IS 'Maximum days for range-based discounts. If set, discount only applies when min_days <= purchase_days <= max_days';

-- Update social links to only have WhatsApp active by default
UPDATE public.social_links SET is_active = false WHERE icon_type != 'whatsapp';