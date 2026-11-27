const router = require("express").Router();
const { randomUUID } = require("crypto");
const { admin, anon } = require("../lib/supabase");
const { HttpError } = require("../lib/http");
const { getRole } = require("../middleware/auth");

const normalizeIdentifier = (value) => String(value || "").trim().toLowerCase();

router.post("/register", async (req, res) => {
  const nickname = String(req.body.nickname || req.body.name || "").trim();
  const phone = normalizeIdentifier(req.body.phone);
  const loginEmail = normalizeIdentifier(req.body.email);
  const password = String(req.body.password || "");

  if (nickname.length < 2 || nickname.length > 40) throw new HttpError(400, "Nickname wajib diisi (2-40 karakter)");
  if (phone.length > 120 || loginEmail.length > 120) throw new HttpError(400, "Email dan nomor telepon maksimal 120 karakter");
  if (!phone && !loginEmail) throw new HttpError(400, "Isi email atau nomor telepon sebagai ID login");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter");

  for (const [field, value, label] of [["email", loginEmail, "Email"], ["phone", phone, "Nomor telepon"]]) {
    if (!value) continue;
    const { data: existingProfile, error: profileError } = await admin
      .from("profiles")
      .select("user_id")
      .eq(field, value)
      .maybeSingle();
    if (profileError) throw new HttpError(500, "Profil pengguna belum siap. Jalankan migrasi profil Supabase terlebih dahulu.");
    if (existingProfile) throw new HttpError(409, `${label} sudah terdaftar`);
  }

  // Supabase Auth needs an email-shaped login. Generate a private, non-deliverable alias;
  // the user signs in with their stored email/phone identifiers instead.
  const authEmail = `user.${randomUUID()}@tixify.invalid`;
  const { error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { nickname, full_name: nickname, phone: phone || null, login_email: loginEmail || null },
  });
  if (error) throw new HttpError(400, error.message);

  const { data: loginData, error: loginError } = await anon.auth.signInWithPassword({ email: authEmail, password });
  if (loginError || !loginData.session || !loginData.user) {
    throw new HttpError(500, "Akun dibuat, tetapi sesi login gagal dibuat. Silakan coba masuk dengan nomor telepon.");
  }

  res.status(201).json({
    message: "Akun berhasil dibuat.",
    session: {
      access_token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
      expires_at: loginData.session.expires_at,
    },
    user: {
      id: loginData.user.id,
      email: loginData.user.user_metadata?.login_email || null,
      name: loginData.user.user_metadata?.nickname || nickname,
      nickname: loginData.user.user_metadata?.nickname || nickname,
      phone: loginData.user.user_metadata?.phone || null,
    },
  });
});

router.post("/mobile/login", async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || "").trim();
  const password = String(req.body.password || "");
  if (!identifier || !password) throw new HttpError(400, "Nomor telepon dan password wajib diisi");

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const { data: emailProfile, error: emailError } = await admin
    .from("profiles")
    .select("auth_email, email, phone, nickname")
    .eq("email", normalizedIdentifier)
    .maybeSingle();
  if (emailError) throw new HttpError(500, "Tidak dapat mencari akun");

  let profile = emailProfile;
  if (!profile) {
    const { data: phoneProfile, error: phoneError } = await admin
      .from("profiles")
      .select("auth_email, email, phone, nickname")
      .eq("phone", normalizedIdentifier)
      .maybeSingle();
    if (phoneError) throw new HttpError(500, "Tidak dapat mencari akun");
    profile = phoneProfile;
  }
  if (!profile?.auth_email) throw new HttpError(401, "Email/nomor telepon atau password salah");

  const { data, error } = await anon.auth.signInWithPassword({ email: profile.auth_email, password });
  if (error || !data.session || !data.user) throw new HttpError(401, "Email/nomor telepon atau password salah");

  res.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: {
      id: data.user.id,
      email: profile.email || null,
      name: profile.nickname || data.user.user_metadata?.nickname || data.user.email,
      nickname: profile.nickname || data.user.user_metadata?.nickname || data.user.email.split("@")[0],
      phone: profile.phone || null,
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
