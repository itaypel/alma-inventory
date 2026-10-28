-- =====================================================================
-- עלמא – מערכת ניהול מלאי · סכמת מסד נתונים ל-Supabase
-- להריץ פעם אחת: Supabase → SQL Editor → New query → להדביק → Run
-- =====================================================================

-- ---------- טבלאות ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  full_name   text not null,
  role        text not null default 'employee' check (role in ('manager', 'employee')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           bigint generated always as identity primary key,
  category     text not null check (category in ('אינסטלציה', 'מיזוג', 'חשמל')),
  name         text not null,
  sku          text unique,
  shelf        text not null,
  pack_size    integer not null default 1 check (pack_size >= 1),      -- 1 = נמכר ביחידה
  price        numeric(12, 2) not null default 0 check (price >= 0),   -- מחיר למארז (או ליחידה כש-pack_size = 1)
  stock_units  integer not null default 0 check (stock_units >= 0),    -- המלאי נספר תמיד ביחידות
  min_units    integer not null default 0 check (min_units >= 0),
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.transactions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('take', 'restock')),
  product_id  bigint not null references public.products (id),
  user_id     uuid not null references public.profiles (id),          -- על שם מי
  created_by  uuid not null references public.profiles (id),          -- מי רשם בפועל
  units       integer not null check (units > 0),
  unit_value  numeric(12, 4) not null default 0,                      -- שווי ליחידה ברגע התנועה
  note        text
);

create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transactions_user_idx on public.transactions (user_id, created_at desc);

create table if not exists public.weekly_reports (
  id           bigint generated always as identity primary key,
  week_start   timestamptz not null,
  week_end     timestamptz not null,
  created_at   timestamptz not null default now(),
  total_value  numeric(14, 2) not null default 0,
  take_count   integer not null default 0,
  rows         jsonb not null default '[]'::jsonb
);

-- ---------- פונקציות עזר ----------

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- תחילת השבוע הנוכחי: יום ראשון 00:00 שעון ישראל
create or replace function public.current_week_start()
returns timestamptz
language sql stable
as $$
  select (date_trunc('day', now() at time zone 'Asia/Jerusalem')
          - make_interval(days => extract(dow from now() at time zone 'Asia/Jerusalem')::int))
         at time zone 'Asia/Jerusalem';
$$;

-- ---------- פעולות (רק דרכן משנים מלאי) ----------

