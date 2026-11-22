"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, isUnauthorized, type TicketCheck as TicketCheckResult } from "@/lib/api";

export default function TicketCheckIn({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TicketCheckResult | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const lookupTicket = useCallback(async (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);
    setCode(normalized);
    try {
      setResult(await api.ticket(token, normalized));
    } catch (err) {
      if (isUnauthorized(err)) return onExpired();
      setError((err as Error).message || "Tiket tidak dapat diperiksa.");
    } finally {
      setLoading(false);
    }
  }, [onExpired, token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await lookupTicket(code);
  }

  async function allowEntry() {
    if (!result || result.ticket_status !== "valid" || result.order_status !== "paid") return;
    setCheckingIn(true);
    setError("");
    setMessage("");
    try {
      const checked = await api.checkIn(token, result.ticket_code);
      setResult({ ...result, ...checked, ticket_status: "used" });
      setMessage("Tiket berhasil dikonfirmasi. Pengunjung boleh masuk.");
    } catch (err) {
      if (isUnauthorized(err)) return onExpired();
      setError((err as Error).message || "Gagal mengonfirmasi tiket.");
    } finally {
      setCheckingIn(false);
    }
  }

  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    let hasScanned = false;
    let scannerControls: { stop: () => void } | undefined;

    async function scan() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Browser ini tidak menyediakan akses kamera. Buka halaman melalui HTTPS atau gunakan scanner QR/ketik kode tiket.");
        setCameraActive(false);
        return;
      }
      const video = videoRef.current;
      if (!video) return;

      setCameraLoading(true);
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserQRCodeReader();
        scannerControls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (!result || cancelled || hasScanned) return;
            hasScanned = true;
            setCameraActive(false);
            setError("");
            void lookupTicket(result.getText());
          }
        );
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error && err.name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi."
            : "Kamera tidak dapat dibuka. Pastikan kamera tidak sedang digunakan aplikasi lain dan halaman memakai HTTPS.";
          setError(message);
          setCameraActive(false);
        }
      } finally {
        if (!cancelled) setCameraLoading(false);
      }
    }

    void scan();
    return () => {
      cancelled = true;
      scannerControls?.stop();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraActive, lookupTicket]);

  const paid = result?.order_status === "paid";
  const alreadyUsed = result?.ticket_status === "used";

  return (
    <section className="ticket-checkin">
      <header className="checkin-intro">
        <p className="checkin-kicker">AKSES EVENT</p>
        <h1>Konfirmasi tiket</h1>
        <p>Scan QR atau masukkan kode tiket. Setelah dikonfirmasi, tiket langsung ditandai terpakai dan tidak bisa digunakan lagi.</p>
      </header>

      <div className="checkin-card">
        <div className="checkin-card-heading">
          <span className="checkin-icon" aria-hidden="true">⌕</span>
          <div>
            <h2>Periksa tiket masuk</h2>
            <p>Gunakan kamera atau scanner yang berfungsi seperti keyboard.</p>
          </div>
        </div>
        <form className="checkin-form" onSubmit={submit}>
          <label htmlFor="ticket-code">Kode tiket</label>
          <div className="checkin-input-row">
            <input
              id="ticket-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: 4A8F0D12C93B"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
              required
              aria-describedby="ticket-code-help"
            />
            <button type="submit" disabled={loading || !code.trim()}>{loading ? "Memeriksa…" : "Periksa tiket"}</button>
          </div>
          <small id="ticket-code-help">Scanner QR model keyboard bisa langsung memindai di kolom ini lalu tekan Enter.</small>
        </form>

        <div className="checkin-camera-actions">
          <button type="button" className="alt" onClick={() => { setError(""); setCameraLoading(false); setCameraActive((active) => !active); }}>
            {cameraActive ? "Tutup kamera" : "▣ Scan dengan kamera"}
          </button>
        </div>
        {cameraActive && (
          <div className="checkin-scanner" aria-live="polite">
            <video ref={videoRef} className="checkin-video" autoPlay muted playsInline aria-label="Pratinjau kamera pemindai QR" />
            <span className="checkin-scan-frame" aria-hidden="true" />
            <p>{cameraLoading ? "Mengaktifkan kamera…" : "Arahkan QR tiket ke dalam bingkai"}</p>
          </div>
        )}

        {error && <div className="msg err" role="alert">⚠️ {error}</div>}
        {message && <div className="msg ok" role="status">✓ {message}</div>}

        {result && (
          <div className={`checkin-result ${alreadyUsed ? "is-used" : paid ? "is-valid" : "is-blocked"}`}>
            <div className="checkin-result-top">
              <div>
                <small>KODE TIKET</small>
                <strong className="checkin-code">{result.ticket_code}</strong>
              </div>
              <span className="checkin-status">
                {alreadyUsed ? "SUDAH DIGUNAKAN" : paid ? "VALID · LUNAS" : "BELUM BISA MASUK"}
              </span>
            </div>
            <div className="checkin-details">
              <div><small>Nama pemegang</small><strong>{result.buyer_name}</strong></div>
              <div><small>Event</small><strong>{result.event_name}</strong></div>
              {result.venue && <div><small>Lokasi</small><strong>{result.venue}</strong></div>}
              <div><small>Kode pesanan</small><strong>{result.order_code}</strong></div>
            </div>
            {alreadyUsed && result.used_at && <p className="checkin-used-time">Dipakai pada {new Date(result.used_at).toLocaleString("id-ID")}</p>}
            {result.ticket_status === "valid" && paid && (
              <button type="button" className="checkin-confirm" onClick={allowEntry} disabled={checkingIn}>
                {checkingIn ? "Mengonfirmasi…" : "✓ Izinkan masuk & tandai terpakai"}
              </button>
            )}
            {!paid && <p className="checkin-warning">Pesanan belum lunas atau telah dibatalkan. Pengunjung belum dapat masuk.</p>}
          </div>
        )}
      </div>

      <aside className="checkin-note"><strong>Keamanan check-in</strong><span>Setiap tiket hanya bisa dikonfirmasi satu kali. Jika kode yang sama discan lagi, sistem akan menolak otomatis.</span></aside>
    </section>
  );
}
