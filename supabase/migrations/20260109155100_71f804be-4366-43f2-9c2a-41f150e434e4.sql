-- Add tracking_url column to orders table
ALTER TABLE public.orders 
ADD COLUMN tracking_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.tracking_url IS 'URL for tracking the order shipment';