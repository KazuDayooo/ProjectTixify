export type Status = "pending" | "paid" | "cancelled";

export const rp = (n: number) => {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
};

export const tgl = (d: string) => {
  try {
    return new Date(d).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return d;
  }
};

export const tglShort = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Lunas (Terverifikasi)",
  cancelled: "Dibatalkan",
};
