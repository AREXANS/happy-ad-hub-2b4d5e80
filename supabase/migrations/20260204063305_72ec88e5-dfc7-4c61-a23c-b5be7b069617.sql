-- Add proof_image column to transactions table for payment proof screenshots
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_image TEXT;

-- Add qr_url settings for primary and fallback URLs
INSERT INTO public.site_settings (key, value, description)
VALUES ('qr_primary_url', 'https://larabert-qrgen.hf.space/v1/create-qr-code?size=500x500&style=2&color=0f7bbb&data=', 'Primary QR code generator URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.site_settings (key, value, description)
VALUES ('qr_fallback_url', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=', 'Fallback QR code generator URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;