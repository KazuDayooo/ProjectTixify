const router = require("express").Router();
const { anon } = require("../lib/supabase");
const { HttpError } = require("../lib/http");
const { getRole } = require("../middleware/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || name.length > 80) throw new HttpError(400, "Nama wajib diisi (maksimal 80 karakter)");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Format email tidak valid");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter");

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw new HttpError(400, error.message);

  res.status(201).json({
    message: data.session ? "Akun berhasil dibuat." : "Akun dibuat. Periksa email untuk konfirmasi sebelum masuk.",
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    } : null,
    user: data.user ? {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name || name,
    } : null,
  });
});

router.post("/mobile/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) throw new HttpError(400, "Email dan password wajib diisi");

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new HttpError(401, "Email atau password salah");

  res.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name || data.user.email,
    },
  });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  if (!email || !password) throw new HttpError(400, "Email dan password wajib diisi");

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new HttpError(401, "Email atau password salah");
  const role = getRole(data.user.email, data.user);
  if (role !== "admin" && role !== "staff") throw new HttpError(403, "Akun ini tidak memiliki akses dashboard");

  res.json({ token: data.session.access_token, email: data.user.email, role, user: { id: data.user.id, email: data.user.email, role, name: data.user.user_metadata?.full_name } });
});

module.exports = router;
