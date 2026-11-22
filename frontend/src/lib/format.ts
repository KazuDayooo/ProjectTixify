import type { Status } from "./api";

export const rp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export const tgl = (d: string) =>
  new Date(d).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });

export const tglShort = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Lunas (Otomatis Disetujui)",
  cancelled: "Dibatalkan",
};

// ISO -> nilai untuk <input type="datetime-local"> (zona waktu lokal)
export const toLocalInput = (d: string) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
