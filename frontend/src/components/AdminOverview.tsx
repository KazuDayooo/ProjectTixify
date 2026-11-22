"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isUnauthorized, type EventItem, type Order } from "@/lib/api";
import { rp, tglShort } from "@/lib/format";

type AdminTab = "overview" | "checkin" | "orders" | "events" | "users";

export default function AdminOverview({ token, onNavigate, onExpired }: { token: string; onNavigate: (tab: AdminTab) => void; onExpired: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOrders, nextEvents] = await Promise.all([api.orders(token), api.events()]);
      setOrders(nextOrders);
      setEvents(nextEvents);
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        onExpired();
        return;
      }
      setError((requestError as Error).message || "Ringkasan dashboard gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [onExpired, token]);

  useEffect(() => { void load(); }, [load]);

  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const awaitingApproval = orders.filter((order) => order.status !== "cancelled" && order.approval_status !== "accepted");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const ticketsSold = paidOrders.reduce((sum, order) => sum + Number(order.qty || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-dashboard-welcome">
        <div>
          <p className="admin-dashboard-kicker">PUSAT KENDALI TIXIFY</p>
          <h1 id="admin-dashboard-title">Ringkasan operasional</h1>
          <p>Pantau event, pesanan, dan aktivitas tiket dari satu dashboard.</p>
        </div>
        <button type="button" className="alt" onClick={() => void load()} disabled={loading}>
          {loading ? "Memuat…" : "↻ Perbarui data"}
        </button>
      </header>

      {error && <div className="msg err" role="alert">{error}</div>}

      <div className="admin-overview-stats">
        <article className="admin-overview-stat">
          <span className="admin-overview-icon">🎭</span>
          <div><small>Event aktif</small><strong>{loading ? "—" : events.length}</strong><span>Acara terdaftar</span></div>
        </article>
        <article className="admin-overview-stat">
          <span className="admin-overview-icon is-blue">📦</span>
          <div><small>Total pesanan</small><strong>{loading ? "—" : orders.length}</strong><span>{pendingOrders.length} menunggu pembayaran</span></div>
        </article>
        <article className="admin-overview-stat">
          <span className="admin-overview-icon is-amber">✓</span>
          <div><small>Review booking</small><strong>{loading ? "—" : awaitingApproval.length}</strong><span>Menunggu persetujuan</span></div>
        </article>
        <article className="admin-overview-stat">
          <span className="admin-overview-icon is-green">↗</span>
          <div><small>Omzet lunas</small><strong>{loading ? "—" : rp(revenue)}</strong><span>{ticketsSold} tiket terbayar</span></div>
        </article>
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-head">
            <div><h2>Pesanan terbaru</h2><p>Aktivitas transaksi yang baru masuk</p></div>
            <button type="button" className="alt sm" onClick={() => onNavigate("orders")}>Semua pesanan →</button>
          </div>
          {recentOrders.length ? (
            <div className="admin-recent-orders">
              {recentOrders.map((order) => (
                <div className="admin-recent-order" key={order.id}>
                  <div className="admin-recent-code">{order.code}</div>
                  <div className="admin-recent-info"><strong>{order.buyer_name}</strong><span>{order.events?.name || "Event"} · {tglShort(order.created_at)}</span></div>
                  <div className="admin-recent-total">{rp(order.total)}</div>
                  <span className={`badge ${order.status === "paid" ? "badge-paid" : order.status === "pending" ? "badge-pending" : "badge-cancelled"}`}>
                    {order.status === "paid" ? "Lunas" : order.status === "pending" ? "Menunggu" : "Batal"}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="admin-dashboard-empty">{loading ? "Memuat pesanan…" : "Belum ada pesanan tercatat."}</p>}
        </section>

        <aside className="admin-dashboard-panel admin-quick-actions">
          <div className="admin-dashboard-panel-head"><div><h2>Akses cepat</h2><p>Pintasan operasional</p></div></div>
          <button type="button" onClick={() => onNavigate("checkin")}><span>▦</span><div><strong>Scan tiket</strong><small>Validasi tiket masuk</small></div><b>→</b></button>
          <button type="button" onClick={() => onNavigate("orders")}><span>↗</span><div><strong>Kelola pesanan</strong><small>Tinjau dan setujui booking</small></div><b>→</b></button>
          <button type="button" onClick={() => onNavigate("events")}><span>＋</span><div><strong>Kelola event</strong><small>Atur jadwal dan kuota</small></div><b>→</b></button>
          <button type="button" onClick={() => onNavigate("users")}><span>♙</span><div><strong>Kelola pengguna</strong><small>Admin, staff, dan pelanggan</small></div><b>→</b></button>
        </aside>
      </div>
    </section>
  );
}
