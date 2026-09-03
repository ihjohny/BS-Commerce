-- Seed Attributes, Locales, Dynamic Properties, and Link to Products
BEGIN;

-- 1. Insert Attributes
INSERT INTO attributes (id, key, type, slug, website, featured, display_order, created_at, updated_at)
VALUES
  ('11111111-1111-4111-a111-000000000001', 'brand-apple', 'brand', 'apple', 'https://apple.com', true, 1, now(), now()),
  ('11111111-1111-4111-a111-000000000002', 'brand-sony', 'brand', 'sony', 'https://sony.com', true, 2, now(), now()),
  ('11111111-1111-4111-a111-000000000003', 'brand-samsung', 'brand', 'samsung', 'https://samsung.com', true, 3, now(), now()),
  ('11111111-1111-4111-a111-000000000004', 'brand-logitech', 'brand', 'logitech', 'https://logitech.com', true, 4, now(), now()),
  ('11111111-1111-4111-a111-000000000005', 'brand-bose', 'brand', 'bose', 'https://bose.com', true, 5, now(), now()),
  ('11111111-1111-4111-a111-000000000006', 'brand-nike', 'brand', 'nike', 'https://nike.com', true, 6, now(), now()),
  ('11111111-1111-4111-a111-000000000007', 'brand-anker', 'brand', 'anker', 'https://anker.com', true, 7, now(), now()),
  ('11111111-1111-4111-a111-000000000008', 'brand-hydro-flask', 'brand', 'hydro-flask', 'https://hydroflask.com', true, 8, now(), now()),
  ('22222222-2222-4222-a222-000000000001', 'series-pro', 'series', 'pro-series', NULL, true, 10, now(), now()),
  ('22222222-2222-4222-a222-000000000002', 'series-eco', 'series', 'eco-edition', NULL, true, 11, now(), now()),
  ('22222222-2222-4222-a222-000000000003', 'series-studio', 'series', 'studio-master', NULL, false, 12, now(), now())
ON CONFLICT (key) DO NOTHING;

