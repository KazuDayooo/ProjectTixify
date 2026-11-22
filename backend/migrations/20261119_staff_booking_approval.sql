-- Run once on Supabase to enable staff booking approval as a separate state
-- from payment. Staff approval never marks an order as paid.

alter table orders
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'accepted')),
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid;

-- Preserve existing paid orders as accepted; unpaid existing bookings remain
-- in the staff queue for explicit approval.
update orders
set approval_status = 'accepted', accepted_at = coalesce(accepted_at, created_at)
where status = 'paid' and approval_status = 'pending';

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
  where id = p_id
  returning * into o;
  return o;
end $$;

revoke all on function accept_order(uuid, uuid) from public, anon, authenticated;
grant execute on function accept_order(uuid, uuid) to service_role;
