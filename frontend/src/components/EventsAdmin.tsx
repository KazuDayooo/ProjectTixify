"use client";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { api, isUnauthorized, type EventItem } from "@/lib/api";
import { rp, tgl, toLocalInput } from "@/lib/format";

const empty = {
  name: "",
  venue: "",
  event_date: "",
  price: "",
  stock: "",
  description: "",
};
type Form = typeof empty;

export default function EventsAdmin({
  token,
  onExpired,
}: {
  token: string;
  onExpired: () => void;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(empty);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (e: unknown) => {
      if (isUnauthorized(e)) return onExpired();
      setMsg({ ok: false, text: (e as Error).message });
    },
    [onExpired]
  );

  const load = useCallback(() => {
    setLoading(true);
    api
      .events()
      .then((data) => {
        setEvents(data);
        setMsg(null);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const openCreateModal = () => {
    setForm(empty);
    setEditId(null);
    setModalOpen(true);
    setMsg(null);
  };

  function openEditModal(e: EventItem) {
    setEditId(e.id);
    setForm({
      name: e.name,
      venue: e.venue ?? "",
      event_date: toLocalInput(e.event_date),
      price: String(e.price),
      stock: String(e.stock),
      description: e.description ?? "",
    });
    setModalOpen(true);
    setMsg(null);
  }

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const body = {
      ...form,
      event_date: new Date(form.event_date).toISOString(),
      price: Number(form.price),
      stock: Number(form.stock),
    };
    try {
      if (editId) {
        await api.updateEvent(token, editId, body);
        setMsg({ ok: true, text: `Event "${form.name}" berhasil diperbarui.` });
      } else {
        await api.createEvent(token, body);
        setMsg({ ok: true, text: `Event baru "${form.name}" berhasil dibuat.` });
      }
      setModalOpen(false);
      setForm(empty);
      setEditId(null);
      load();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deleteEvent(token, deleteTarget.id);
      setMsg({ ok: true, text: `Event "${deleteTarget.name}" berhasil dihapus.` });
      setDeleteTarget(null);
      load();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  // Filtered events
  const filteredEvents = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  const totalTicketsAvailable = events.reduce((sum, e) => sum + (e.stock || 0), 0);

  return (
    <div>
      {/* Top Alerts */}
      {msg && <div className={msg.ok ? "msg ok" : "msg err"}>{msg.ok ? "✅ " : "⚠️ "}{msg.text}</div>}

      {/* Mini Stats Banner */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Event Aktif</div>
            <div className="stat-val">{events.length}</div>
            <div className="stat-sub">Event terdaftar dalam sistem</div>
          </div>
          <div className="stat-icon" style={{ background: "#ede9fe", color: "#6d28d9" }}>
            🎭
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Sisa Tiket</div>
            <div className="stat-val" style={{ color: "#0284c7" }}>
              {totalTicketsAvailable}
            </div>
            <div className="stat-sub">Tiket siap dipesan pembeli</div>
          </div>
          <div className="stat-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
            🎟️
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Event Terdekat</div>
            <div className="stat-val" style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.25rem" }}>
              {events[0] ? events[0].name.slice(0, 18) + (events[0].name.length > 18 ? "…" : "") : "Belum ada"}
            </div>
            <div className="stat-sub">
              {events[0] ? new Date(events[0].event_date).toLocaleDateString("id-ID") : "—"}
            </div>
          </div>
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            📅
          </div>
        </div>
      </div>

      {/* Table Toolbar Panel */}
      <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="card-header-bar">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Katalog Event</h3>
            <small style={{ color: "var(--muted)" }}>Kelola jadwal konser, festival, tiket, dan kuota</small>
          </div>

          <div className="row">
            <button type="button" onClick={openCreateModal}>
              <span style={{ fontSize: "1.1rem" }}>+</span> Buat Event Baru
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: "1rem", justifyContent: "space-between" }}>
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Cari nama event, lokasi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari event"
            />
          </div>

          <small style={{ color: "var(--muted)" }}>
            Menampilkan {filteredEvents.length} dari {events.length} event
          </small>
        </div>
      </div>

      {/* Events Table */}
      <div className="scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
        <table>
          <thead>
            <tr>
              <th>Event & Lokasi</th>
              <th>Jadwal & Jam</th>
              <th>Harga Tiket</th>
              <th>Sisa Kuota</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem" }}>
                  Memuat data event…
                </td>
              </tr>
            )}

            {!loading && filteredEvents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎟️</div>
                  Belum ada event yang cocok. Klik tombol <strong>+ Buat Event Baru</strong> untuk menambahkan.
                </td>
              </tr>
            )}

            {!loading &&
              filteredEvents.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>{e.name}</div>
                    <small style={{ color: "var(--muted)" }}>📍 {e.venue || "Lokasi belum ditentukan"}</small>
                    {e.description && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          marginTop: "0.25rem",
                          maxWidth: "320px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.description}
                      </div>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{tgl(e.event_date)}</span>
                  </td>

                  <td>
                    <span style={{ fontWeight: 800, color: "var(--primary)" }}>{rp(e.price)}</span>
                  </td>

                  <td>
                    <span
                      className={`badge ${e.stock > 10 ? "badge-paid" : e.stock > 0 ? "badge-pending" : "badge-cancelled"}`}
                    >
                      <span className="dot" />
                      {e.stock > 0 ? `${e.stock} tiket` : "Habis"}
                    </span>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div className="action-row" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="alt sm"
                        onClick={() => openEditModal(e)}
                        title="Ubah event"
                      >
                        ✏️ Ubah
                      </button>
                      <button
                        type="button"
                        className="danger sm"
                        onClick={() => setDeleteTarget(e)}
                        title="Hapus event"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL: BUAT / UBAH EVENT
         ======================================================== */}
      {modalOpen && (
        <div className="overlay" onClick={() => !busy && setModalOpen(false)}>
          <div className="dlg" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {editId ? "Ubah Data Event" : "Buat Event Baru"}
              </h3>
              <button
                type="button"
                className="alt sm"
                onClick={() => setModalOpen(false)}
                disabled={busy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={save}>
              <label htmlFor="ev-name">Nama Event</label>
              <input
                id="ev-name"
                value={form.name}
                onChange={setField("name")}
                placeholder="Contoh: Konser Musik Eksklusif 2026"
                required
              />

              <div className="form2">
                <div>
                  <label htmlFor="ev-venue">Lokasi / Venue</label>
                  <input
                    id="ev-venue"
                    value={form.venue}
                    onChange={setField("venue")}
                    placeholder="Contoh: Stadion GBK, Jakarta"
                  />
                </div>
                <div>
                  <label htmlFor="ev-date">Tanggal & Waktu</label>
                  <input
                    id="ev-date"
                    type="datetime-local"
                    value={form.event_date}
                    onChange={setField("event_date")}
                    required
                  />
                </div>
              </div>

              <div className="form2">
                <div>
                  <label htmlFor="ev-price">Harga per Tiket (Rp)</label>
                  <input
                    id="ev-price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={setField("price")}
                    placeholder="Contoh: 150000"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ev-stock">Kuota Tiket (Stok)</label>
                  <input
                    id="ev-stock"
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={setField("stock")}
                    placeholder="Contoh: 100"
                    required
                  />
                </div>
              </div>

              <label htmlFor="ev-desc">Deskripsi Singkat</label>
              <textarea
                id="ev-desc"
                value={form.description}
                onChange={setField("description")}
                placeholder="Rincian informasi event atau ketentuan tiket…"
                rows={3}
              />

              <div className="row" style={{ marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="alt"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                >
                  Batal
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Buat Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: KONFIRMASI HAPUS EVENT
         ======================================================== */}
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
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>Hapus Event?</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.925rem" }}>
                Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>? Semua transaksi dan pesanan
                terkait event ini akan ikut terhapus.
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
                {busy ? "Menghapus…" : "Ya, Hapus Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
