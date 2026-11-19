-- ════════════════════════════════════════════════════════════
--  DAMTAT — Supabase схемасы (жаңа жобаға бір рет іске қос)
--  Supabase Dashboard → SQL Editor → осы файлды толық іске қос
-- ════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Категориялар ────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ru     text,
  slug        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Тағамдар ────────────────────────────────────────────────
create table if not exists public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references public.categories(id) on delete cascade,
  name           text not null,
  name_ru        text,
  description    text,
  description_ru text,
  price          int  not null check (price >= 0),   -- теңгемен, бүтін сан
  image_url      text,                               -- Supabase Storage (menu-images) сілтемесі
  is_available   boolean not null default true,
  promo          text check (promo is null or promo in ('1+1')),
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists menu_items_category_idx on public.menu_items(category_id);

-- ── Тапсырыстар ─────────────────────────────────────────────
do $$ begin
  create type order_status as enum ('new', 'cooking', 'ready', 'served', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   bigint generated always as identity,
  -- dine_in = кафеде QR арқылы (→ Telegram жабық канал)
  -- online  = сырттан онлайн (→ WhatsApp)
  order_type     text not null default 'dine_in' check (order_type in ('dine_in', 'online')),
  table_number   text,                 -- тек dine_in
  customer_name  text,                 -- тек online
  customer_phone text,                 -- тек online
  delivery       text check (delivery is null or delivery in ('delivery', 'pickup')),
  address        text,                 -- тек delivery
  comment        text,
  total          int  not null check (total >= 0),
  status         order_status not null default 'new',
  created_at     timestamptz not null default now(),
  check (order_type <> 'dine_in' or table_number is not null),
  check (order_type <> 'online'  or customer_phone is not null)
);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  name          text not null,   -- сол сәттегі атауы (snapshot)
  price         int  not null,   -- сол сәттегі бағасы (snapshot)
  quantity      int  not null check (quantity > 0),
  free_quantity int  not null default 0 check (free_quantity >= 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ── RLS ─────────────────────────────────────────────────────
-- Қонақ мәзірді тек ОҚИДЫ. Тапсырыс пен өзгерістер тек сервер арқылы
-- (service_role кілтімен) — клиент бағаны бұрмалай алмайды.
alter table public.categories  enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read menu_items" on public.menu_items;
create policy "public read menu_items" on public.menu_items for select using (true);
-- orders / order_items үшін policy жоқ → anon кілтпен қолжетімсіз.

-- ── Фото сақтау (Supabase Storage, 24/7 CDN) ────────────────
-- Бакет public: суретті кез келген адам КӨРЕ алады,
-- бірақ жүктеу/өшіру тек сервер (админ панель) арқылы.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

-- ── Бастапқы категориялар (админнен өзгертуге/қосуға болады) ─
insert into public.categories (name, name_ru, slug, sort_order) values
  ('Ыстық тағамдар', 'Горячие блюда', 'hot',      1),
  ('Фастфуд',        'Фастфуд',       'fastfood', 2),
  ('Салаттар',       'Салаты',        'salads',   3),
  ('Сусындар',       'Напитки',       'drinks',   4),
  ('Десерттер',      'Десерты',       'desserts', 5)
on conflict (slug) do nothing;
