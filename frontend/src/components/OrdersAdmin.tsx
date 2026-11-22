"use client";
import { useCallback, useEffect, useState } from "react";
import { api, isUnauthorized, type Order, type Status } from "@/lib/api";
import { rp, tglShort } from "@/lib/format";

const LABEL: Record<Status, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Lunas (Otomatis Disetujui)",
  cancelled: "Dibatalkan",
};

export default function OrdersAdmin({ token, onExpired, staffMode = false }: { token: string; onExpired: () => void; staffMode?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (e: unknown) => {
      if (isUnauthorized(e)) return onExpired();
      setError((e as Error).message || "Terjadi kesalahan");
    },
    [onExpired]
  );

  const load = useCallback(() => {
    setLoading(true);
    api
      .orders(token)
      .then((data) => {
        setOrders(data);
        setError("");
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [token, fail]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: Status) {
    try {
      await api.setStatus(token, id, status);
      setSuccessMsg(`Status pesanan berhasil diubah menjadi ${LABEL[status]}.`);
      setError("");
      load();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (e) {
      fail(e);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deleteOrder(token, deleteTarget.id);
      setSuccessMsg(`Pesanan ${deleteTarget.code} berhasil dihapus.`);
      setDeleteTarget(null);
      load();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // Filtered orders
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.code.toLowerCase().includes(q) ||
      o.buyer_name.toLowerCase().includes(q) ||
      (o.buyer_email || "").toLowerCase().includes(q) ||
      (o.events?.name && o.events.name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const paidOrders = orders.filter((o) => o.status === "paid");
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const approvalQueue = orders.filter((o) => o.approval_status !== "accepted" && o.status !== "cancelled");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTicketsSold = paidOrders.reduce((sum, o) => sum + (o.qty || 0), 0);

  async function acceptBooking(order: Order) {
    try {
      await api.acceptOrder(token, order.id);
      setSuccessMsg(`Pesanan ${order.code} diterima. Status pembayaran tidak berubah.`);
      setError("");
      load();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div>
      {/* Top Alerts */}
      {error && <div className="msg err">⚠️ {error}</div>}
      {successMsg && <div className="msg ok">✅ {successMsg}</div>}

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Omset Lunas</div>
            <div className="stat-val" style={{ color: "#059669" }}>
              {rp(totalRevenue)}
            </div>
            <div className="stat-sub">Dari {paidOrders.length} transaksi disetujui</div>
          </div>
          <div className="stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            💰
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Tiket Terjual</div>
            <div className="stat-val">{totalTicketsSold}</div>
            <div className="stat-sub">Tiket terbayar lunas</div>
          </div>
          <div className="stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            🎟️
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Menunggu Bayar</div>
            <div className="stat-val" style={{ color: pendingOrders.length > 0 ? "#d97706" : "var(--ink)" }}>
              {pendingOrders.length}
            </div>
            <div className="stat-sub">Otomatis lunas saat dibayar</div>
          </div>
          <div className="stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
            ⏳
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Pesanan</div>
            <div className="stat-val">{orders.length}</div>
            <div className="stat-sub">Seluruh transaksi masuk</div>
          </div>
          <div className="stat-icon" style={{ background: "#f1f5f9", color: "#475569" }}>
            📦
          </div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Persetujuan Booking</div>
            <div className="stat-val" style={{ color: approvalQueue.length ? "#b45309" : "#047857" }}>{approvalQueue.length}</div>
            <div className="stat-sub">Menunggu ditinjau petugas</div>
          </div>
          <div className="stat-icon" style={{ background: "#fff7ed", color: "#b45309" }}>✓</div>
        </div>
      </div>

      {/* Table Toolbar Panel */}
      <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="card-header-bar">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Data Transaksi & Pesanan</h3>
            <small style={{ color: "var(--muted)" }}>
              Persetujuan booking terpisah dari pembayaran. Menerima booking tidak mengubah status menjadi lunas.
            </small>
          </div>

          <div className="row">
            <button type="button" className="alt sm" onClick={load}>
              🔄 Refresh Data
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: "1rem", justifyContent: "space-between" }}>
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Cari kode, nama pembeli, email, event…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari pesanan"
            />
          </div>

          <div className="tabs" style={{ background: "#f1f5f9" }}>
            <button
              type="button"
              className={statusFilter === "all" ? "on" : ""}
              onClick={() => setStatusFilter("all")}
            >
              Semua ({orders.length})
            </button>
            <button
              type="button"
              className={statusFilter === "paid" ? "on" : ""}
              onClick={() => setStatusFilter("paid")}
            >
              Lunas ({paidOrders.length})
            </button>
            <button
              type="button"
              className={statusFilter === "pending" ? "on" : ""}
              onClick={() => setStatusFilter("pending")}
            >
              Menunggu ({pendingOrders.length})
            </button>
            <button
              type="button"
              className={statusFilter === "cancelled" ? "on" : ""}
              onClick={() => setStatusFilter("cancelled")}
            >
              Dibatalkan ({orders.filter((o) => o.status === "cancelled").length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Event</th>
              <th>Pembeli</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status Booking</th>
              <th>Status Transaksi</th>
              {!staffMode && <th>Ubah Status</th>}
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={staffMode ? 8 : 9} style={{ textAlign: "center", padding: "2.5rem" }}>
                  Memuat data transaksi…
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={staffMode ? 8 : 9} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
                  Tidak ada pesanan yang sesuai dengan filter.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((o) => (
                <tr key={o.id}>
                  {/* Kode with copy button */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          color: "var(--primary)",
                          background: "#f1f5f9",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {o.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(o.code)}
                        className="alt sm"
                        style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}
                        title="Salin kode pesanan"
                      >
                        {copiedCode === o.code ? "✓" : "📋"}
                      </button>
                    </div>
                    <small style={{ color: "var(--muted)" }}>{tglShort(o.created_at)}</small>
                  </td>

                  {/* Event */}
                  <td>
                    <strong style={{ color: "var(--ink)", display: "block" }}>{o.events?.name || "Event"}</strong>
                  </td>

                  {/* Pembeli */}
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.buyer_name}</div>
                    {o.buyer_email && <small style={{ color: "var(--muted)" }}>{o.buyer_email}</small>}
                  </td>

                  {/* Qty & Total */}
                  <td>
                    <span style={{ fontWeight: 700 }}>{o.qty}</span> tiket
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: "var(--ink)" }}>{rp(o.total)}</span>
                  </td>

                  <td>
                    <span className={`badge ${o.approval_status === "accepted" ? "badge-paid" : "badge-pending"}`}>
                      {o.status === "cancelled" ? "Tidak berlaku" : o.approval_status === "accepted" ? "✓ Diterima" : "Menunggu review"}
                    </span>
                    {o.accepted_at && <small style={{ display: "block", marginTop: 4, color: "var(--muted)" }}>{tglShort(o.accepted_at)}</small>}
                  </td>

                  {/* Status Badge */}
                  <td>
                    <span
                      className={`badge ${
                        o.status === "paid"
                          ? "badge-paid"
                          : o.status === "pending"
                          ? "badge-pending"
                          : "badge-cancelled"
                      }`}
                    >
                      <span className={`dot ${o.status === "pending" ? "pulse" : ""}`} />
                      {o.status === "paid"
                        ? "✓ Lunas (Otomatis Disetujui)"
                        : o.status === "pending"
                        ? "⏳ Menunggu Bayar"
                        : "✕ Dibatalkan"}
                    </span>
                  </td>

                  {/* Quick Select Status */}
                  {!staffMode && <td>
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value as Status)}
                      aria-label={`Ubah status ${o.code}`}
                      style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem", width: "auto" }}
                    >
                      <option value="pending">Menunggu</option>
                      <option value="paid">Lunas (Disetujui)</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </td>}

                  {/* Delete */}
                  <td style={{ textAlign: "right" }}>
                    <div className="action-row" style={{ justifyContent: "flex-end" }}>
                      {o.approval_status !== "accepted" && o.status !== "cancelled" && (
                        <button type="button" className="alt sm" onClick={() => acceptBooking(o)}>
                          ✓ Terima Booking
                        </button>
                      )}
                      {!staffMode && (
                        <button type="button" className="danger sm" onClick={() => setDeleteTarget(o)} title="Hapus transaksi">
                          🗑️ Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="overlay" onClick={() => !busy && setDeleteTarget(null)}>
          <div className="dlg" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#ef4444",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.8rem",
                  margin: "0 auto 1rem",
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>Hapus Pesanan?</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.925rem" }}>
                Hapus transaksi tiket <strong>{deleteTarget.code}</strong> atas nama{" "}
                <strong>{deleteTarget.buyer_name}</strong>? Jika status bukan dibatalkan, tiket akan dikembalikan ke stok.
              </p>
            </div>

            <div className="row" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
              <button
                type="button"
                className="alt"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className="danger"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Menghapus…" : "Ya, Hapus Pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
