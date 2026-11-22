-- Jalankan di Supabase: SQL Editor > New query > Run
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  event_date timestamptz not null,
  price integer not null check (price >= 0),
  stock integer not null check (stock >= 0),
  description text,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  event_id uuid not null references events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  qty integer not null check (qty > 0),
  total integer not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  approval_status text not null default 'pending' check (approval_status in ('pending','accepted')),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'valid' check (status in ('valid', 'used')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_order_id_idx on tickets(order_id);

-- Buat tiket individual untuk pesanan lama yang belum memiliki baris tiket.
insert into tickets (order_id)
select o.id
from orders o
cross join lateral generate_series(1, o.qty)
where not exists (select 1 from tickets t where t.order_id = o.id)
on conflict do nothing;

-- RLS aktif tanpa policy: akses langsung dari browser ditolak.
-- Semua akses lewat backend Express memakai service_role key.
alter table events enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;

create or replace function create_order(p_event uuid, p_name text, p_email text, p_qty integer)
returns orders language plpgsql security definer set search_path = public as $$
declare ev events; o orders;
begin
  if p_qty < 1 or p_qty > 10 then raise exception 'Jumlah tiket harus 1-10'; end if;
  select * into ev from events where id = p_event for update;
  if not found then raise exception 'Event tidak ditemukan'; end if;
  if ev.stock < p_qty then raise exception 'Stok tiket tidak cukup'; end if;
  update events set stock = stock - p_qty where id = p_event;
  insert into orders (event_id, buyer_name, buyer_email, qty, total)
  values (p_event, p_name, p_email, p_qty, ev.price * p_qty) returning * into o;
  insert into tickets (order_id)
  select o.id from generate_series(1, p_qty);
  return o;
end $$;

create or replace function check_in_ticket(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t tickets; o orders; ev events;
begin
  select * into t from tickets where code = upper(trim(p_code));
  if not found then raise exception 'Kode tiket tidak ditemukan'; end if;
  select * into o from orders where id = t.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  select * into t from tickets where id = t.id for update;
  if t.status = 'used' then raise exception 'Tiket sudah pernah digunakan'; end if;

  if o.status <> 'paid' then
    if o.status = 'cancelled' then raise exception 'Pesanan dibatalkan'; end if;
    raise exception 'Tiket belum dibayar';
  end if;
  select * into ev from events where id = o.event_id;

  update tickets set status = 'used', used_at = now() where id = t.id returning * into t;
  return jsonb_build_object(
    'ticket_code', t.code,
    'ticket_status', t.status,
    'used_at', t.used_at,
    'order_code', o.code,
    'order_status', o.status,
    'buyer_name', o.buyer_name,
    'event_name', ev.name,
    'venue', ev.venue,
    'event_date', ev.event_date
  );
end $$;

create or replace function get_ticket(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t tickets; o orders; ev events;
begin
  select * into t from tickets where code = upper(trim(p_code));
  if not found then raise exception 'Kode tiket tidak ditemukan'; end if;
  select * into o from orders where id = t.order_id;
  select * into ev from events where id = o.event_id;
  return jsonb_build_object(
    'ticket_code', t.code,
    'ticket_status', t.status,
    'used_at', t.used_at,
    'order_code', o.code,
    'order_status', o.status,
    'buyer_name', o.buyer_name,
    'buyer_email', o.buyer_email,
    'event_name', ev.name,
    'venue', ev.venue,
    'event_date', ev.event_date
  );
end $$;

create or replace function get_order(p_code text)
returns table (code text, event_name text, buyer_name text, qty integer, total integer, status text)
language sql security definer set search_path = public as $$
  select o.code, e.name, o.buyer_name, o.qty, o.total, o.status
  from orders o join events e on e.id = o.event_id where o.code = upper(p_code);
$$;

create or replace function set_order_status(p_id uuid, p_status text)
returns orders language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  if p_status not in ('pending','paid','cancelled') then raise exception 'Status tidak valid'; end if;
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status <> 'cancelled' and p_status = 'cancelled' then
    update events set stock = stock + o.qty where id = o.event_id;
  elsif o.status = 'cancelled' and p_status <> 'cancelled' then
    if (select stock from events where id = o.event_id) < o.qty then
      raise exception 'Stok tidak cukup untuk mengaktifkan kembali pesanan';
    end if;
    update events set stock = stock - o.qty where id = o.event_id;
  end if;
  update orders set status = p_status where id = p_id returning * into o;
  return o;
end $$;

create or replace function accept_order(p_id uuid, p_staff_id uuid)
returns orders language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status = 'cancelled' then raise exception 'Pesanan yang dibatalkan tidak dapat diterima'; end if;
  if o.approval_status = 'accepted' then raise exception 'Pesanan sudah diterima sebelumnya'; end if;
  update orders
  set approval_status = 'accepted', accepted_at = now(), accepted_by = p_staff_id
  where id = p_id returning * into o;
  return o;
end $$;

create or replace function delete_order(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status <> 'cancelled' then update events set stock = stock + o.qty where id = o.event_id; end if;
  delete from orders where id = p_id;
end $$;

-- Hanya backend (service_role) yang boleh memanggil fungsi ini
revoke all on function create_order(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function get_order(text) from public, anon, authenticated;
revoke all on function check_in_ticket(text) from public, anon, authenticated;
revoke all on function get_ticket(text) from public, anon, authenticated;
revoke all on function set_order_status(uuid, text) from public, anon, authenticated;
revoke all on function delete_order(uuid) from public, anon, authenticated;
revoke all on function accept_order(uuid, uuid) from public, anon, authenticated;
grant execute on function create_order(uuid, text, text, integer) to service_role;
grant execute on function get_order(text) to service_role;
grant execute on function check_in_ticket(text) to service_role;
grant execute on function get_ticket(text) to service_role;
grant execute on function set_order_status(uuid, text) to service_role;
grant execute on function delete_order(uuid) to service_role;
grant execute on function accept_order(uuid, uuid) to service_role;
