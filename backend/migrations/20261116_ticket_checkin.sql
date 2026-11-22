-- Jalankan sekali pada database Supabase yang sudah berisi tabel events dan orders.
-- Untuk instalasi baru, gunakan schema.sql.

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'valid' check (status in ('valid', 'used')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_order_id_idx on tickets(order_id);
alter table tickets enable row level security;

-- Buat satu kode unik untuk setiap tiket dari pesanan yang sudah ada.
insert into tickets (order_id)
select o.id
from orders o
cross join lateral generate_series(1, o.qty)
where not exists (select 1 from tickets t where t.order_id = o.id)
on conflict do nothing;

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

revoke all on function get_ticket(text) from public, anon, authenticated;
revoke all on function check_in_ticket(text) from public, anon, authenticated;
grant execute on function get_ticket(text) to service_role;
grant execute on function check_in_ticket(text) to service_role;