-- לקיחה מהמלאי. עובד – רק על שמו. מנהל – יכול לרשום על שם כל עובד.
create or replace function public.take_product(
  p_product_id bigint,
  p_units integer,
  p_note text default null,
  p_for_user uuid default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := coalesce(p_for_user, auth.uid());
  v_prod public.products%rowtype;
begin
  if not public.is_active_user() then
    raise exception 'המשתמש אינו פעיל';
  end if;
  if p_for_user is not null and p_for_user <> auth.uid() and not public.is_manager() then
    raise exception 'רק מנהל יכול לרשום לקיחה על שם עובד אחר';
  end if;
  if p_units is null or p_units < 1 then
    raise exception 'כמות לא תקינה';
  end if;
  if not exists (select 1 from public.profiles where id = v_user and active) then
    raise exception 'העובד לא נמצא או אינו פעיל';
  end if;

  select * into v_prod from public.products where id = p_product_id and not archived for update;
  if not found then
    raise exception 'המוצר לא נמצא';
  end if;
  if v_prod.stock_units < p_units then
    raise exception 'אין מספיק במלאי (נשארו % יח׳)', v_prod.stock_units;
  end if;

  update public.products set stock_units = stock_units - p_units where id = p_product_id;

  insert into public.transactions (kind, product_id, user_id, created_by, units, unit_value, note)
  values ('take', p_product_id, v_user, auth.uid(), p_units,
          v_prod.price / v_prod.pack_size, nullif(trim(p_note), ''));

  return v_prod.stock_units - p_units;
end;
$$;

-- מילוי מלאי – מנהל בלבד
create or replace function public.restock_product(
  p_product_id bigint,
  p_units integer,
  p_note text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_prod public.products%rowtype;
begin
  if not public.is_manager() then
    raise exception 'רק מנהל יכול למלא מלאי';
  end if;
  if p_units is null or p_units < 1 then
    raise exception 'כמות לא תקינה';
  end if;

  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'המוצר לא נמצא';
  end if;

  update public.products set stock_units = stock_units + p_units where id = p_product_id;

  insert into public.transactions (kind, product_id, user_id, created_by, units, unit_value, note)
  values ('restock', p_product_id, auth.uid(), auth.uid(), p_units,
          v_prod.price / v_prod.pack_size, nullif(trim(p_note), ''));

  return v_prod.stock_units + p_units;
end;
$$;

-- סיכום לקיחות בטווח זמן (לדו"ח השבועי). מנהל בלבד (או service role).
create or replace function public.takes_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  product_id bigint,
  name text,
  category text,
  shelf text,
  pack_size integer,
  units bigint,
  value numeric,
  takers text,
  take_count bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_manager() then
    raise exception 'מנהל בלבד';
  end if;
  return query
    select p.id, p.name, p.category, p.shelf, p.pack_size,
           sum(t.units)::bigint,
           round(sum(t.units * t.unit_value), 2),
           string_agg(distinct pr.full_name, ', '),
           count(*)::bigint
    from public.transactions t
    join public.products p on p.id = t.product_id
    join public.profiles pr on pr.id = t.user_id
    where t.kind = 'take'
      and t.created_at >= coalesce(p_from, public.current_week_start())
      and t.created_at <  coalesce(p_to, now())
    group by p.id
    order by 7 desc;
end;
$$;

-- ---------- הרשאות (Row Level Security) ----------

alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.transactions   enable row level security;
alter table public.weekly_reports enable row level security;

drop policy if exists "profiles: self or manager" on public.profiles;
create policy "profiles: self or manager" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_manager());

drop policy if exists "products: active users read" on public.products;
create policy "products: active users read" on public.products
  for select to authenticated using (public.is_active_user());

drop policy if exists "products: manager insert" on public.products;
create policy "products: manager insert" on public.products
  for insert to authenticated with check (public.is_manager());

drop policy if exists "products: manager update" on public.products;
create policy "products: manager update" on public.products
  for update to authenticated using (public.is_manager()) with check (public.is_manager());

drop policy if exists "transactions: own or manager" on public.transactions;
create policy "transactions: own or manager" on public.transactions
  for select to authenticated using (user_id = auth.uid() or public.is_manager());

drop policy if exists "weekly_reports: manager" on public.weekly_reports;
create policy "weekly_reports: manager" on public.weekly_reports
  for select to authenticated using (public.is_manager());

-- המלאי עצמו (stock_units) משתנה רק דרך הפונקציות, כדי שכל שינוי יירשם ביומן
revoke insert, update, delete on public.products from anon, authenticated;
grant insert (category, name, sku, shelf, pack_size, price, min_units) on public.products to authenticated;
grant update (category, name, sku, shelf, pack_size, price, min_units, archived) on public.products to authenticated;
revoke insert, update, delete on public.transactions, public.profiles, public.weekly_reports from anon, authenticated;

-- אין מדיניות insert/update/delete ל-transactions ול-profiles:
-- שינוי מלאי רק דרך take_product / restock_product, ומשתמשים נוצרים רק בשרת.

revoke all on function public.take_product(bigint, integer, text, uuid) from public, anon;
revoke all on function public.restock_product(bigint, integer, text) from public, anon;
revoke all on function public.takes_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.take_product(bigint, integer, text, uuid) to authenticated;
grant execute on function public.restock_product(bigint, integer, text) to authenticated;
grant execute on function public.takes_summary(timestamptz, timestamptz) to authenticated, service_role;
