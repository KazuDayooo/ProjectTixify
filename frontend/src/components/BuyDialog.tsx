"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, type EventItem, type Order } from "@/lib/api";
import { rp } from "@/lib/format";

type Props = { event: EventItem; onClose: () => void; onDone: () => void };

export default function BuyDialog({ event, onClose, onDone }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await api.createOrder({
        event_id: event.id,
        buyer_name: name,
        buyer_email: email,
        qty,
      });
      setOrder(created);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Otomatis setujui transaksi saat dibayar
  async function handlePay() {
    if (!order) return;
    setPaying(true);
    setError("");
    try {
      const res = await api.payOrder(order.code);
      setOrder(res.order);
      setIsPaid(true);
      onDone();
    } catch (err) {
      setError((err as Error).message || "Gagal memproses pembayaran");
    } finally {
      setPaying(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h2 id="buy-title" style={{ margin: 0, fontSize: "1.35rem" }}>
            {event.name}
          </h2>
          <button type="button" className="alt sm" onClick={onClose} style={{ borderRadius: "50%", width: 32, height: 32, padding: 0 }}>
            ✕
          </button>
        </div>

        {order ? (
          <div>
            {isPaid || order.status === "paid" ? (
              /* State Pembayaran Sukses (Otomatis Disetujui) */
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "2rem",
                    margin: "0 auto 1rem",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                  }}
                >
                  ✓
                </div>

                <h3 style={{ margin: "0 0 0.25rem", color: "#065f46", fontSize: "1.25rem" }}>
                  Pembayaran Berhasil!
                </h3>
                <span className="badge badge-paid" style={{ marginBottom: "1rem" }}>
                  <span className="dot" /> Transaksi Otomatis Disetujui
                </span>

                <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0.5rem 0 1rem" }}>
                  E-tiket Anda telah terbit dan siap digunakan. Simpan kode pemesanan ini:
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <span className="code">{order.code}</span>
                  <button type="button" className="alt sm" onClick={() => copyCode(order.code)}>
                    {copied ? "✓ Tersalin" : "📋 Salin"}
                  </button>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    border: "1px solid var(--line)",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ color: "var(--muted)" }}>Pembeli:</span>
                    <strong>{order.buyer_name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ color: "var(--muted)" }}>Jumlah:</span>
                    <strong>{order.qty} Tiket</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Total Terbayar:</span>
                    <strong style={{ color: "var(--primary)" }}>{rp(order.total)}</strong>
                  </div>
                </div>

                <button type="button" onClick={onClose} style={{ width: "100%" }}>
                  Selesai
                </button>
              </div>
            ) : (
              /* State Menunggu Pembayaran + Tombol Bayar Sekarang */
              <div>
                <div className="msg" style={{ background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" }}>
                  <span style={{ fontSize: "1.2rem" }}>⏳</span>
                  <div>
                    <strong>Pesanan Dibuat!</strong> Silakan selesaikan pembayaran agar tiket otomatis disetujui.
                  </div>
                </div>

                <div style={{ textAlign: "center", margin: "1rem 0" }}>
                  <small style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Kode Pesanan Anda
                  </small>
                  <div style={{ margin: "0.25rem 0" }}>
                    <span className="code">{order.code}</span>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.5rem" }}>
                    Total: {rp(order.total)}
                  </div>
                </div>

                {/* Simulasi Metode Pembayaran */}
                <div
                  style={{
                    border: "1.5px solid var(--line)",
                    borderRadius: "12px",
                    padding: "1rem",
                    background: "#f8fafc",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--ink)" }}>
                    💳 Pilih Metode Pembayaran Cepat:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        padding: "0.6rem",
                        background: "#ffffff",
                        border: "1.5px solid var(--primary)",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      📱 QRIS Instant
                    </div>
                    <div
                      style={{
                        padding: "0.6rem",
                        background: "#ffffff",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                      }}
                    >
                      🏦 Virtual Account
                    </div>
                  </div>

                  <div style={{ fontSize: "0.775rem", color: "var(--muted)", textAlign: "center" }}>
                    Klik tombol di bawah untuk memproses pembayaran instan. Transaksi akan otomatis terverifikasi & disetujui.
                  </div>
                </div>

                {error && <p className="msg err">⚠️ {error}</p>}

                <div className="row" style={{ marginTop: "1.25rem" }}>
                  <button
                    type="button"
                    className="success"
                    onClick={handlePay}
                    disabled={paying}
                    style={{ flex: 1, padding: "0.75rem" }}
                  >
                    {paying ? "Memproses Verifikasi…" : "⚡ Bayar Sekarang (Otomatis Disetujui)"}
                  </button>
                  <button type="button" className="alt" onClick={onClose} disabled={paying}>
                    Nanti Saja
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Form Pemesanan Tiket */
          <form onSubmit={submit}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {rp(event.price)} per tiket · Sisa kuota {event.stock} tiket
            </div>

            <label htmlFor="name">Nama Lengkap</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              required
              maxLength={80}
            />

            <label htmlFor="email">Alamat Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com (tiket akan dikirim ke sini)"
              required
            />

            <label htmlFor="qty">Jumlah Tiket</label>
            <input
              id="qty"
              type="number"
              min={1}
              max={Math.min(10, event.stock)}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              required
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "1.25rem 0",
                padding: "0.75rem 1rem",
                background: "#f1f5f9",
                borderRadius: "10px",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--muted)" }}>Total Tagihan:</span>
              <strong style={{ fontSize: "1.25rem", color: "var(--primary)" }}>
                {rp(event.price * (qty || 0))}
              </strong>
            </div>

            <div className="row">
              <button type="submit" disabled={busy} style={{ flex: 1 }}>
                {busy ? "Memproses Pesanan…" : "Lanjut ke Pembayaran"}
              </button>
              <button type="button" className="alt" onClick={onClose} disabled={busy}>
                Batal
              </button>
            </div>

            {error && <p className="msg err">⚠️ {error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
