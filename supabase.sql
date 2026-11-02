-- شغّل الملف ده في Supabase: SQL Editor ← New query ← Run

-- 1) المنتجات
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  category text default 'print',
  price numeric default 0,
  old_price numeric,
  description text,
  images text[] default '{}',
  in_stock boolean default true,
  featured boolean default false,
  published boolean default true,
  sort_order int default 0
);

-- 2) إعدادات المتجر (واتساب، سوشيال، النصوص)
create table if not exists site_settings (
  key text primary key,
  value text
);

-- 3) مخزن الصور (رفع من التليفون)
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

-- 4) الصلاحيات: الزوار يشوفوا بس، والأدمن المسجّل دخول يعدّل
alter table products enable row level security;
alter table site_settings enable row level security;

create policy "public read" on products for select using (true);
create policy "admin write" on products for all to authenticated using (true) with check (true);
create policy "public read" on site_settings for select using (true);
create policy "admin write" on site_settings for all to authenticated using (true) with check (true);

create policy "public read images" on storage.objects for select using (bucket_id = 'images');
create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id = 'images');
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'images');

-- 5) بيانات البداية
insert into site_settings (key, value) values
('whatsapp', '201125830635'),
('hero_text', 'هدايا مميزة.. وتفاصيل بتتحكي. كل قطعة ليها حكاية وكل تفصيلة ليها شغف.'),
('facebook', 'https://www.facebook.com/share/1BjeyjpdFe/'),
('instagram', 'https://www.instagram.com/hebaahmed.gallery'),
('tiktok', 'https://www.tiktok.com/@hebaahmedgallery');
