-- Add hero image position column to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN hero_image_position text DEFAULT 'center';