-- 2. Insert Attributes Locales (English & Bengali)
INSERT INTO attributes_locales (label, description, _locale, _parent_id)
VALUES
  ('Apple', 'Pioneering premium consumer electronics, personal computers, and innovative mobile devices.', 'en', '11111111-1111-4111-a111-000000000001'),
  ('অ্যাপল', 'প্রিমিয়াম কনজিউমার ইলেকট্রনিক্স এবং উদ্ভাবনী ডিভাইস।', 'bn', '11111111-1111-4111-a111-000000000001'),

  ('Sony', 'World leader in high-resolution audio, cutting-edge optics, and premium consumer electronics.', 'en', '11111111-1111-4111-a111-000000000002'),
  ('সোনি', 'উচ্চ মানের অডিও এবং প্রিমিয়াম ইলেকট্রনিক্স।', 'bn', '11111111-1111-4111-a111-000000000002'),

  ('Samsung', 'Global innovator in smart home ecosystems, displays, and advanced mobile hardware.', 'en', '11111111-1111-4111-a111-000000000003'),
  ('স্যামসাং', 'স্মার্ট হোম এবং আধুনিক প্রযুক্তির গ্লোবাল উদ্ভাবক।', 'bn', '11111111-1111-4111-a111-000000000003'),

  ('Logitech', 'Precision productivity peripherals, ergonomic workplace accessories, and creator tools.', 'en', '11111111-1111-4111-a111-000000000004'),
  ('লজিটেক', 'কার্যক্ষমতা ও সুবিধার জন্য নিখুঁত কম্পিউটার অনুষঙ্গ।', 'bn', '11111111-1111-4111-a111-000000000004'),

  ('Bose', 'Acoustic research leader engineering industry-defining noise cancelling sound equipment.', 'en', '11111111-1111-4111-a111-000000000005'),
  ('বোস', 'প্রিমিয়াম নয়েজ ক্যানসেলিং অডিও সরঞ্জাম।', 'bn', '11111111-1111-4111-a111-000000000005'),

  ('Nike', 'Inspiring everyday lifestyle, athletic performance gear, and ergonomic carry essentials.', 'en', '11111111-1111-4111-a111-000000000006'),
  ('নাইকি', 'আধুনিক লাইফস্টাইল এবং টেকসই অ্যাক্টিভ গিয়ার।', 'bn', '11111111-1111-4111-a111-000000000006'),

  ('Anker', 'Charging and connectivity pioneer delivering ultra-fast GaN power banks, hubs, and cables.', 'en', '11111111-1111-4111-a111-000000000007'),
  ('অ্যাঙ্কার', 'দ্রুত চার্জিং এবং টেকসই কানেক্টিভিটি সমাধান।', 'bn', '11111111-1111-4111-a111-000000000007'),

  ('Hydro Flask', 'High-performance vacuum insulated stainless steel bottles, tumblers, and mugs.', 'en', '11111111-1111-4111-a111-000000000008'),
  ('হাইড্রো ফ্লাস্ক', 'উন্নত মানের তাপ-নিরোধক বোতল ও ট্রাভেল মগ।', 'bn', '11111111-1111-4111-a111-000000000008'),

  ('Pro Series', 'Flagship grade specifications engineered for professional standards and demanding workflows.', 'en', '22222222-2222-4222-a222-000000000001'),
  ('প্রো সিরিজ', 'প্রফেশনাল মান ও উচ্চ কার্যক্ষমতার পণ্য।', 'bn', '22222222-2222-4222-a222-000000000001'),

  ('Eco Edition', 'Sustainably crafted, energy efficient, and eco-friendly design footprint.', 'en', '22222222-2222-4222-a222-000000000002'),
  ('ইকো এডিশন', 'পরিবেশ-বান্ধব এবং টেকসই উপাদান নির্মিত।', 'bn', '22222222-2222-4222-a222-000000000002'),

  ('Studio Master', 'Acoustically tuned and precision-calibrated audio engineering series.', 'en', '22222222-2222-4222-a222-000000000003'),
  ('স্টুডিও মাস্টার', 'স্টুডিও কোয়ালিটি সাউন্ড টিউনড সিরিজ।', 'bn', '22222222-2222-4222-a222-000000000003')
ON CONFLICT (_locale, _parent_id) DO NOTHING;

-- 3. Insert Dynamic Properties
INSERT INTO attributes_properties (id, _parent_id, _order, property_key, property_value, property_type)
VALUES
  ('prop-apple-1', '11111111-1111-4111-a111-000000000001', 1, 'originCountry', 'United States', 'text'),
  ('prop-apple-2', '11111111-1111-4111-a111-000000000001', 2, 'warranty', '1 Year AppleCare Warranty', 'text'),

  ('prop-sony-1', '11111111-1111-4111-a111-000000000002', 1, 'originCountry', 'Japan', 'text'),
  ('prop-sony-2', '11111111-1111-4111-a111-000000000002', 2, 'soundTech', 'Hi-Res Audio & LDAC', 'text'),

  ('prop-samsung-1', '11111111-1111-4111-a111-000000000003', 1, 'originCountry', 'South Korea', 'text'),
  ('prop-samsung-2', '11111111-1111-4111-a111-000000000003', 2, 'ecosystem', 'SmartThings & Knox Security', 'text'),

  ('prop-logi-1', '11111111-1111-4111-a111-000000000004', 1, 'originCountry', 'Switzerland', 'text'),
  ('prop-logi-2', '11111111-1111-4111-a111-000000000004', 2, 'connectivity', 'Lightspeed Wireless 2.4GHz', 'text'),

  ('prop-bose-1', '11111111-1111-4111-a111-000000000005', 1, 'originCountry', 'United States', 'text'),
  ('prop-bose-2', '11111111-1111-4111-a111-000000000005', 2, 'noiseCancellation', 'Active Acoustic Noise Cancelling', 'text'),

  ('prop-nike-1', '11111111-1111-4111-a111-000000000006', 1, 'originCountry', 'United States', 'text'),
  ('prop-nike-2', '11111111-1111-4111-a111-000000000006', 2, 'material', 'Dri-FIT Recycled Performance Poly', 'text'),

  ('prop-anker-1', '11111111-1111-4111-a111-000000000007', 1, 'originCountry', 'United States', 'text'),
  ('prop-anker-2', '11111111-1111-4111-a111-000000000007', 2, 'powerTech', 'GaNPrime Fast Charge', 'text'),

  ('prop-hydro-1', '11111111-1111-4111-a111-000000000008', 1, 'originCountry', 'United States', 'text'),
  ('prop-hydro-2', '11111111-1111-4111-a111-000000000008', 2, 'insulation', 'TempShield Double Wall Vacuum', 'text'),
  ('prop-hydro-3', '11111111-1111-4111-a111-000000000008', 3, 'materialGrade', '18/8 Pro Grade Stainless Steel', 'text')
