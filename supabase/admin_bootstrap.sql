-- Create or promote an admin profile. Replace the UUID with the auth.users id.
insert into public.profiles (id, is_admin)
values ('00000000-0000-0000-0000-000000000000', true)
on conflict (id)
do update set is_admin = true;
