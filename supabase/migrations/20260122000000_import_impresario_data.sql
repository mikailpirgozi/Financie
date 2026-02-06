-- ============================================
-- IMPORT IMPRESARIO VEHICLES, DOCUMENTS & INSURANCES
-- From Railway database to Finapp Supabase
-- Household: Jaroslav Ragas (impresario.asist@gmail.com)
-- ============================================

-- Household ID for Impresario: 4d40e04b-28fa-445d-8265-b7fbb270913d

-- ============================================
-- 1. INSERT VEHICLES AS ASSETS
-- ============================================

INSERT INTO assets (id, household_id, kind, name, license_plate, vin, mileage, fuel_type, year, current_value, acquisition_value, acquisition_date, created_at, updated_at)
VALUES
  -- BMW
  ('797584b8-d2f0-4871-bd9c-c2ccad61ad4b', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 3', 'KE021LJ', 'WBA8J31020F699349', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('0d3ebf15-2694-40a6-ac02-cacd0266dd26', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 3', 'AA541IN, BT337EY', 'WBA6L71010FJ00658', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('60d3ca92-4901-4ba9-a7ad-33006b3cb369', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 5', 'AA817XJ', 'WBA51BL000WX21732', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('dcaf545f-a09d-4462-b17d-f8bd4a4c4dca', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 5', 'BT071EP', 'WBA51AH070CH24666', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('89fa8646-5eb8-474d-86e8-bba59063f675', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 7', 'BT842FZ, AB756AK', '042FNZFA1Z8801V3S', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('ed47014b-3706-40c8-b27a-3b9ca72e8c0c', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW 7', 'BT669IC', 'WBA21EJ000CM30012', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('1e5729c9-7247-48af-b436-7e50ddcc689f', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW M4', 'AA348MY', 'WBA61AT030CM69698', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('d5d47eae-feae-4b27-8c3e-1c82b8ed3c27', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW M5', 'BT127HC', 'WBS81CH030CK87573', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('4c92ae88-1f22-48c1-b67c-f93bec53cb61', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW X2', 'BT966HC', 'WBAYK710105V52014', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('0782ac89-572f-4cf1-a9ea-147cf40f02fb', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW X4', 'AA260XD', 'WBS21EC0X09W90326', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('011f3598-88ad-4384-85ec-8223f98977c1', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW X6', 'BARBIE1', 'WBATC610409G77084', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('b5fa5762-5735-4029-ad44-63600f764d68', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW X6', 'BT205ER', 'WBAGT810209E19594', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('f9ba22cd-166d-4623-99bf-0da1d07a4ae1', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'BMW XM', 'AA033MU', 'WBS21CS0309T33382', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Ducati
  ('7dc4a502-2b2d-40d6-a7f3-1f83f78277f6', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Ducati Panigale', 'BT252FR', 'ZDM3D00AARB010642', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Ferrari
  ('16a6e5ea-6991-4df2-b162-ae80e63d9282', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Ferrari F8 TRIBUTO', 'MRF8XXX', 'ZFF92LMB000279898', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Hyundai
  ('a1de6668-507d-4232-b9ae-eaefd7d501a5', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Hyundai Santa Fe', 'KE412OD', 'KMHS581HHMU401604', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Jeep
  ('e53b03c9-860d-4a2e-8c4a-df470c5230b5', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Jeep Renegade', 'BL236XM', '1C4BU0000JPH61765', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Land Rover
  ('9f8c7c66-491c-4c9e-8780-21ba0133ce89', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Land Rover Defender', 'krádež - BT900HP', 'SALEA7BU5P2164024', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('0c0ae7e2-07c2-44ad-86de-73312f4902c7', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Land Rover Range Rover', 'ORIN777', 'SALKABBW4RA214301', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Mercedes Benz
  ('9cf446fe-d659-4187-b6e8-666504e567c3', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Mercedes Benz C-Class', 'BT141HV', 'WDD2050151F786894', 0, NULL, 2020, 1.00, 1.00, '2020-01-01', NOW(), NOW()),
  ('c4af341d-4103-4c05-9de0-81f5173e9fd4', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Mercedes Benz C-Class', 'BT671GU', 'WDD2052471F343951', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('d2b31189-a52e-4d93-ae49-b84269ccbe12', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Mercedes Benz S-Class', 'krádež BT725FC', 'W1K2221351A565749', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('00c2c1c4-6680-445c-891a-d0e7a5264ad1', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Mercedes Benz SL', 'AA021PG', 'WDD2314741F056246', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Peugeot
  ('d2ea9b31-157c-414c-955f-c869950f3496', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Peugeot Expert', 'BL374XK', 'VF3VAYHVKKZ004121', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Škoda
  ('31681968-b318-49c1-952b-8357e016c082', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Fabia', 'BT374ES', 'TMBER6PJ3N4039467', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('db97fcca-d4ba-434a-943f-fe53d742edf3', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Kamiq', 'BT774FY', 'TMBGK6NW3N3060384', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('86fbbaaa-2882-47ea-9e1a-6363e03359b7', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Scala', 'BT836BN', 'TMBEK6NW9N3040700', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('e1e87f9e-ec16-4574-bbd5-4f98b722e019', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'BT393BN', 'TMBAH9NPXN7007236', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('850758d6-e053-4bf0-958c-16cbbb998fd4', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'BT484GV', 'TMBJW7NP0M7027410', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('ea06c7f3-41c6-448d-a1e5-e8b7f1bc5474', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'BT495FG', 'TMBJW7NP7M7043829', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('3e24e1d3-d1d4-464a-a590-01d74e970ba5', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'BT037ET', 'BT037ET', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  ('4c5a0e02-2ca1-4fb5-ad31-10b5af813dc5', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'BT565BG', 'VUVWGZTXTR2R1U2K4', 0, NULL, 2021, 1.00, 1.00, '2021-01-01', NOW(), NOW()),
  ('66fa1600-60cc-4b6d-968f-14db456d5a8d', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Škoda Superb', 'krádež - BL064ZF', 'TMBCJ9NP4K7075931', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Toyota
  ('32ac5009-60eb-4f34-9a6a-68bd72b6d9d4', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Toyota Proace', 'AA120CY', 'YARVEEHZ7GZ266517', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW()),
  -- Volvo
  ('b602dd05-32c3-4a32-b0d8-fa5d4ef0ea5e', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'vehicle', 'Volvo XC90', 'AA768LG', 'YV1LFK2V9R1206872', 0, NULL, 2024, 1.00, 1.00, '2024-01-01', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  license_plate = EXCLUDED.license_plate,
  vin = EXCLUDED.vin,
  mileage = EXCLUDED.mileage,
  fuel_type = EXCLUDED.fuel_type,
  year = EXCLUDED.year,
  updated_at = NOW();

-- ============================================
-- 2. INSERT VEHICLE DOCUMENTS (STK, EK, Vignettes, Technical Certificates)
-- ============================================

INSERT INTO vehicle_documents (id, household_id, asset_id, document_type, valid_from, valid_to, price, country, km_state, broker_company, notes, created_at, updated_at)
VALUES
  -- BMW 3 (AA541IN, BT337EY) documents
  ('2e6b7632-f4c3-4466-9576-396e37882388', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'ek', '2024-01-27', '2026-01-26', 0.00, NULL, NULL, NULL, 'evidovaná na starú špz BT337EY', NOW(), NOW()),
  ('4c1f0e50-7e75-4e7b-9df8-0c7633962cf8', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'ek', '2024-01-27', '2026-01-26', 0.00, NULL, NULL, NULL, 'EK platná na starú špz BT337EY', NOW(), NOW()),
  ('589f4f5d-27e8-4166-a2ad-1a03fa863721', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'stk', '2024-01-27', '2026-01-26', 0.00, NULL, NULL, NULL, 'STK platná na starú špz BT337EY', NOW(), NOW()),
  ('e64ea2b7-3ec9-4310-ae7c-c752a75fcb6c', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'stk', '2024-01-27', '2026-01-26', 0.00, NULL, NULL, NULL, 'evidovaná na starú špz BT337EY', NOW(), NOW()),
  ('b9a9e545-29ca-44db-b2da-b2887b46c33b', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'stk', '2025-11-17', '2025-11-17', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('f3d5c0fa-c0c5-47d9-ba24-a2cb907ab944', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'stk', '2025-11-17', '2025-11-17', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('85f6ed43-543d-4c10-8074-5ab029a8a76c', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'technical_certificate', NULL, '2035-11-25', NULL, NULL, NULL, NULL, 'stará špz BT337EY', NOW(), NOW()),
  ('d409633b-7a5d-49d9-b97b-b21021a47ecf', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'technical_certificate', NULL, '2035-11-15', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('66058162-008c-4dc8-b2fa-ea74119f3a13', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'vignette', '2025-05-06', '2026-05-05', 0.00, 'SK', NULL, NULL, NULL, NOW(), NOW()),
  ('707e3d58-7d68-4285-b206-0d453031a829', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0d3ebf15-2694-40a6-ac02-cacd0266dd26', 'vignette', '2025-05-06', '2026-05-05', 0.00, 'SK', NULL, NULL, NULL, NOW(), NOW()),
  -- Jeep Renegade (BL236XM) documents
  ('7597186b-d4a7-4610-a01a-90e69c98a6a4', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'e53b03c9-860d-4a2e-8c4a-df470c5230b5', 'vignette', '2025-10-03', '2025-10-30', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Škoda Superb (BT565BG) documents
  ('9336676e-941d-47a5-8193-2c55bd0260d2', '4d40e04b-28fa-445d-8265-b7fbb270913d', '4c5a0e02-2ca1-4fb5-ad31-10b5af813dc5', 'technical_certificate', NULL, '2035-11-15', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('6c3c961c-b9f4-4ad4-9397-42d12b57398b', '4d40e04b-28fa-445d-8265-b7fbb270913d', '4c5a0e02-2ca1-4fb5-ad31-10b5af813dc5', 'vignette', '2025-04-24', '2026-04-23', 90.00, 'SK', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  document_type = EXCLUDED.document_type,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  price = EXCLUDED.price,
  country = EXCLUDED.country,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- 3. INSERT INSURANCES
-- ============================================

INSERT INTO insurances (id, household_id, asset_id, type, policy_number, company, valid_from, valid_to, price, payment_frequency, km_state, broker_company, green_card_valid_from, green_card_valid_to, notes, created_at, updated_at)
VALUES
  -- BMW 3 (KE021LJ)
  ('56f39e82-e3ec-44e8-af41-5fd38a6e61f0', '4d40e04b-28fa-445d-8265-b7fbb270913d', '797584b8-d2f0-4871-bd9c-c2ccad61ad4b', 'pzp', '6633266279', NULL, '2025-03-04', '2026-03-03', 253.26, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- BMW 7 (BT669IC)
  ('25943ed5-a2ba-4dfe-8f94-7a33ac7a0e03', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'ed47014b-3706-40c8-b27a-3b9ca72e8c0c', 'pzp', '3847078690', NULL, '2025-08-15', '2025-11-14', 126.40, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- BMW M4 (AA348MY)
  ('858a4b0f-634f-4c40-a241-f555b09ed32d', '4d40e04b-28fa-445d-8265-b7fbb270913d', '1e5729c9-7247-48af-b436-7e50ddcc689f', 'kasko', '2409539218', NULL, '2024-05-09', '2025-05-08', 0.00, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('49368d8b-6d46-4be7-808d-bab11d5f3731', '4d40e04b-28fa-445d-8265-b7fbb270913d', '1e5729c9-7247-48af-b436-7e50ddcc689f', 'pzp', '610/905853-8', NULL, '2025-05-09', '2026-05-08', 297.84, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- BMW M5 (BT127HC)
  ('d9a4318e-1b04-48c2-bf68-32f45670bcf0', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'd5d47eae-feae-4b27-8c3e-1c82b8ed3c27', 'pzp_kasko', '5907435878', NULL, '2025-07-27', '2025-10-26', 675.19, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- BMW X2 (BT966HC)
  ('0b6e12a8-4167-4588-8ab3-fd4ebf0fa32d', '4d40e04b-28fa-445d-8265-b7fbb270913d', '4c92ae88-1f22-48c1-b67c-f93bec53cb61', 'pzp_kasko', '111', NULL, '2025-10-03', '2026-10-03', 0.00, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Land Rover Range Rover (ORIN777)
  ('963029a8-e591-4185-85e3-964c529d638e', '4d40e04b-28fa-445d-8265-b7fbb270913d', '0c0ae7e2-07c2-44ad-86de-73312f4902c7', 'pzp', '2410092105', NULL, '2025-02-03', '2026-02-02', 849.35, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Mercedes Benz C-Class (BT141HV)
  ('e65761c7-7744-417e-92bb-93d0bca169be', '4d40e04b-28fa-445d-8265-b7fbb270913d', '9cf446fe-d659-4187-b6e8-666504e567c3', 'pzp_kasko', '6622823885', NULL, '2025-10-03', '2025-11-02', 0.00, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Mercedes Benz SL (AA021PG)
  ('aaabf57c-c21b-48de-a387-49636b3ada17', '4d40e04b-28fa-445d-8265-b7fbb270913d', '00c2c1c4-6680-445c-891a-d0e7a5264ad1', 'kasko', '8880232128', NULL, '2024-07-03', '2024-10-02', 1179.21, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('c3a7a5e8-29ee-4244-bbac-4be0cd777c45', '4d40e04b-28fa-445d-8265-b7fbb270913d', '00c2c1c4-6680-445c-891a-d0e7a5264ad1', 'pzp', '3847038863', NULL, '2025-05-22', '2025-08-21', 74.06, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Škoda Fabia (BT374ES)
  ('195c04cf-ad01-4988-9cdf-fd12ecee8780', '4d40e04b-28fa-445d-8265-b7fbb270913d', '31681968-b318-49c1-952b-8357e016c082', 'pzp', '8050003932/29861', NULL, '2025-04-07', '2026-04-06', 0.00, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Škoda Superb (BT565BG)
  ('d56bab47-7adf-4974-93f2-5ea2b0c8b3fb', '4d40e04b-28fa-445d-8265-b7fbb270913d', '4c5a0e02-2ca1-4fb5-ad31-10b5af813dc5', 'pzp_kasko', '6629571385', NULL, '2025-07-02', '2025-10-01', 377.23, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Toyota Proace (AA120CY)
  ('dc7e7ec7-ccea-4cdd-bfa4-1bd1c2f33f74', '4d40e04b-28fa-445d-8265-b7fbb270913d', '32ac5009-60eb-4f34-9a6a-68bd72b6d9d4', 'pzp_kasko', '6628974625', NULL, '2025-08-24', '2026-08-23', 1518.58, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  -- Volvo XC90 (AA768LG)
  ('a4836e76-5316-4e6d-97d2-f9d4a4669422', '4d40e04b-28fa-445d-8265-b7fbb270913d', 'b602dd05-32c3-4a32-b0d8-fa5d4ef0ea5e', 'pzp', '5905059357', NULL, '2025-08-21', '2026-08-20', 342.72, 'yearly', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  policy_number = EXCLUDED.policy_number,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  price = EXCLUDED.price,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SUMMARY
-- ============================================
-- Imported:
-- - 35 vehicles (assets)
-- - 13 vehicle documents (STK, EK, vignettes, technical certificates)
-- - 14 insurances (PZP, Kasko, PZP+Kasko)
-- All assigned to household: 4d40e04b-28fa-445d-8265-b7fbb270913d (impresario.asist@gmail.com)