ON CONFLICT (id) DO NOTHING;

-- 4. Tag Existing Products with Attributes in products_rels
-- Clear existing attribute relations first to ensure clean idempotent run
DELETE FROM products_rels WHERE path = 'attributes';

-- Assign Brands based on name/slug matching
-- Hydro Flask (Mugs, Tumblers, Bottles)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000008', 1
FROM products p
WHERE p.slug ILIKE '%mug%' OR p.slug ILIKE '%bottle%' OR p.slug ILIKE '%tumbler%' OR p.slug ILIKE '%flask%';

-- Sony & Bose (Audio, Earbuds, Headphones)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000002', 1
FROM products p
WHERE (p.slug ILIKE '%earbud%' OR p.slug ILIKE '%audio%' OR p.slug ILIKE '%sound%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000005', 1
FROM products p
WHERE (p.slug ILIKE '%headphone%' OR p.slug ILIKE '%speaker%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Anker (Routers, Cables, Chargers, Hubs)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000007', 1
FROM products p
WHERE (p.slug ILIKE '%router%' OR p.slug ILIKE '%cable%' OR p.slug ILIKE '%charger%' OR p.slug ILIKE '%hub%' OR p.slug ILIKE '%power%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Logitech (Keyboards, Mice, Desks, Accessories)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000004', 1
FROM products p
WHERE (p.slug ILIKE '%keyboard%' OR p.slug ILIKE '%mouse%' OR p.slug ILIKE '%desk%' OR p.slug ILIKE '%mat%' OR p.slug ILIKE '%pad%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Nike (Backpacks, Bags, Apparel, Organizers)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000006', 1
FROM products p
WHERE (p.slug ILIKE '%backpack%' OR p.slug ILIKE '%bag%' OR p.slug ILIKE '%tote%' OR p.slug ILIKE '%sleeve%' OR p.slug ILIKE '%organizer%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Samsung (Smart Home, Sensors, Lighting, Monitors)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000003', 1
FROM products p
WHERE (p.slug ILIKE '%smart%' OR p.slug ILIKE '%sensor%' OR p.slug ILIKE '%lamp%' OR p.slug ILIKE '%light%')
  AND NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Apple (Remaining tech / premium electronics)
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '11111111-1111-4111-a111-000000000001', 1
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM products_rels r WHERE r.parent_id = p.id AND r.path = 'attributes');

-- Also add 'Pro Series' series attribute to products with 'pro' or 'max'
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '22222222-2222-4222-a222-000000000001', 2
FROM products p
WHERE p.slug ILIKE '%pro%' OR p.slug ILIKE '%max%';

-- Also add 'Eco Edition' to stainless mug products
INSERT INTO products_rels (parent_id, path, attributes_id, "order")
SELECT p.id, 'attributes', '22222222-2222-4222-a222-000000000002', 2
FROM products p
WHERE p.slug ILIKE '%mug%' OR p.slug ILIKE '%bottle%';

COMMIT;
