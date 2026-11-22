"use client";
import { FormEvent, useState } from "react";
import { api, type OrderLookup } from "@/lib/api";
import { rp, tgl } from "@/lib/format";

export default function OrderLookupBox() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<OrderLookup | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setError("");
    setPaySuccess("");
    setLoading(true);
    try {
      setResult(await api.lookup(code.trim()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function payNow() {
    if (!result) return;
    setPaying(true);
    setError("");
    try {
      const res = await api.payOrder(result.code);
      setResult({
        ...result,
        status: res.order.status,
      });
      setPaySuccess("Pembayaran berhasil! Transaksi otomatis disetujui.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="order-lookup-panel panel" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>🔍</span>
        <strong style={{ fontSize: "1.1rem" }}>Cek Status Tiket & Pembayaran</strong>
      </div>
      <small style={{ color: "var(--muted)", display: "block", marginBottom: "0.85rem" }}>
        Masukkan 8 karakter kode pesanan Anda untuk memeriksa e-tiket atau melanjutkan pembayaran.
      </small>

      <form className="order-lookup-form" onSubmit={submit}>
        <div className="order-lookup-field">
          <input
            className="order-lookup-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Contoh: A2425C55"
            required
            aria-label="Kode pesanan"
          />
        </div>
        <button className="order-lookup-submit btn-coral" type="submit" disabled={loading}>
          {loading ? "Memeriksa…" : "Cek Pesanan"}
        </button>
      </form>

      {error && <p className="msg err">⚠️ {error}</p>}
      {paySuccess && <p className="msg ok">✅ {paySuccess}</p>}

      {result && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1.25rem",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1.5px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "var(--primary)",
                  background: "#eef2ff",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "6px",
                  display: "inline-block",
                  marginBottom: "0.35rem",
                }}
              >
                {result.code}
              </span>
              <h4 style={{ margin: "0.2rem 0", fontSize: "1.2rem", fontWeight: 700 }}>{result.event_name}</h4>
              {result.venue && <small style={{ color: "var(--muted)" }}>📍 {result.venue}</small>}
              {result.event_date && (
                <small style={{ color: "var(--muted)", display: "block" }}>
                  📅 {tgl(result.event_date)}
                </small>
              )}
            </div>

            <span
              className={`badge ${
                result.status === "paid"
                  ? "badge-paid"
                  : result.status === "pending"
                  ? "badge-pending"
                  : "badge-cancelled"
              }`}
            >
              <span className={`dot ${result.status === "pending" ? "pulse" : ""}`} />
              {result.status === "paid"
                ? "✓ Lunas (Otomatis Disetujui)"
                : result.status === "pending"
                ? "⏳ Menunggu Pembayaran"
                : "✕ Dibatalkan"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
              background: "#ffffff",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              marginBottom: result.status === "pending" ? "1rem" : "0",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Atas Nama</span>
              <div style={{ fontWeight: 600 }}>{result.buyer_name}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Jumlah Tiket</span>
              <div style={{ fontWeight: 600 }}>{result.qty} Tiket</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Total Pembayaran</span>
              <div style={{ fontWeight: 800, color: "var(--primary)" }}>{rp(result.total)}</div>
            </div>
          </div>

          {result.tickets && result.tickets.length > 0 && (
            <div style={{ marginTop: "0.85rem", padding: "0.85rem 1rem", border: "1px solid var(--line)", borderRadius: "8px", background: "#fff" }}>
              <strong style={{ display: "block", marginBottom: "0.55rem", fontSize: "0.82rem" }}>Kode tiket individual</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem" }}>
                {result.tickets.map((ticket, index) => (
                  <div key={ticket.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.55rem 0.65rem", borderRadius: "7px", background: "#f8fafc" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.06em" }}>Tiket {index + 1} · {ticket.code}</span>
                    <span style={{ color: ticket.status === "used" ? "#b91c1c" : "#15803d", fontSize: "0.68rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                      {ticket.status === "used" ? "Terpakai" : "Tersedia"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.status === "pending" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "#92400e" }}>
                Pesanan ini belum dibayar. Klik tombol di samping untuk melunasi & menyetujui transaksi secara instan.
              </div>
              <button
                type="button"
                className="success sm"
                onClick={payNow}
                disabled={paying}
                style={{ padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
              >
                {paying ? "Memproses…" : "⚡ Bayar Sekarang (Otomatis Disetujui)"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
