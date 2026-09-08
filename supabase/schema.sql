-- FX trading note: initial schema (v1)
-- Run this in the Supabase SQL editor after creating the project.

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null,
  closed_at timestamptz,
  pair text not null,
  side text not null check (side in ('buy', 'sell')),
  lot_size numeric not null,
  entry_price numeric not null,
  exit_price numeric,
  pnl_pips numeric,
  pnl_amount numeric,
  fee numeric,
  swap numeric,
  lc_target numeric,
  tp_target numeric,
  risk_reward numeric,
  mae_pips numeric,
  mfe_pips numeric,
  result text check (result in ('win', 'lose')),
  memo text,
  screenshot_url text,
  usdjpy_base_rate numeric,
  created_at timestamptz not null default now()
);

alter table trades add column if not exists usdjpy_base_rate numeric;

-- v2: registered currency pairs, per user. `category` drives pip size and
-- pnl-amount conversion (dollar_straight needs a USDJPY base rate to convert
-- USD pip value to JPY; cross_yen pip value is already in JPY).
create table if not exists currency_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  category text not null check (category in ('dollar_straight', 'cross_yen')),
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists currency_pairs_user_id_idx on currency_pairs (user_id);

alter table currency_pairs enable row level security;

create policy "currency_pairs_owner_select" on currency_pairs for select using (auth.uid() = user_id);
create policy "currency_pairs_owner_insert" on currency_pairs for insert with check (auth.uid() = user_id);
create policy "currency_pairs_owner_delete" on currency_pairs for delete using (auth.uid() = user_id);

-- v2: one settings row per user. Holds the JST <-> MT5 server-time offset
-- used to align MT5 CSV candle timestamps with trade times when importing
-- MAE/MFE; the offset shifts between summer_hours and winter_hours as the
-- broker's server observes DST.
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dst_mode text not null default 'summer' check (dst_mode in ('summer', 'winter')),
  mt5_offset_summer_hours numeric not null default 6,
  mt5_offset_winter_hours numeric not null default 7,
  alpha_vantage_api_key text,
  updated_at timestamptz not null default now()
);

alter table user_settings add column if not exists alpha_vantage_api_key text;

alter table user_settings enable row level security;

create policy "user_settings_owner_select" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_owner_insert" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_owner_update" on user_settings for update using (auth.uid() = user_id);

-- RLS policies alone don't grant API access: PostgREST still checks the
-- table-level privileges of the `authenticated` role first. Without these
-- grants, every request fails with "permission denied for table ..." before
-- RLS is even evaluated.
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.trade_tags to authenticated;
grant select, insert, update, delete on public.currency_pairs to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists trade_tags (
  trade_id uuid not null references trades(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (trade_id, tag_id)
);

create index if not exists trades_user_id_opened_at_idx on trades (user_id, opened_at desc);
create index if not exists tags_user_id_idx on tags (user_id);

alter table trades enable row level security;
alter table tags enable row level security;
alter table trade_tags enable row level security;

create policy "trades_owner_select" on trades for select using (auth.uid() = user_id);
create policy "trades_owner_insert" on trades for insert with check (auth.uid() = user_id);
create policy "trades_owner_update" on trades for update using (auth.uid() = user_id);
create policy "trades_owner_delete" on trades for delete using (auth.uid() = user_id);

create policy "tags_owner_select" on tags for select using (auth.uid() = user_id);
create policy "tags_owner_insert" on tags for insert with check (auth.uid() = user_id);
create policy "tags_owner_update" on tags for update using (auth.uid() = user_id);
create policy "tags_owner_delete" on tags for delete using (auth.uid() = user_id);

create policy "trade_tags_owner_select" on trade_tags for select using (
  exists (select 1 from trades where trades.id = trade_tags.trade_id and trades.user_id = auth.uid())
);
create policy "trade_tags_owner_insert" on trade_tags for insert with check (
  exists (select 1 from trades where trades.id = trade_tags.trade_id and trades.user_id = auth.uid())
);
create policy "trade_tags_owner_delete" on trade_tags for delete using (
  exists (select 1 from trades where trades.id = trade_tags.trade_id and trades.user_id = auth.uid())
);

-- Storage bucket for trade screenshots (created via SQL since it needs owner-scoped policies).
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy "screenshots_owner_select" on storage.objects for select using (
  bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "screenshots_owner_insert" on storage.objects for insert with check (
  bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "screenshots_owner_delete" on storage.objects for delete using (
  bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
);
