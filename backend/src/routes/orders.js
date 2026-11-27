const router = require("express").Router();
const { admin } = require("../lib/supabase");
const { HttpError, must } = require("../lib/http");
const requireAdmin = require("../middleware/auth");
const { requireRole, requireStaff } = require("../middleware/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----- Publik -----
router.post("/", requireRole("user", "admin", "staff"), async (req, res) => {
  const { event_id } = req.body;
  const buyer_name = String(req.body.buyer_name || "").trim();
  const buyer_email = String(req.body.buyer_email || "").trim();
  const qty = Number(req.body.qty);

  if (!event_id) throw new HttpError(400, "Event wajib dipilih");
  if (!buyer_name || buyer_name.length > 80) throw new HttpError(400, "Nama wajib diisi (maks 80 karakter)");
  if (!EMAIL_RE.test(buyer_email)) throw new HttpError(400, "Format email tidak valid");
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new HttpError(400, "Jumlah tiket harus 1-10");

  const data = must(await admin.rpc("create_order", {
    p_event: event_id,
    p_name: buyer_name,
    p_email: buyer_email,
    p_qty: qty,
    p_user: req.user.id,
  }));
  res.status(201).json(data);
});

router.get("/mine", requireRole("user", "admin", "staff"), async (req, res) => {
  const { data, error } = await admin
    .from("orders")
    .select("id, code, event_id, buyer_name, buyer_email, qty, total, status, created_at, events(name, venue, event_date), tickets(code, status, used_at)")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, error.message);
  res.json((data || []).map((order) => ({
    ...order,
    event_name: order.events?.name || "Event",
    venue: order.events?.venue || "",
    event_date: order.events?.event_date,
  })));
});

router.get("/lookup/:code", requireRole("user", "admin", "staff"), async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const { data, error } = await admin
    .from("orders")
    .select("id, code, user_id, buyer_name, buyer_email, qty, total, status, created_at, events(name, venue, event_date)")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) throw new HttpError(404, "Kode pesanan tidak ditemukan");
  if (data.user_id !== req.user.id) throw new HttpError(404, "Kode pesanan tidak ditemukan");
  const tickets = must(await admin
    .from("tickets")
    .select("code, status, used_at")
    .eq("order_id", data.id)
    .order("created_at", { ascending: true }));
  res.json({
    id: data.id,
    code: data.code,
    event_name: data.events?.name || "Event",
    venue: data.events?.venue || "",
    event_date: data.events?.event_date,
    buyer_name: data.buyer_name,
    buyer_email: data.buyer_email,
    qty: data.qty,
    total: data.total,
    status: data.status,
    created_at: data.created_at,
    tickets,
  });
});

// Pembayaran dummy bergaya Midtrans untuk pengembangan; tiket dibuat hanya setelah konfirmasi ini.
router.post("/:code/pay", requireRole("user", "admin", "staff"), async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const updated = must(await admin.rpc("complete_mock_payment", {
    p_code: code,
    p_user: req.user.id,
  }));
  const { data: order, error } = await admin
    .from("orders")
    .select("*, events(name, venue, event_date), tickets(code, status, used_at)")
    .eq("id", updated.id)
    .single();
  if (error || !order) throw new HttpError(500, error?.message || "Pesanan tidak dapat dimuat");
  res.json({
    message: "Pembayaran simulasi Midtrans berhasil.",
    order,
  });
});

// ----- Admin -----
router.get("/ticket/:code", requireStaff, async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const data = { ...must(await admin.rpc("get_ticket", { p_code: code })) };
  if (req.userRole === "staff") delete data.buyer_email;
  res.json(data);
});

router.post("/check-in", requireStaff, async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(code)) throw new HttpError(400, "Kode tiket harus 12 karakter");
  const data = must(await admin.rpc("check_in_ticket", { p_code: code }));
  res.json(data);
});

router.get("/", requireStaff, async (req, res) => {
  const fields = req.userRole === "admin"
    ? "*, events(name)"
    : "id, code, event_id, buyer_name, qty, total, status, approval_status, accepted_at, created_at, events(name)";
  res.json(must(await admin.from("orders").select(fields).order("created_at", { ascending: false })));
});

router.post("/:id/accept", requireStaff, async (req, res) => {
  const data = must(await admin.rpc("accept_order", {
    p_id: req.params.id,
    p_staff_id: req.user.id,
  }));
  res.json(data);
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  const data = must(await admin.rpc("set_order_status", { p_id: req.params.id, p_status: req.body.status }));
  res.json(data);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  must(await admin.rpc("delete_order", { p_id: req.params.id }));
  res.status(204).end();
});

module.exports = router;
