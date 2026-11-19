-- ════════════════════════════════════════════════════════════
--  DAMTAT — Supabase толық схемасы + мәзір деректері
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
alter table public.categories  enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read menu_items" on public.menu_items;
create policy "public read menu_items" on public.menu_items for select using (true);

-- ── Фото сақтау (Supabase Storage, 24/7 CDN) ────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

-- ── Damtat категориялары ────────────────────────────────────
insert into public.categories (name, name_ru, slug, sort_order) values
  ('Бірінші тағамдар',    'Первые блюда',         'first-courses',  1),
  ('Лағмандар',           'Лагманы',              'lagmans',        2),
  ('Екінші тағамдар',     'Вторые блюда',         'second-courses', 3),
  ('Шашлықтар',           'Шашлыки',              'shashliks',      4),
  ('Салаттар',            'Салаты',               'salads',         5),
  ('Салқын сусындар',     'Холодные напитки',     'cold-drinks',    6),
  ('Құйылмалы сусындар',  'Разливные напитки',    'draft-drinks',   7),
  ('Ыстық сусындар',      'Горячие напитки',      'hot-drinks',     8)
on conflict (slug) do nothing;

-- ── Damtat тағамдары мен сусындары ──────────────────────────
insert into public.menu_items (category_id, name, price, image_url, is_available, sort_order)
select c.id, v.name, v.price, null, true, v.sort_order
from (
  values
    -- 1. Бірінші тағамдар
    ('first-courses', 'Нарын',                 2000, 1),
    ('first-courses', 'Сорпа сиыр етінен',      1900, 2),
    ('first-courses', 'Сорпа қой етінен',       2200, 3),
    ('first-courses', 'Домашний лагман',       2000, 4),
    ('first-courses', 'Пельмен',               1500, 5),
    ('first-courses', 'Рамен',                 1200, 6),
    ('first-courses', 'Солянка',               1500, 7),

    -- 2. Лағмандар
    ('lagmans', 'Гуйру',                     2000, 1),
    ('lagmans', 'Суйру',                     2000, 2),
    ('lagmans', 'Цомян',                     2000, 3),
    ('lagmans', 'Могуру',                    2500, 4),
    ('lagmans', 'Дин дин цомян',             2000, 5),

    -- 3. Екінші тағамдар
    ('second-courses', 'Манты',                1700, 1),
    ('second-courses', 'Пигуди',               1700, 2),
    ('second-courses', 'Орама',                1500, 3),
    ('second-courses', 'Курица с овощами',     1700, 4),
    ('second-courses', 'Курица с грибами',     1700, 5),
    ('second-courses', 'Тефтили',              1800, 6),
    ('second-courses', 'Плов',                 1800, 7),
    ('second-courses', 'Дапанджи',             2000, 8),
    ('second-courses', 'Котлет с гарниром',    1800, 9),
    ('second-courses', 'Бифштекс',             1800, 10),

    -- 4. Шашлықтар
    ('shashliks', 'Баранина',                1400, 1),
    ('shashliks', 'Люля',                    1200, 2),
    ('shashliks', 'Утка',                    800,  3),
    ('shashliks', 'Крылышка',                800,  4),
    ('shashliks', 'Окорачка',                800,  5),
    ('shashliks', 'Шампиньон',               1500, 6),
    ('shashliks', 'Люля в оболочке',         1500, 7),

    -- 5. Салаттар
    ('salads', 'Свежий салат',               800,  1),
    ('salads', 'Капуста салат',              700,  2),
    ('salads', 'Оливье',                   700,  3),
    ('salads', 'Венингрет',                750,  4),
    ('salads', 'Ачучук',                   800,  5),

    -- 6. Салқын сусындар
    ('cold-drinks', 'Кола 1л',               800,  1),
    ('cold-drinks', 'Кола 0.5',              550,  2),
    ('cold-drinks', 'Кола ЖБ',               600,  3),
    ('cold-drinks', 'Диззи',                 650,  4),
    ('cold-drinks', 'Горилла',               700,  5),
    ('cold-drinks', 'Fuse tea',              750,  6),
    ('cold-drinks', 'Айран',                 300,  7),
    ('cold-drinks', 'Компот 1л',             800,  8),
    ('cold-drinks', 'Компот 0.5',            500,  9),
    ('cold-drinks', 'Макси чай',             750,  10),
    ('cold-drinks', 'Тархун',                650,  11),
    ('cold-drinks', 'Дюшес',                 650,  12),
    ('cold-drinks', 'Байкал',                650,  13),
    ('cold-drinks', 'Лимонад',               650,  14),
    ('cold-drinks', 'Тассай',                600,  15),
    ('cold-drinks', 'Асу',                   600,  16),
    ('cold-drinks', 'Витамин С',             450,  17),
    ('cold-drinks', 'Zigi zagi',             550,  18),
    ('cold-drinks', 'Фанта',                 550,  19),
    ('cold-drinks', 'Пепси',                 550,  20),
    ('cold-drinks', 'Боржоми',               1050, 21),
    ('cold-drinks', 'Сарыағаш',              550,  22),

    -- 7. Құйылмалы сусындар
    ('draft-drinks', 'Мохито 0.5',           300,  1),
    ('draft-drinks', 'Мохито 1л',            1000, 2),
    ('draft-drinks', 'Квас 0.5',             300,  3),
    ('draft-drinks', 'Квас 1л',              1000, 4),

    -- 8. Ыстық сусындар
    ('hot-drinks', 'Чай сүтпен',             250,  1),
    ('hot-drinks', 'Чай сүтсіз',             200,  2),
    ('hot-drinks', 'Чай лимонмен',           200,  3),
    ('hot-drinks', 'Көк чай',                200,  4),
    ('hot-drinks', '3в1 чай',                250,  5),
    ('hot-drinks', 'Чай малинамен',          250,  6),
    ('hot-drinks', 'Чай имбирьмен',          250,  7),
    ('hot-drinks', 'Ташкентский чайникпен',  1000, 8),
    ('hot-drinks', 'Чайник чай сүтпен',      600,  9),
    ('hot-drinks', 'Чайник чай сүтсіз',      600,  10),
    ('hot-drinks', 'Чайник көк чай',         500,  11),
    ('hot-drinks', 'Чайник чай лимонмен',    500,  12),
    ('hot-drinks', 'Di Torino Cappuccino',   350,  13),
    ('hot-drinks', '3в1 кофе',               250,  14),
    ('hot-drinks', 'Jacobs monarch',         300,  15),
    ('hot-drinks', 'Jacobs 3в1',             250,  16),
    ('hot-drinks', 'Кофе Batsam',            500,  17)
) as v(cat_slug, name, price, sort_order)
join public.categories c on c.slug = v.cat_slug;