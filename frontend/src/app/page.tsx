"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type EventItem } from "@/lib/api";
import { rp, tgl } from "@/lib/format";
import OrderLookupBox from "@/components/OrderLookup";
import { Icon, type IconName } from "@/components/Icons";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "mobile", title: "Pesan lewat aplikasi", text: "Dibuat dengan Expo React Native, mulus di Android dan iOS." },
  { icon: "qr", title: "E-tiket dengan kode QR", text: "Tiket tersimpan di ponsel dan langsung dipindai di pintu masuk." },
  { icon: "chart", title: "Dasbor untuk pengelola", text: "Tambah event, pantau penjualan, ubah status, dan kelola staf." },
  { icon: "bolt", title: "Cek dan bayar instan", text: "Masukkan kode transaksi 8 digit untuk melihat status atau melunasi." },
];

const NAV = [["#event", "Event"], ["#fitur", "Fitur"], ["#mobile-app", "Aplikasi"], ["#cek-pesanan", "Cek tiket"]];

export default function Home() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.events().then(setEvents).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip public-home">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center mx-auto px-5 py-5 max-w-6xl">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
          <span className="place-items-center grid bg-[var(--coral)] rounded-lg w-9 h-9 text-[var(--ink)]">
            <Icon name="ticket" className="w-5 h-5" />
          </span>
          Tixify
        </Link>
        <div className="hidden md:flex items-center gap-7 font-medium text-slate-600 text-sm">
          {NAV.map(([h, l]) => (
            <a key={h} href={h} className="hover:text-[var(--sun)]">{l}</a>
          ))}
        </div>
        <div className="landing-auth-actions">
          <Link href="/admin/login" className="landing-login-link">Login Admin</Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="items-center gap-12 grid lg:grid-cols-12 mx-auto px-5 pt-12 pb-24 max-w-6xl">
        <div className="lg:col-span-7">
          <h1 className="font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
            Tiket konser, <br />
            sekali ketuk di ponsel.
          </h1>
          <p className="mt-6 max-w-lg text-slate-600 text-lg">
            Pilih event, pesan, lalu tunjukkan QR di pintu masuk. Pengelola acara memantau semuanya dari satu dasbor web.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a href="#mobile-app" className="btn-coral"><Icon name="mobile" className="w-4 h-4" /> Download aplikasi</a>
            <a href="#cek-pesanan" className="btn-ghost"><Icon name="search" className="w-4 h-4" /> Cek status pesanan</a>
          </div>
        </div>

        {/* Tiket hero: satu-satunya elemen yang "berbicara" */}
        <div className="flex justify-center lg:col-span-5">
          <div className="bg-[var(--cobalt)] shadow-2xl shadow-black/40 rounded-3xl w-full max-w-sm overflow-hidden text-white hero-ticket">
            <div className="space-y-4 p-6">
              <div className="flex justify-between items-center font-bold text-xs">
                <span className="font-mono">#TXF-9821</span>
                <span className="bg-white/20 badge"><Icon name="check" className="w-3.5 h-3.5" /> Lunas</span>
              </div>
              <div className="font-extrabold text-3xl leading-tight">Neon Night Music Fest 2026</div>
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                <Icon name="pin" className="w-4 h-4" /> Gelora Bung Karno, Jakarta
              </div>
            </div>
            <div className="relative bg-[var(--paper)] p-6 border-white/40 border-t-2 border-dashed text-[var(--ink)]">
              <span className="-top-3 -left-3 absolute bg-[var(--ink)] rounded-full w-6 h-6" />
              <span className="-top-3 -right-3 absolute bg-[var(--ink)] rounded-full w-6 h-6" />
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-500 text-xs">2 tiket</div>
                  <div className="font-bold text-sm">Tunjukkan di pintu masuk</div>
                </div>
                <Icon name="qr" className="w-14 h-14" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-28 mx-auto px-5 pb-24 max-w-6xl">
        {/* EVENT */}
        <section id="event" className="scroll-mt-8">
          <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight">Event mendatang</h2>
          <p className="mt-2 max-w-xl text-slate-400">Pembelian tiket resmi dilakukan lewat aplikasi mobile Tixify.</p>

          {error && <p className="flex items-center gap-2 bg-red-50 mt-8 p-4 rounded-lg text-red-700 text-sm"><Icon name="alert" className="w-4 h-4" /> Gagal memuat event: {error}</p>}
          {!events && !error && <p className="mt-8 text-slate-400">Memuat event…</p>}
          {events?.length === 0 && <p className="mt-8 text-slate-400">Belum ada event. Cek lagi nanti.</p>}

          <div className="gap-6 grid md:grid-cols-2 lg:grid-cols-3 mt-10">
            {events?.map((e) => (
              <article className="ticket" key={e.id}>
                <div className="flex-1 space-y-3 p-6">
                  <h3 className="font-bold text-xl leading-snug">{e.name}</h3>
                  <div className="space-y-1.5 text-slate-400 text-sm">
                    <div className="flex items-center gap-2"><Icon name="calendar" className="w-4 h-4" />{tgl(e.event_date)}</div>
                    <div className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4" />{e.venue || "Lokasi menyusul"}</div>
                  </div>
                  {e.description && <p className="text-slate-400 text-sm line-clamp-2">{e.description}</p>}
                </div>
                <div className="flex justify-between items-center p-6 stub">
                  <div>
                    <div className="font-extrabold text-[var(--sun)] text-xl">{rp(e.price)}</div>
                    <small className="text-slate-400 text-xs">{e.stock > 0 ? `Sisa ${e.stock} tiket` : "Tiket habis"}</small>
                  </div>
                  <a href="#mobile-app" className="!px-4 !py-2 !text-xs btn-coral">Lihat aplikasi</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FITUR */}
        <section id="fitur" className="scroll-mt-8">
          <h2 className="max-w-xl font-extrabold text-3xl sm:text-4xl tracking-tight">Satu platform untuk pengunjung dan pengelola</h2>
          <div className="gap-x-12 grid md:grid-cols-2 mt-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 py-6 border-[var(--line)] border-t">
                <Icon name={f.icon} className="mt-1 w-6 h-6 text-[var(--sun)]" />
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="mt-1 text-slate-400 text-sm">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* APLIKASI MOBILE */}
        <section id="mobile-app" className="lg:items-center gap-10 grid lg:grid-cols-12 bg-[var(--cobalt)] p-8 sm:p-12 rounded-3xl scroll-mt-8">
          <div className="lg:col-span-7">
            <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight">Download aplikasi Tixify</h2>
            <p className="mt-3 max-w-xl text-blue-50 text-sm leading-6">
              Aplikasi sedang disiapkan agar pemesanan dan e-tiket terhubung langsung ke layanan Tixify. Tautan unduhan resmi akan tersedia di sini setelah aplikasi siap.
            </p>
            <ol className="space-y-3 mt-6 text-blue-50">
              {["Temukan event yang ingin Anda datangi.", "Pesan tiket dengan aman melalui aplikasi.", "Simpan e-tiket dan tunjukkan QR saat masuk."].map((t, i) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <span className="place-items-center grid bg-white rounded-full w-7 h-7 font-bold text-[var(--cobalt)] shrink-0">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-5 download-platforms">
            <div className="download-platform-card" aria-label="Google Play, segera hadir">
              <span className="download-platform-icon" aria-hidden="true">▶</span>
              <span><small>SEGERA HADIR DI</small><strong>Google Play</strong></span>
              <span className="download-platform-status">Segera hadir</span>
            </div>
            <div className="download-platform-card" aria-label="App Store, segera hadir">
              <span className="download-platform-icon" aria-hidden="true">●</span>
              <span><small>SEGERA HADIR DI</small><strong>App Store</strong></span>
              <span className="download-platform-status">Segera hadir</span>
            </div>
          </div>
        </section>

        {/* CEK PESANAN */}
        <section id="cek-pesanan" className="space-y-8 scroll-mt-8">
          <div>
            <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight">Cek status tiket dan pembayaran</h2>
            <p className="mt-2 max-w-xl text-slate-400">Sudah memesan? Masukkan kode transaksi untuk melihat status atau menyelesaikan pembayaran.</p>
          </div>
          <OrderLookupBox />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-10 border-[var(--line)] border-t text-sm">
        <div className="flex md:flex-row flex-col justify-between items-center gap-4 mx-auto px-5 max-w-6xl">
          <div className="flex items-center gap-2 font-bold">
            <span className="place-items-center grid bg-[var(--coral)] rounded-md w-6 h-6 text-[var(--ink)]"><Icon name="ticket" className="w-3.5 h-3.5" /></span>
            Tixify <span className="font-normal text-slate-400">Platform tiket dan manajemen event.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-slate-400">
            {NAV.map(([h, l]) => <a key={h} href={h} className="hover:text-[var(--sun)]">{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
