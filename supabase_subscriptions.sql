-- Run this in the Supabase SQL editor, after supabase_schema.sql.
-- Tracks each user's subscription. Every signup gets a 14-day trial row
-- automatically (see the trigger below) — the whole app is unlocked during
-- the trial, then locked until they subscribe to Basic or Pro.
--
-- This is read-only for the user — only the Edge Functions (using the
-- service role key, which bypasses RLS) can write to it, so a user can't
-- edit their own row to grant themselves access.

create table if not exists subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'basic', 'pro')),
  -- trialing: full access, counting down to trial_ends_at
  -- active: paying, full access
  -- past_due / cancelled / expired: locked out, sent to /billing
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  razorpay_customer_id text,
  razorpay_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "read own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- No insert/update/delete policy for regular users — denied by default
-- under RLS. Edge Functions write using the service role key, which
-- ignores RLS entirely.

-- Automatically create a 14-day trial row whenever someone signs up.
-- Change the interval below if you want a different trial length.
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();
