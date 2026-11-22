"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const KEY = "admin_token";
const EMAIL_KEY = "admin_email";
const ROLE_KEY = "admin_role";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) router.replace("/admin");
    else setReady(true);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.login(email.trim(), password);
      sessionStorage.setItem(KEY, response.token);
      sessionStorage.setItem(EMAIL_KEY, response.email || email.trim());
      sessionStorage.setItem(ROLE_KEY, response.role);
      router.replace("/admin");
    } catch (requestError) {
      setError((requestError as Error).message || "Gagal masuk. Periksa kembali email dan password.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="web-auth">
      <nav className="web-auth-nav" aria-label="Navigasi login admin">
        <Link href="/" className="web-auth-brand"><span aria-hidden="true">T</span>Tixify</Link>
        <Link href="/" className="web-auth-back">Kembali ke beranda</Link>
      </nav>

      <div className="web-auth-shell">
        <section className="web-auth-card" aria-labelledby="admin-login-title">
          <div className="web-auth-mark" aria-hidden="true">🎟️</div>
          <p className="web-auth-eyebrow">PORTAL ADMINISTRATOR</p>
          <h1 id="admin-login-title">Masuk ke Tixify</h1>
          <p className="web-auth-description">Akses khusus admin dan staff untuk mengelola operasional Tixify.</p>

          <form className="web-auth-form" onSubmit={submit}>
            <label htmlFor="admin-email">
              Email admin / staff
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@email.com"
                required
                autoComplete="username"
              />
            </label>

            <label htmlFor="admin-password">
              Password
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
              />
            </label>

            {error && <p className="web-auth-feedback is-error" role="alert">{error}</p>}

            <button type="submit" disabled={busy}>
              {busy ? "Memeriksa kredensial…" : "Masuk ke panel admin"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="web-auth-admin">Akses terbatas untuk akun admin dan staff Tixify.</p>
        </section>
      </div>
    </main>
  );
}
