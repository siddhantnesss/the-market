CREATE TABLE public.market_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  name text NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  trial_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_accounts TO service_role;
ALTER TABLE public.market_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.market_accounts(id) ON DELETE SET NULL,
  seller_name text NOT NULL,
  title text NOT NULL,
  details text NOT NULL,
  price text NOT NULL DEFAULT '',
  quantity text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  contact text NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_listings TO service_role;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.market_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, listing_id)
);
GRANT ALL ON public.market_unlocks TO service_role;
ALTER TABLE public.market_unlocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.market_wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL,
  listing_id uuid REFERENCES public.market_listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_wallet_entries TO service_role;
ALTER TABLE public.market_wallet_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_market_accounts_updated_at BEFORE UPDATE ON public.market_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_market_listings_updated_at BEFORE UPDATE ON public.market_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.market_listings (seller_name, title, details, price, quantity, location, contact, is_sample) VALUES
('Rakesh Bhatia', 'Cotton yarn 30s combed, mill surplus', 'Combed compact cotton yarn, 30s count, ring spun. Mill surplus from an export order. Packed in 45 kg bags, ready to move this week.', '₹268 / kg', '18 tonnes', 'Ludhiana, Punjab', 'Rakesh Bhatia — +91 98140 22117 — rakesh@bhatiayarns.in', true),
('Meena Iyer', 'Cold-pressed groundnut oil, private label', 'Own crushing unit. Can supply 1L and 5L packs under your own label. FSSAI certified, monthly capacity 40,000 litres.', '₹172 / litre', '40,000 L / month', 'Rajkot, Gujarat', 'Meena Iyer — +91 99049 76310 — meena@sunfieldoils.com', true),
('Imran Qureshi', 'CNC machined aluminium parts, job work', 'Two VMC machines and one turning centre free from next month. Tolerances to 20 microns. Looking for steady automotive or fabrication work.', '₹1,100 / hour', '2 machines free', 'Aurangabad, Maharashtra', 'Imran Qureshi — +91 90280 44529 — qureshiprecision@gmail.com', true),
('Sandeep Rathi', 'HDPE granules, reprocessed natural', 'Reprocessed HDPE granules, natural colour, MFI 0.7. Consistent lots from a single source. Sample bag sent free.', '₹78 / kg', '60 tonnes / month', 'Bhiwandi, Maharashtra', 'Sandeep Rathi — +91 98211 30894 — rathi.polymers@outlook.com', true),
('Lakshmi Narayanan', 'Handloom cotton fabric, 20 designs', 'Weaver cluster of 60 looms. Plain and checked cotton, 44 inch width. Can dye to your shade card. Export documentation supported.', '₹210 / metre', '25,000 metres', 'Erode, Tamil Nadu', 'Lakshmi Narayanan — +91 94430 51872 — lakshmi@erodehandloom.in', true),
('Gurpreet Singh', 'Basmati rice 1121 sella, direct from mill', 'Own mill, steam and sella grades. Loading within 72 hours. Have supplied to buyers in Dubai and Jeddah.', '₹92 / kg', '400 tonnes', 'Karnal, Haryana', 'Gurpreet Singh — +91 98960 21745 — gurpreet@karnalgrains.com', true);