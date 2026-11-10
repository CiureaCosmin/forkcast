-- Forkcast: households, members, recipes and meals, with offline sync columns and RLS.
-- The rules behind this schema are in docs/architecture.md, section 5.

create schema if not exists private;

-- Households ---------------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  -- Shared with the partner to join. Unambiguous letters and digits only (see new_invite_code).
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- One household per person. The person's id everywhere else is their auth user id.
create table public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  joined_at timestamptz not null default now()
);

create index household_members_household_id_idx on public.household_members (household_id);

-- The household of whoever is calling. Security definer so policies can use it without
-- recursing into household_members' own policy.
create function private.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;

-- Synced rows ---------------------------------------------------------------------------------
-- Ids are created on the device, so a row made offline keeps its id.
-- updated_at: set by the device when the row changes; the later edit wins.
-- server_updated_at: set here on every write; devices pull rows changed since their last pull.
-- deleted_at: rows are marked deleted instead of removed, so the deletion reaches other devices.

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner');
create type public.meal_status as enum ('planned', 'eaten', 'skipped');
create type public.quick_meal_type as enum ('eating_out', 'takeout', 'quick_bite');

create table public.recipes (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text,
  ingredients jsonb not null default '[]' check (jsonb_typeof(ingredients) = 'array'),
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  prep_minutes integer check (prep_minutes > 0),
  tags text[] not null default '{}',
  photo_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create index recipes_household_sync_idx on public.recipes (household_id, server_updated_at);

create table public.meals (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  person_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete restrict,
  quick_type public.quick_meal_type,
  date date not null,
  meal_type public.meal_type not null,
  status public.meal_status not null default 'planned',
  is_leftovers boolean not null default false,
  notes text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  -- A meal comes from a recipe or a quick category, never both. Not unique per slot: a slot can
  -- hold several meals.
  constraint meals_recipe_or_quick check ((recipe_id is null) <> (quick_type is null))
);

create index meals_household_sync_idx on public.meals (household_id, server_updated_at);
create index meals_recipe_id_idx on public.meals (recipe_id);

-- Last write wins: an update carrying an older updated_at than the stored row is ignored, so a
-- device that comes back online with stale edits can't overwrite newer ones.
create function private.keep_latest_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_updated_at := now();
  return new;
end
$$;

create trigger recipes_keep_latest_write
before insert or update on public.recipes
for each row execute function private.keep_latest_write();

create trigger meals_keep_latest_write
before insert or update on public.meals
for each row execute function private.keep_latest_write();

-- A meal's person must belong to the meal's household, and its recipe too.
create function private.check_meal_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.household_members
    where user_id = new.person_id and household_id = new.household_id
  ) then
    raise exception 'The meal''s person is not in its household' using errcode = '23514';
  end if;
  if new.recipe_id is not null and not exists (
    select 1 from public.recipes where id = new.recipe_id and household_id = new.household_id
  ) then
    raise exception 'The meal''s recipe is not in its household' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger meals_check_household
before insert or update on public.meals
for each row execute function private.check_meal_household();

-- Row Level Security --------------------------------------------------------------------------
-- Everyone sees and changes only their own household's rows. Rows are never removed through the
-- API (no delete policies): deletions set deleted_at. A partner's plan being read-only is a rule
-- of the app, not the database: "Copy to partner" writes to the partner's plan.

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.meals enable row level security;

create policy "Members see their household"
on public.households for select to authenticated
using (id = (select private.my_household_id()));

create policy "Members see their household's members"
on public.household_members for select to authenticated
using (household_id = (select private.my_household_id()));

create policy "Members rename themselves"
on public.household_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and household_id = (select private.my_household_id()));

create policy "Members see their household's recipes"
on public.recipes for select to authenticated
using (household_id = (select private.my_household_id()));

create policy "Members add recipes to their household"
on public.recipes for insert to authenticated
with check (household_id = (select private.my_household_id()));

create policy "Members change their household's recipes"
on public.recipes for update to authenticated
using (household_id = (select private.my_household_id()))
with check (household_id = (select private.my_household_id()));

create policy "Members see their household's meals"
on public.meals for select to authenticated
using (household_id = (select private.my_household_id()));

create policy "Members add meals to their household"
on public.meals for insert to authenticated
with check (household_id = (select private.my_household_id()));

create policy "Members change their household's meals"
on public.meals for update to authenticated
using (household_id = (select private.my_household_id()))
with check (household_id = (select private.my_household_id()));

-- Creating and joining a household --------------------------------------------------------------
-- Done through these functions only, so nobody can add themselves to someone else's household
-- without its invite code.

create function private.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  -- No 0/O or 1/I/L, so the code is easy to read out.
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6)
$$;

create function public.create_household(household_name text, display_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  created public.households;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = me) then
    raise exception 'You are already in a household' using errcode = 'P0001';
  end if;
  loop
    begin
      insert into public.households (name, invite_code, created_by)
      values (household_name, private.new_invite_code(), me)
      returning * into created;
      exit;
    exception when unique_violation then
      -- The invite code was taken; try another.
    end;
  end loop;
  insert into public.household_members (user_id, household_id, display_name)
  values (me, created.id, display_name);
  return created;
end
$$;

create function public.join_household(code text, display_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  found public.households;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = me) then
    raise exception 'You are already in a household' using errcode = 'P0001';
  end if;
  select * into found from public.households where invite_code = upper(trim(code));
  if found.id is null then
    raise exception 'No household has that invite code' using errcode = 'P0002';
  end if;
  insert into public.household_members (user_id, household_id, display_name)
  values (me, found.id, display_name);
  return found;
end
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- The private schema isn't exposed through the API; policies still need to call this.
grant usage on schema private to authenticated;
grant execute on function private.my_household_id() to authenticated;
