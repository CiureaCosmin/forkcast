-- Schema and Row Level Security tests. Run with `npm run db:test` (local Supabase must be running).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

-- Three people: Ana and Ben share a household, Cara has her own.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cara@example.com');

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Creating and joining -------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ select public.create_household('Home', 'Ana') $$,
  'Ana creates a household'
);
select throws_ok(
  $$ select public.create_household('Second home', 'Ana') $$,
  'P0001', 'You are already in a household',
  'nobody can be in two households'
);
select matches(
  (select invite_code from public.households),
  '^[A-HJKMNP-Z2-9]{6}$',
  'the invite code is six unambiguous characters'
);

-- Hand the invite code to Ben through a temp table: Ben can't read the household yet.
reset role;
create temp table invite as select invite_code as code from public.households;
grant select on invite to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is_empty($$ select * from public.households $$, 'Ben sees no household before joining');
select throws_ok(
  $$ select public.join_household('NOPE22', 'Ben') $$,
  'P0002', 'No household has that invite code',
  'a wrong invite code is refused'
);
select lives_ok(
  $$ select public.join_household(lower((select code from invite)), 'Ben') $$,
  'Ben joins with the invite code, in any letter case'
);
select results_eq(
  $$ select display_name from public.household_members order by display_name $$,
  $$ values ('Ana'), ('Ben') $$,
  'Ben sees both members of his household'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.create_household('Cara''s', 'Cara') $$, 'Cara creates her own');

-- Isolation ------------------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.recipes (id, household_id, name, updated_at)
values ('10000000-0000-0000-0000-000000000001', private.my_household_id(), 'Sarmale', '2026-11-07T10:00:00Z');
insert into public.meals (id, household_id, person_id, recipe_id, date, meal_type, updated_at)
values ('20000000-0000-0000-0000-000000000001', private.my_household_id(),
        '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
        '2026-11-07', 'dinner', '2026-11-07T10:00:00Z');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select results_eq($$ select name from public.recipes $$, $$ values ('Sarmale') $$,
  'Ben sees the recipes of his household');
select lives_ok(
  $$ insert into public.meals (id, household_id, person_id, recipe_id, date, meal_type)
     values ('20000000-0000-0000-0000-000000000002', private.my_household_id(),
             '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
             '2026-11-08', 'lunch') $$,
  'Ben can copy a meal to Ana''s plan'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select is_empty($$ select * from public.recipes $$, 'Cara sees none of their recipes');
select is_empty($$ select * from public.meals $$, 'Cara sees none of their meals');
select is_empty($$ select * from public.household_members where display_name <> 'Cara' $$,
  'Cara sees none of their members');
reset role;
create temp table ana_home as select household_id as id from public.household_members
  where user_id = '00000000-0000-0000-0000-00000000000a';
grant select on ana_home to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ insert into public.recipes (id, household_id, name)
     values ('10000000-0000-0000-0000-000000000098', (select id from ana_home), 'Intruder') $$,
  '42501', null,
  'Cara cannot add a recipe to their household'
);
update public.recipes set name = 'Hacked' where id = '10000000-0000-0000-0000-000000000001';
reset role;
select is((select name from public.recipes where id = '10000000-0000-0000-0000-000000000001'),
  'Sarmale', 'Cara cannot change their recipes');

-- Meal rules -----------------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ insert into public.meals (id, household_id, person_id, date, meal_type)
     values ('20000000-0000-0000-0000-000000000003', private.my_household_id(),
             '00000000-0000-0000-0000-00000000000a', '2026-11-08', 'lunch') $$,
  '23514', null,
  'a meal needs a recipe or a quick type'
);
select throws_ok(
  $$ insert into public.meals (id, household_id, person_id, quick_type, date, meal_type)
     values ('20000000-0000-0000-0000-000000000004', private.my_household_id(),
             '00000000-0000-0000-0000-00000000000c', 'takeout', '2026-11-08', 'lunch') $$,
  '23514', 'The meal''s person is not in its household',
  'a meal can''t be put on the plan of someone outside the household'
);
select lives_ok(
  $$ insert into public.meals (id, household_id, person_id, quick_type, date, meal_type)
     values ('20000000-0000-0000-0000-000000000005', private.my_household_id(),
             '00000000-0000-0000-0000-00000000000a', 'takeout', '2026-11-08', 'lunch') $$,
  'a quick meal needs no recipe'
);

-- Sync: last write wins, soft deletes ---------------------------------------------------------

update public.recipes set name = 'Old edit', updated_at = '2026-11-07T09:00:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select name from public.recipes where id = '10000000-0000-0000-0000-000000000001'),
  'Sarmale', 'an older edit arriving late is ignored');

update public.recipes set name = 'Sarmale cu mămăligă', updated_at = '2026-11-07T11:00:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select name from public.recipes where id = '10000000-0000-0000-0000-000000000001'),
  'Sarmale cu mămăligă', 'a newer edit wins');

select ok(
  (select server_updated_at >= now() from public.recipes
   where id = '10000000-0000-0000-0000-000000000001'),
  'every write stamps server_updated_at, for devices to pull'
);

delete from public.meals where id = '20000000-0000-0000-0000-000000000005';
select isnt_empty(
  $$ select 1 from public.meals where id = '20000000-0000-0000-0000-000000000005' $$,
  'rows cannot be removed through the API; they are marked deleted'
);
select lives_ok(
  $$ update public.meals set deleted_at = now(), updated_at = now()
     where id = '20000000-0000-0000-0000-000000000005' $$,
  'marking a meal deleted works'
);

select * from finish();
rollback;
