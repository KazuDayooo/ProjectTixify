"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EventsAdmin from "@/components/EventsAdmin";
import OrdersAdmin from "@/components/OrdersAdmin";
import UsersAdmin from "@/components/UsersAdmin";
import TicketCheckIn from "@/components/TicketCheckIn";
import AdminOverview from "@/components/AdminOverview";

const KEY = "admin_token";
const EMAIL_KEY = "admin_email";
const ROLE_KEY = "admin_role";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminRole, setAdminRole] = useState<"admin" | "staff" | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"overview" | "checkin" | "orders" | "events" | "users">("overview");

  useEffect(() => {
    const savedToken = sessionStorage.getItem(KEY);
    const savedRole = sessionStorage.getItem(ROLE_KEY);
    if (!savedToken || (savedRole !== "admin" && savedRole !== "staff")) {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(EMAIL_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      setReady(true);
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
    setAdminRole(savedRole);
    setAdminEmail(sessionStorage.getItem(EMAIL_KEY) || "Admin");
    if (savedRole === "staff") setTab("orders");
    setReady(true);
  }, [router]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    setToken(null);
    setAdminRole(null);
    router.replace("/admin/login");
  }, [router]);

  if (!ready) return null;

  return (
    <div className="admin-app">
      {/* Admin Top Navigation Bar */}
      <header className="admin-header-bar">
        <div className="admin-header-inner">
          <div className="admin-header-brand-group">
            <div className="admin-brand">
              <span> Tixify</span>
              <span className="pro-tag">{adminRole === "staff" ? "STAFF EVENT" : "ADMINISTRATOR"}</span>
            </div>

            <Link href="/" className="admin-home-link">
              <span></span> Lihat Website
            </Link>
          </div>

          {token && (
            <div className="admin-header-actions">
              <div className="admin-user-pill">
                <div className="avatar">
                  {adminEmail.slice(0, 2).toUpperCase()}
                </div>
                <span className="admin-email">{adminEmail}</span>
                <span className={`badge ${adminRole === "staff" ? "badge-staff" : "badge-admin"}`}>
                  {adminRole === "staff" ? "Petugas" : "Administrator"}
                </span>
              </div>

              <button
                type="button"
                className="alt sm admin-logout"
                onClick={logout}
                title="Keluar dari sesi admin"
              >
                Keluar 🚪
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="admin-main">
        {token && adminRole && (
          <>
            <div className="admin-toolbar">
              <div className="tabs admin-tabs" role="tablist" aria-label="Menu admin">
                {adminRole === "admin" && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "overview"}
                    className={tab === "overview" ? "on" : ""}
                    onClick={() => setTab("overview")}
                  >
                    ▦ Ringkasan
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "checkin"}
                  className={tab === "checkin" ? "on" : ""}
                  onClick={() => setTab("checkin")}
                >
                  ✅ Check-in Tiket
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "orders"}
                  className={tab === "orders" ? "on" : ""}
                  onClick={() => setTab("orders")}
                >
                  💳 {adminRole === "staff" ? "Daftar Pesanan" : "Pesanan & Transaksi"}
                </button>
                {adminRole === "admin" && <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "events"}
                  className={tab === "events" ? "on" : ""}
                  onClick={() => setTab("events")}
                >
                  🎟️ Katalog Event
                </button>}
                {adminRole === "admin" && <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "users"}
                  className={tab === "users" ? "on" : ""}
                  onClick={() => setTab("users")}
                >
                  👥 Pengguna
                </button>}
              </div>

              <div className="admin-date">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>

            {tab === "overview" && adminRole === "admin" && <AdminOverview token={token} onNavigate={setTab} onExpired={logout} />}
            {tab === "checkin" && <TicketCheckIn token={token} onExpired={logout} />}
            {tab === "orders" && <OrdersAdmin token={token} onExpired={logout} staffMode={adminRole === "staff"} />}
            {tab === "events" && adminRole === "admin" && <EventsAdmin token={token} onExpired={logout} />}
            {tab === "users" && adminRole === "admin" && <UsersAdmin token={token} onExpired={logout} />}
          </>
        )}
      </main>
    </div>
  );
}
