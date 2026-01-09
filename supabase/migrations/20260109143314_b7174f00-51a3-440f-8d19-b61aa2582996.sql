-- Add hero banner image field to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN hero_image_url TEXT DEFAULT NULL;