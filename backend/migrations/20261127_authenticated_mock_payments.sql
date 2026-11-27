-- Run once on Supabase after the ticket and staff-approval migrations.
-- Orders belong to the authenticated customer; tickets are minted only after payment.
alter table orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

update orders o
set user_id = u.id
from auth.users u
where o.user_id is null
  and lower(trim(o.buyer_email)) = lower(trim(u.email));

create index if not exists orders_user_id_created_at_idx
  on orders(user_id, created_at desc);

-- Remove premature ticket rows created by the previous order function.
delete from tickets t
using orders o
where t.order_id = o.id
  and o.status <> 'paid';

-- Keep paid historical orders usable, filling in only missing ticket rows.
do $$
declare o record; existing_count integer;
begin
  for o in select id, qty from orders where status = 'paid' loop
    select count(*) into existing_count from tickets where order_id = o.id;
    if existing_count < o.qty then
      insert into tickets (order_id)
      select o.id from generate_series(1, o.qty - existing_count);
    end if;
  end loop;
end $$;

drop function if exists create_order(uuid, text, text, integer);
create or replace function create_order(
  p_event uuid,
  p_name text,
  p_email text,
  p_qty integer,
  p_user uuid
)
returns orders language plpgsql security definer set search_path = public as $$
declare ev events; o orders;
begin
  if p_qty < 1 or p_qty > 10 then raise exception 'Jumlah tiket harus 1-10'; end if;
  if p_user is null then raise exception 'Pengguna wajib login'; end if;
  select * into ev from events where id = p_event for update;
  if not found then raise exception 'Event tidak ditemukan'; end if;
  if ev.stock < p_qty then raise exception 'Stok tiket tidak cukup'; end if;
  update events set stock = stock - p_qty where id = p_event;
  insert into orders (event_id, user_id, buyer_name, buyer_email, qty, total)
  values (p_event, p_user, p_name, p_email, p_qty, ev.price * p_qty) returning * into o;
  return o;
end $$;

create or replace function complete_mock_payment(p_code text, p_user uuid)
returns orders language plpgsql security definer set search_path = public as $$
declare o orders; existing_count integer;
begin
  select * into o from orders where code = upper(trim(p_code)) for update;
  if not found or o.user_id is distinct from p_user then
    raise exception 'Kode pesanan tidak ditemukan';
  end if;
  if o.status = 'cancelled' then
    raise exception 'Pesanan telah dibatalkan dan tidak dapat dibayar';
  end if;

  if o.status = 'pending' then
    update orders set status = 'paid' where id = o.id returning * into o;
  end if;

  select count(*) into existing_count from tickets where order_id = o.id;
  if existing_count < o.qty then
    insert into tickets (order_id)
    select o.id from generate_series(1, o.qty - existing_count);
  end if;
  return o;
end $$;

-- Admin status changes to paid must follow the same ticket-minting invariant.
create or replace function set_order_status(p_id uuid, p_status text)
returns orders language plpgsql security definer set search_path = public as $$
declare o orders; existing_count integer;
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

  if p_status = 'paid' then
    select count(*) into existing_count from tickets where order_id = o.id;
    if existing_count < o.qty then
      insert into tickets (order_id)
      select o.id from generate_series(1, o.qty - existing_count);
    end if;
  end if;
  return o;
end $$;

revoke all on function create_order(uuid, text, text, integer, uuid) from public, anon, authenticated;
revoke all on function complete_mock_payment(text, uuid) from public, anon, authenticated;
revoke all on function set_order_status(uuid, text) from public, anon, authenticated;
grant execute on function create_order(uuid, text, text, integer, uuid) to service_role;
grant execute on function complete_mock_payment(text, uuid) to service_role;
grant execute on function set_order_status(uuid, text) to service_role;
