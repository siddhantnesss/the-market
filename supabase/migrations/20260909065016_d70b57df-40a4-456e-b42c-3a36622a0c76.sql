DROP TABLE IF EXISTS public.market_wallet_entries CASCADE;
DROP TABLE IF EXISTS public.market_unlocks CASCADE;
DROP TABLE IF EXISTS public.market_listings CASCADE;
DROP TABLE IF EXISTS public.market_accounts CASCADE;

CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL DEFAULT '',
  specifications text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX listings_created_at_idx ON public.listings (created_at DESC);
CREATE INDEX listings_expires_at_idx ON public.listings (expires_at);

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES
('copy', jsonb_build_object(
  'brand', 'THE MARKET',
  'tagline', 'We help you find buyers.',
  'enterLabel', 'Enter',
  'sellButton', 'I want to sell something.',
  'sellHeading', 'What do you have to sell?',
  'searchPlaceholder', 'search The Market',
  'emptyMarket', 'the market is waiting...',
  'noResults', 'maybe search for something different?',
  'expiryNote', 'any listing stays on for 24 hours',
  'unlockLabel', 'Unlock',
  'contactLabel', 'Contact',
  'submitLabel', 'Enter The Market',
  'photosLabel', 'Add up to 5',
  'instagramHandle', '@siddhantness',
  'instagramUrl', 'https://instagram.com/siddhantness'
)),
('settings', jsonb_build_object(
  'listingHours', 24,
  'maxPhotos', 5,
  'productNameMax', 50,
  'specificationsMax', 100,
  'contactMax', 50
)),
('theme', jsonb_build_object(
  'background', '#F5F0E6',
  'text', '#141414',
  'secondary', '#5A5A5A',
  'border', '#D8D2C4'
));