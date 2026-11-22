const router = require("express").Router();
const { admin } = require("../lib/supabase");
const { HttpError } = require("../lib/http");
const requireAdmin = require("../middleware/auth");
const { isAdmin, getRole } = require("../middleware/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(["admin", "staff", "user"]);

// Semua route di sini memerlukan hak akses admin
router.use(requireAdmin);

// 1. GET /api/users - List semua user beserta status pembayaran & ringkasan pesanan
router.get("/", async (req, res) => {
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw new HttpError(500, authError.message);

  // Ambil semua data pesanan untuk dikaitkan dengan user berdasarkan email
  const { data: allOrders, error: ordersError } = await admin
    .from("orders")
    .select("id, code, buyer_email, buyer_name, qty, total, status, created_at, events(name, venue, event_date)")
    .order("created_at", { ascending: false });

  if (ordersError) throw new HttpError(500, ordersError.message);

  // Kelompokkan pesanan berdasarkan email (lowercase)
  const ordersByEmail = {};
  (allOrders || []).forEach((o) => {
    const emailKey = String(o.buyer_email || "").trim().toLowerCase();
    if (!emailKey) return;
    if (!ordersByEmail[emailKey]) ordersByEmail[emailKey] = [];
    ordersByEmail[emailKey].push(o);
  });

  let users = (authData?.users || []).map((u) => {
    const emailKey = String(u.email || "").trim().toLowerCase();
    const userOrders = ordersByEmail[emailKey] || [];
    const isUserAdmin = isAdmin(u.email, u);

    const orders_count = userOrders.length;
    const paid_orders_count = userOrders.filter((o) => o.status === "paid").length;
    const pending_orders_count = userOrders.filter((o) => o.status === "pending").length;
    const cancelled_orders_count = userOrders.filter((o) => o.status === "cancelled").length;
    const total_spent = userOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const total_pending = userOrders
      .filter((o) => o.status === "pending")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    let payment_status = "none"; // 'none' | 'paid' | 'unpaid' | 'cancelled'
    if (orders_count > 0) {
      if (pending_orders_count > 0) {
        payment_status = "unpaid";
      } else if (paid_orders_count > 0) {
        payment_status = "paid";
      } else {
        payment_status = "cancelled";
      }
    }

    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split("@")[0],
      role: isUserAdmin ? "admin" : getRole(u.email, u),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      orders_count,
      paid_orders_count,
      pending_orders_count,
      cancelled_orders_count,
      total_spent,
      total_pending,
      payment_status,
    };
  });

  // Filter opsional via query param: ?payment_status=paid|unpaid|none
  if (req.query.payment_status) {
    users = users.filter((u) => u.payment_status === req.query.payment_status);
  }

  res.json(users);
});

// 2. GET /api/users/:id/orders - Detail semua pesanan & transaksi pembayaran milik user tertentu
router.get("/:id/orders", async (req, res) => {
  const { id } = req.params;

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(id);
  if (userError || !userData?.user) {
    throw new HttpError(404, "User tidak ditemukan");
  }

  const user = userData.user;
  const userEmail = String(user.email || "").trim().toLowerCase();

  // Ambil semua pesanan milik user berdasarkan email
  const { data: userOrders, error: ordersError } = await admin
    .from("orders")
    .select("*, events(name, venue, event_date)")
    .ilike("buyer_email", userEmail)
    .order("created_at", { ascending: false });

  if (ordersError) throw new HttpError(500, ordersError.message);

  const orders = userOrders || [];
  const orders_count = orders.length;
  const paid_orders_count = orders.filter((o) => o.status === "paid").length;
  const pending_orders_count = orders.filter((o) => o.status === "pending").length;
  const cancelled_orders_count = orders.filter((o) => o.status === "cancelled").length;
  const total_spent = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const total_pending = orders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  let payment_status = "none";
  if (orders_count > 0) {
    if (pending_orders_count > 0) {
      payment_status = "unpaid";
    } else if (paid_orders_count > 0) {
      payment_status = "paid";
    } else {
      payment_status = "cancelled";
    }
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0],
      role: isAdmin(user.email, user) ? "admin" : getRole(user.email, user),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    summary: {
      orders_count,
      paid_orders_count,
      pending_orders_count,
      cancelled_orders_count,
      total_spent,
      total_pending,
      payment_status,
    },
    orders,
  });
});


// 2. POST /api/users - Tambah user baru
router.post("/", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const name = String(req.body.name || "").trim();
  const role = String(req.body.role || "user");

  if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, "Format email tidak valid");
  if (!password || password.length < 6) throw new HttpError(400, "Password minimal 6 karakter");
  if (!ROLES.has(role)) throw new HttpError(400, "Role harus admin, staff, atau user");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name || email.split("@")[0],
    },
    app_metadata: {
      role,
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      throw new HttpError(400, "Email tersebut sudah terdaftar");
    }
    throw new HttpError(400, error.message);
  }

  const u = data.user;
  res.status(201).json({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || name,
    role,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  });
});

// 3. PUT /api/users/:id - Ubah user
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : undefined;
  const password = req.body.password ? String(req.body.password) : undefined;
  const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
  const role = req.body.role !== undefined ? String(req.body.role) : undefined;

  if (email && !EMAIL_RE.test(email)) throw new HttpError(400, "Format email tidak valid");
  if (password && password.length < 6) throw new HttpError(400, "Password baru minimal 6 karakter");
  if (role !== undefined && !ROLES.has(role)) throw new HttpError(400, "Role harus admin, staff, atau user");
  if (role !== undefined && req.user?.id === id) throw new HttpError(400, "Role akun admin yang sedang digunakan tidak dapat diubah dari sesi ini");

  // Dapatkan info user sebelumnya
  const { data: userPrev, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !userPrev?.user) throw new HttpError(404, "User tidak ditemukan");

  const updatePayload = {};
  if (email && email !== userPrev.user.email) {
    updatePayload.email = email;
    updatePayload.email_confirm = true;
  }
  if (password) {
    updatePayload.password = password;
  }

  const updatedMetadata = {
    ...(userPrev.user.user_metadata || {}),
  };
  if (name !== undefined) updatedMetadata.full_name = name;
  if (role !== undefined) delete updatedMetadata.role;
  updatePayload.user_metadata = updatedMetadata;

  if (role !== undefined) {
    updatePayload.app_metadata = {
      ...(userPrev.user.app_metadata || {}),
      role,
    };
  }

  const { data, error } = await admin.auth.admin.updateUserById(id, updatePayload);
  if (error) throw new HttpError(400, error.message);

  const u = data.user;
  res.json({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.email.split("@")[0],
    role: isAdmin(u.email, u) ? "admin" : getRole(u.email, u),
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  });
});

// 4. DELETE /api/users/:id - Hapus user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (req.user && req.user.id === id) {
    throw new HttpError(400, "Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan");
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new HttpError(400, error.message);

  res.status(204).end();
});

module.exports = router;
