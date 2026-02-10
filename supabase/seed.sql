insert into public.filters (
  brand,
  series,
  nominal_w,
  nominal_h,
  thickness,
  merv,
  sku,
  upc,
  product_name,
  url,
  notes
) values
  ('FilterFit Pro', 'CleanAir', 16, 25, 1, 11, 'FFP-16251-11', '100000000001', 'CleanAir MERV 11 16x25x1', 'https://example.com/filters/ffp-16251-11', 'Popular residential size.'),
  ('FilterFit Pro', 'CleanAir', 16, 25, 1, 13, 'FFP-16251-13', '100000000002', 'CleanAir MERV 13 16x25x1', 'https://example.com/filters/ffp-16251-13', 'Higher filtration.'),
  ('FilterFit Pro', 'CleanAir', 16, 25, 1, 8, 'FFP-16251-08', '100000000003', 'CleanAir MERV 8 16x25x1', 'https://example.com/filters/ffp-16251-08', null),
  ('FilterFit Pro', 'PureFlow', 20, 25, 1, 8, 'FFP-20251-08', '100000000004', 'PureFlow MERV 8 20x25x1', null, null),
  ('FilterFit Pro', 'PureFlow', 20, 20, 1, 11, 'FFP-20201-11', '100000000005', 'PureFlow MERV 11 20x20x1', null, null),
  ('FilterFit Pro', 'PureFlow', 16, 20, 1, 8, 'FFP-16201-08', '100000000006', 'PureFlow MERV 8 16x20x1', null, null),
  ('FilterFit Pro', 'PureFlow', 14, 25, 1, 8, 'FFP-14251-08', '100000000007', 'PureFlow MERV 8 14x25x1', null, null),
  ('FilterFit Pro', 'PureFlow', 12, 24, 1, 8, 'FFP-12241-08', '100000000008', 'PureFlow MERV 8 12x24x1', null, null),
  ('FilterFit Pro', 'DeepGuard', 16, 25, 4, 13, 'FFP-16254-13', '100000000009', 'DeepGuard MERV 13 16x25x4', null, 'Long-life 4-inch.'),
  ('FilterFit Pro', 'DeepGuard', 20, 25, 4, 13, 'FFP-20254-13', '100000000010', 'DeepGuard MERV 13 20x25x4', null, null),
  ('FilterFit Pro', 'DeepGuard', 20, 20, 4, 11, 'FFP-20204-11', '100000000011', 'DeepGuard MERV 11 20x20x4', null, null),
  ('FilterFit Pro', 'DeepGuard', 16, 20, 4, 11, 'FFP-16204-11', '100000000012', 'DeepGuard MERV 11 16x20x4', null, null),
  ('FilterFit Pro', 'Everyday', 18, 24, 1, 8, 'FFP-18241-08', '100000000013', 'Everyday MERV 8 18x24x1', null, null),
  ('FilterFit Pro', 'Everyday', 18, 30, 1, 11, 'FFP-18301-11', '100000000014', 'Everyday MERV 11 18x30x1', null, null),
  ('FilterFit Pro', 'Everyday', 24, 24, 1, 8, 'FFP-24241-08', '100000000015', 'Everyday MERV 8 24x24x1', null, null),
  ('FilterFit Pro', 'Everyday', 24, 24, 4, 13, 'FFP-24244-13', '100000000016', 'Everyday MERV 13 24x24x4', null, null),
  ('BudgetFlow', 'Basic', 14, 20, 1, 6, 'BF-14201-06', '100000000017', 'BudgetFlow MERV 6 14x20x1', null, 'Entry-level filter.'),
  ('BudgetFlow', 'Basic', 12, 12, 1, 6, 'BF-12121-06', '100000000018', 'BudgetFlow MERV 6 12x12x1', null, null),
  ('BudgetFlow', 'Basic', 16, 25, 2, 8, 'BF-16252-08', '100000000019', 'BudgetFlow MERV 8 16x25x2', null, null),
  ('BudgetFlow', 'Basic', 20, 30, 1, 8, 'BF-20301-08', '100000000020', 'BudgetFlow MERV 8 20x30x1', null, null),
  ('BudgetFlow', 'Basic', 12, 20, 1, 6, 'BF-12201-06', '100000000021', 'BudgetFlow MERV 6 12x20x1', null, null),
  ('AeroShield', 'Allergy', 16, 25, 1, 12, 'AS-16251-12', '100000000022', 'AeroShield Allergy MERV 12 16x25x1', null, 'Great for pollen.'),
  ('AeroShield', 'Allergy', 20, 25, 1, 12, 'AS-20251-12', '100000000023', 'AeroShield Allergy MERV 12 20x25x1', null, null),
  ('AeroShield', 'Allergy', 16, 20, 1, 12, 'AS-16201-12', '100000000024', 'AeroShield Allergy MERV 12 16x20x1', null, null),
  ('AeroShield', 'MaxGuard', 20, 20, 1, 14, 'AS-20201-14', '100000000025', 'AeroShield MaxGuard MERV 14 20x20x1', null, null);

insert into public.aliases (alias, filter_id)
select '16x25x1-11', id from public.filters where sku = 'FFP-16251-11';

insert into public.aliases (alias, filter_id)
select 'CA-16251-11', id from public.filters where sku = 'FFP-16251-11';

insert into public.aliases (alias, filter_id)
select 'AS16251', id from public.filters where sku = 'AS-16251-12';

insert into public.aliases (alias, filter_id)
select 'Budget-16252', id from public.filters where sku = 'BF-16252-08';

insert into public.aliases (alias, filter_id)
select 'DeepGuard-20254', id from public.filters where sku = 'FFP-20254-13';
