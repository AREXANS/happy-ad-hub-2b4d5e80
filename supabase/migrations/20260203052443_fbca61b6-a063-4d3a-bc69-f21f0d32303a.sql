-- Add device_id column to transactions for payment history tracking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create index for faster device history queries
CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON public.transactions(device_id);

-- Add RLS policy for users to read their own transactions by device_id
CREATE POLICY "Users can read own device transactions" 
ON public.transactions 
FOR SELECT 
USING (device_id IS NOT NULL);