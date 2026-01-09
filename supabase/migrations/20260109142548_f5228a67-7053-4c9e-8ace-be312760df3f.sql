-- Add footer settings columns to store_settings table
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS footer_instagram TEXT,
ADD COLUMN IF NOT EXISTS footer_facebook TEXT,
ADD COLUMN IF NOT EXISTS footer_email TEXT,
ADD COLUMN IF NOT EXISTS footer_location TEXT DEFAULT 'Rivera, Uruguay 🇺🇾',
ADD COLUMN IF NOT EXISTS footer_description TEXT,
ADD COLUMN IF NOT EXISTS footer_developer_name TEXT DEFAULT 'Jorge Marquez',
ADD COLUMN IF NOT EXISTS footer_developer_link TEXT DEFAULT 'https://wa.me/59894920949';