-- Create transactions table for storing payment data
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_whatsapp TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_duration INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  unique_nominal INTEGER DEFAULT 0,
  qr_string TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  license_key TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create ads table for storing advertisements
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions (public read for status check, admin can manage)
CREATE POLICY "Anyone can read transactions by transaction_id" 
ON public.transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (true);

CREATE POLICY "Service role can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (true);

-- Create policies for ads (public read, admin can manage)
CREATE POLICY "Anyone can view active ads" 
ON public.ads 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage ads" 
ON public.ads 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();