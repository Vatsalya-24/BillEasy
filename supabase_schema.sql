-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- Creates the four sync tables, each scoped to the signed-in user via RLS.

create table if not exists items (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text,
  sku text,
  price numeric,
  "taxRate" numeric,
  stock numeric,
  unit text,
  "updatedAt" bigint
);

create table if not exists parties (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text,
  phone text,
  type text,
  balance numeric,
  "updatedAt" bigint
);

create table if not exists invoices (
  id uuid primary key,
  user_id uuid references auth.users not null,
  "invoiceNo" text,
  "partyId" uuid,
  date date,
  status text,
  total numeric,
  "updatedAt" bigint
);

create table if not exists invoice_lines (
  id uuid primary key,
  user_id uuid references auth.users not null,
  "invoiceId" uuid,
  "itemId" uuid,
  qty numeric,
  price numeric,
  "taxRate" numeric,
  "updatedAt" bigint
);

create table if not exists payments (
  id uuid primary key,
  user_id uuid references auth.users not null,
  "invoiceId" uuid,
  "partyId" uuid,
  amount numeric,
  mode text,
  date date,
  "updatedAt" bigint
);

-- Row Level Security: each user can only read/write their own rows.
alter table items enable row level security;
alter table parties enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table payments enable row level security;

create policy "own rows only - items" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only - parties" on parties
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only - invoices" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only - invoice_lines" on invoice_lines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only - payments" on payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
