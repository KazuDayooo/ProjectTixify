"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, isUnauthorized, type UserItem, type UserOrdersResponse, type UserPaymentStatus, type UserRole } from "@/lib/api";
import { rp, tglShort } from "@/lib/format";

type Props = {
  token: string;
  onExpired: () => void;
};

export default function UsersAdmin({ token, onExpired }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | UserPaymentStatus>("all");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalUser, setEditModalUser] = useState<UserItem | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<UserItem | null>(null);
  const [ordersModalUser, setOrdersModalUser] = useState<UserItem | null>(null);
  const [userOrdersData, setUserOrdersData] = useState<UserOrdersResponse | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  // Form States (Add)
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("user");

  // Form States (Edit)
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("user");

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
      .users(token)
      .then((data) => {
        setUsers(data);
        setError("");
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [token, fail]);

  useEffect(() => {
    load();
  }, [load]);

  // Open Edit
  function openEdit(u: UserItem) {
    setEditModalUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword("");
    setEditRole(u.role);
    setError("");
  }

  // Handle Add User
  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createUser(token, {
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
      });
      setSuccessMsg(`Pengguna "${formEmail}" berhasil ditambahkan.`);
      setAddModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("user");
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Handle Edit User
  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editModalUser) return;
    setBusy(true);
    setError("");
    try {
      await api.updateUser(token, editModalUser.id, {
        name: editName,
        email: editEmail,
        password: editPassword ? editPassword : undefined,
        role: editRole,
      });
      setSuccessMsg(`Data pengguna "${editEmail}" berhasil diperbarui.`);
      setEditModalUser(null);
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Handle Delete User
  async function submitDelete() {
    if (!deleteModalUser) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteUser(token, deleteModalUser.id);
      setSuccessMsg(`Pengguna "${deleteModalUser.email}" berhasil dihapus.`);
      setDeleteModalUser(null);
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Open User Orders Modal
  async function openUserOrders(u: UserItem) {
    setOrdersModalUser(u);
    setUserOrdersData(null);
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const data = await api.userOrders(token, u.id);
      setUserOrdersData(data);
    } catch (err) {
      setOrdersError((err as Error).message || "Gagal memuat detail pesanan pengguna");
    } finally {
      setLoadingOrders(false);
    }
  }

  function copyText(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesPayment = paymentFilter === "all" || (u.payment_status || "none") === paymentFilter;
    return matchesSearch && matchesRole && matchesPayment;
  });

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalStaff = users.filter((u) => u.role === "staff").length;
  const totalRegular = users.filter((u) => u.role === "user").length;
  const totalPaidUsers = users.filter((u) => u.payment_status === "paid").length;
  const totalUnpaidUsers = users.filter((u) => u.payment_status === "unpaid").length;
  const totalCancelledUsers = users.filter((u) => u.payment_status === "cancelled").length;
  const totalRevenue = users.reduce((sum, u) => sum + (u.total_spent || 0), 0);

  return (
    <div className="users-admin">
      {/* Top Notification Alerts */}
      {error && <div className="msg err" role="alert">⚠️ {error}</div>}
      {successMsg && <div className="msg ok" role="status">✅ {successMsg}</div>}

      <section className="users-intro" aria-labelledby="users-title">
        <div>
          <p className="users-kicker">ADMINISTRASI AKUN</p>
          <h1 id="users-title">Manajemen Pengguna</h1>
          <p>Kelola akun, hak akses, dan riwayat transaksi pengguna dari satu tempat.</p>
        </div>
        <div className="users-count-pill">{filteredUsers.length} <span>dari {users.length} pengguna</span></div>
      </section>

      {/* Mini Stats Banner */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Pengguna</div>
            <div className="stat-val">{users.length}</div>
            <div className="stat-sub">{totalRegular} User, {totalStaff} Staff, {totalAdmins} Admin</div>
          </div>
          <div className="stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            👥
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Sudah Bayar / Lunas</div>
            <div className="stat-val" style={{ color: "#16a34a" }}>{totalPaidUsers}</div>
            <div className="stat-sub">Semua tiket telah lunas</div>
          </div>
          <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            ✓
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Belum Bayar (Pending)</div>
            <div className="stat-val" style={{ color: totalUnpaidUsers > 0 ? "#ea580c" : "var(--ink)" }}>{totalUnpaidUsers}</div>
            <div className="stat-sub">Ada tagihan belum lunas</div>
          </div>
          <div className="stat-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
            ⏳
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Pemasukan User</div>
            <div className="stat-val" style={{ fontSize: "1.35rem", color: "var(--sun)" }}>{rp(totalRevenue)}</div>
            <div className="stat-sub">Total akumulasi transaksi lunas</div>
          </div>
          <div className="stat-icon" style={{ background: "#fefce8", color: "#ca8a04" }}>
            💰
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="card-header-bar">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Daftar Pengguna &amp; Pembayaran</h3>
            <small style={{ color: "var(--muted)" }}>Pantau status pembayaran tiket dan kelola akun pengguna</small>
          </div>

          <div className="row">
            <button type="button" className="alt" onClick={load} disabled={loading}>
              {loading ? "Memuat…" : "↻ Muat ulang"}
            </button>
            <button type="button" onClick={() => { setAddModalOpen(true); setError(""); }}>
              <span style={{ fontSize: "1.1rem" }}>+</span> Tambah Pengguna
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Payment / Role Filters */}
        <div className="row" style={{ marginTop: "1rem", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div className="search-input-wrap" style={{ minWidth: 260 }}>
            <input
              type="text"
              placeholder="Cari email atau nama pengguna…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari pengguna"
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Filter Status Pembayaran */}
            <div className="tabs" style={{ background: "#f8fafc", border: "1px solid var(--line)" }}>
              <button
                type="button"
                className={paymentFilter === "all" ? "on" : ""}
                onClick={() => setPaymentFilter("all")}
              >
                Semua Status
              </button>
              <button
                type="button"
                className={paymentFilter === "paid" ? "on" : ""}
                onClick={() => setPaymentFilter("paid")}
                style={{ color: paymentFilter === "paid" ? undefined : "#16a34a" }}
              >
                ✓ Lunas ({totalPaidUsers})
              </button>
              <button
                type="button"
                className={paymentFilter === "unpaid" ? "on" : ""}
                onClick={() => setPaymentFilter("unpaid")}
                style={{ color: paymentFilter === "unpaid" ? undefined : "#ea580c" }}
              >
                ⏳ Belum Bayar ({totalUnpaidUsers})
              </button>
              <button
                type="button"
                className={paymentFilter === "none" ? "on" : ""}
                onClick={() => setPaymentFilter("none")}
              >
                Belum Order
              </button>
              <button
                type="button"
                className={paymentFilter === "cancelled" ? "on" : ""}
                onClick={() => setPaymentFilter("cancelled")}
              >
                ❌ Dibatalkan ({totalCancelledUsers})
              </button>
            </div>

            {/* Filter Role */}
            <div className="tabs" style={{ background: "#f8fafc", border: "1px solid var(--line)" }}>
              <button
                type="button"
                className={roleFilter === "all" ? "on" : ""}
                onClick={() => setRoleFilter("all")}
              >
                Semua Role
              </button>
              <button
                type="button"
                className={roleFilter === "admin" ? "on" : ""}
                onClick={() => setRoleFilter("admin")}
              >
                Admin ({totalAdmins})
              </button>
              <button
                type="button"
                className={roleFilter === "staff" ? "on" : ""}
                onClick={() => setRoleFilter("staff")}
              >
                Staff ({totalStaff})
              </button>
              <button
                type="button"
                className={roleFilter === "user" ? "on" : ""}
                onClick={() => setRoleFilter("user")}
              >
                User ({totalRegular})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
        <table>
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Role</th>
              <th>Status Pembayaran</th>
              <th>Total Belanja (Lunas)</th>
              <th>Terdaftar</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem" }}>
                  Memuat data pengguna &amp; status pesanan…
                </td>
              </tr>
            )}

            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
                  Tidak ada pengguna yang cocok dengan kriteria filter.
                </td>
              </tr>
            )}

            {!loading &&
              filteredUsers.map((u) => {
                const initials = (u.name || u.email).slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          className="avatar"
                          style={{
                            background:
                              u.role === "admin"
                                ? "linear-gradient(135deg, #102b50, #31577f)"
                                : u.role === "staff"
                                  ? "linear-gradient(135deg, #047857, #10b981)"
                                  : "linear-gradient(135deg, #0284c7, #2563eb)",
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{u.name || "—"}</div>
                          <small style={{ color: "var(--muted)" }}>{u.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-admin" : u.role === "staff" ? "badge-staff" : "badge-user"}`}>
                        <span className="dot" />
                        {u.role === "admin" ? "Administrator" : u.role === "staff" ? "Staff / Petugas" : "User"}
                      </span>
                    </td>

                    <td>
                      {u.payment_status === "paid" && (
                        <span className="badge badge-paid">
                          ✓ Lunas ({u.paid_orders_count} pesanan)
                        </span>
                      )}
                      {u.payment_status === "unpaid" && (
                        <span className="badge badge-pending">
                          ⏳ Belum Bayar ({u.pending_orders_count} pesanan)
                        </span>
                      )}
                      {u.payment_status === "cancelled" && (
                        <span className="badge badge-cancelled">
                          ❌ Dibatalkan ({u.cancelled_orders_count})
                        </span>
                      )}
                      {(!u.payment_status || u.payment_status === "none") && (
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          Belum ada pesanan
                        </span>
                      )}
                    </td>

                    <td>
                      <strong style={{ color: (u.total_spent || 0) > 0 ? "var(--sun)" : "var(--muted)", fontSize: "0.95rem" }}>
                        {rp(u.total_spent || 0)}
                      </strong>
                      {(u.total_pending || 0) > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#f97316" }}>
                          Tagihan pending: {rp(u.total_pending || 0)}
                        </div>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: "0.875rem" }}>{tglShort(u.created_at)}</span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="action-row" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="!px-3 !py-1.5 !text-xs btn-coral sm"
                          onClick={() => openUserOrders(u)}
                          title="Lihat riwayat pesanan dan pembayaran user ini"
                        >
                          📋 Pesanan ({u.orders_count || 0})
                        </button>
                        <button
                          type="button"
                          className="alt sm"
                          onClick={() => openEdit(u)}
                          title="Ubah data pengguna"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          type="button"
                          className="danger sm"
                          onClick={() => { setDeleteModalUser(u); setError(""); }}
                          title="Hapus pengguna"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>


      {/* ========================================================
          MODAL: TAMBAH PENGGUNA BARU
         ======================================================== */}
      {addModalOpen && (
        <div className="overlay" onClick={() => !busy && setAddModalOpen(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Tambah Pengguna Baru</h3>
              <button
                type="button"
                className="alt sm"
                onClick={() => setAddModalOpen(false)}
                disabled={busy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitAdd}>
              <label htmlFor="add-name">Nama Lengkap</label>
              <input
                id="add-name"
                type="text"
                placeholder="Contoh: Sarah Connor"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />

              <label htmlFor="add-email">Alamat Email</label>
              <input
                id="add-email"
                type="email"
                placeholder="nama@domain.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />

              <label htmlFor="add-password">Password</label>
              <input
                id="add-password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                minLength={6}
              />

              <label htmlFor="add-role">Peran / Role</label>
              <select
                id="add-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
              >
                <option value="user">User Biasa (Pelanggan / Pembeli)</option>
                <option value="staff">Staff (Pesanan &amp; Check-in)</option>
                <option value="admin">Administrator (Akses Panel Admin)</option>
              </select>

              {error && <p className="msg err" style={{ marginTop: "1rem" }}>⚠️ {error}</p>}

              <div className="row" style={{ marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="alt"
                  onClick={() => setAddModalOpen(false)}
                  disabled={busy}
                >
                  Batal
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "Menyimpan…" : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: UBAH PENGGUNA
         ======================================================== */}
      {editModalUser && (
        <div className="overlay" onClick={() => !busy && setEditModalUser(null)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Ubah Pengguna</h3>
              <button
                type="button"
                className="alt sm"
                onClick={() => setEditModalUser(null)}
                disabled={busy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitEdit}>
              <label htmlFor="edit-name">Nama Lengkap</label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <label htmlFor="edit-email">Alamat Email</label>
              <input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />

              <label htmlFor="edit-password">Password Baru (Opsional)</label>
              <input
                id="edit-password"
                type="password"
                placeholder="Kosongkan jika tidak ingin mengganti password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                minLength={6}
              />
              <small style={{ color: "var(--muted)", display: "block", marginTop: "0.25rem" }}>
                Isi hanya jika ingin me-reset password akun ini (min 6 karakter).
              </small>

              <label htmlFor="edit-role">Peran / Role</label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
              >
                <option value="user">User Biasa</option>
                <option value="staff">Staff / Petugas</option>
                <option value="admin">Administrator</option>
              </select>

              {error && <p className="msg err" style={{ marginTop: "1rem" }}>⚠️ {error}</p>}

              <div className="row" style={{ marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="alt"
                  onClick={() => setEditModalUser(null)}
                  disabled={busy}
                >
                  Batal
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "Memperbarui…" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: KONFIRMASI HAPUS PENGGUNA
         ======================================================== */}
      {deleteModalUser && (
        <div className="overlay" onClick={() => !busy && setDeleteModalUser(null)}>
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
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>Hapus Pengguna?</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.925rem" }}>
                Apakah Anda yakin ingin menghapus akun <strong>{deleteModalUser.email}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            {error && <p className="msg err">⚠️ {error}</p>}

            <div className="row" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
              <button
                type="button"
                className="alt"
                onClick={() => setDeleteModalUser(null)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className="danger"
                onClick={submitDelete}
                disabled={busy}
              >
                {busy ? "Menghapus…" : "Ya, Hapus Pengguna"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DETAIL PESANAN & PEMBAYARAN PENGGUNA
         ======================================================== */}
      {ordersModalUser && (
        <div className="overlay" onClick={() => setOrdersModalUser(null)}>
          <div className="dlg" style={{ maxWidth: 820, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid var(--line)", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  className="avatar"
                  style={{
                    width: 48,
                    height: 48,
                    fontSize: "1.1rem",
                    background:
                      ordersModalUser.role === "admin"
                        ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                        : "linear-gradient(135deg, #0284c7, #2563eb)",
                  }}
                >
                  {(ordersModalUser.name || ordersModalUser.email).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>{ordersModalUser.name || "—"}</h3>
                    <span className={`badge ${ordersModalUser.role === "admin" ? "badge-admin" : ordersModalUser.role === "staff" ? "badge-staff" : "badge-user"}`}>
                      {ordersModalUser.role === "admin" ? "Administrator" : ordersModalUser.role === "staff" ? "Staff / Petugas" : "User"}
                    </span>
                  </div>
                  <small style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{ordersModalUser.email}</small>
                </div>
              </div>

              <button
                type="button"
                className="alt sm"
                onClick={() => setOrdersModalUser(null)}
                style={{ fontSize: "1rem", padding: "0.3rem 0.6rem" }}
              >
                ✕
              </button>
            </div>

            {ordersError && <div className="msg err" style={{ marginBottom: "1rem" }}>⚠️ {ordersError}</div>}

            {loadingOrders ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
                Memuat riwayat pesanan dan status pembayaran…
              </div>
            ) : userOrdersData ? (
              <div>
                {/* Ringkasan Finansial / Pembayaran User */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>TOTAL PESANAN</small>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--ink)", marginTop: "0.2rem" }}>
                      {userOrdersData.summary.orders_count}
                    </div>
                  </div>

                  <div style={{ background: "#f0fdf4", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 700 }}>TIKET LUNAS</small>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>
                      {userOrdersData.summary.paid_orders_count}
                    </div>
                  </div>

                  <div style={{ background: "#fff7ed", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #fed7aa" }}>
                    <small style={{ color: "#c2410c", fontSize: "0.75rem", fontWeight: 700 }}>BELUM BAYAR</small>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ea580c", marginTop: "0.2rem" }}>
                      {userOrdersData.summary.pending_orders_count}
                    </div>
                  </div>

                  <div style={{ background: "#eff6ff", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                    <small style={{ color: "#1d4ed8", fontSize: "0.75rem", fontWeight: 700 }}>TOTAL TERBAYAR</small>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2563eb", marginTop: "0.2rem" }}>
                      {rp(userOrdersData.summary.total_spent)}
                    </div>
                  </div>
                </div>

                {/* Tabel Pesanan */}
                <h4 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Riwayat Tiket &amp; Pembayaran</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: "normal" }}>
                    {userOrdersData.orders.length} transaksi tercatat
                  </span>
                </h4>

                {userOrdersData.orders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--line)", color: "var(--muted)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎟️</div>
                    Pengguna ini belum pernah melakukan pemesanan tiket apa pun.
                  </div>
                ) : (
                  <div className="scroll" style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--line)", borderRadius: "10px" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Kode Pesanan</th>
                          <th>Acara &amp; Lokasi</th>
                          <th>Qty</th>
                          <th>Total Tagihan</th>
                          <th>Status Bayar</th>
                          <th>Tgl Pesan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userOrdersData.orders.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <button
                                type="button"
                                onClick={() => copyText(o.code)}
                                title="Klik untuk salin kode tiket"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  color: "var(--cobalt)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                #{o.code}
                                <span style={{ fontSize: "0.75rem" }}>{copiedCode === o.code ? "✓" : "📋"}</span>
                              </button>
                            </td>

                            <td>
                              <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.875rem" }}>
                                {o.events?.name || "Event"}
                              </strong>
                              {o.events?.venue && (
                                <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                                  📍 {o.events.venue}
                                </small>
                              )}
                            </td>

                            <td style={{ fontWeight: 600 }}>{o.qty} tiket</td>

                            <td>
                              <strong style={{ color: o.status === "paid" ? "var(--sun)" : "var(--ink)" }}>
                                {rp(o.total)}
                              </strong>
                            </td>

                            <td>
                              {o.status === "paid" && (
                                <span className="badge badge-paid">
                                  ✓ LUNAS
                                </span>
                              )}
                              {o.status === "pending" && (
                                <span className="badge badge-pending">
                                  ⏳ BELUM BAYAR
                                </span>
                              )}
                              {o.status === "cancelled" && (
                                <span className="badge badge-cancelled">
                                  ❌ BATAL
                                </span>
                              )}
                            </td>

                            <td>
                              <small style={{ color: "var(--muted)" }}>{tglShort(o.created_at)}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            <div className="row" style={{ marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="alt"
                onClick={() => setOrdersModalUser(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

