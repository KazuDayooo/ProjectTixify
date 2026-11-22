const router = require("express").Router();
const { admin } = require("../lib/supabase");
const { HttpError, must } = require("../lib/http");
const requireAdmin = require("../middleware/auth");

function parseEvent(b) {
  const e = {
    name: String(b.name || "").trim(),
    venue: String(b.venue || "").trim(),
    description: String(b.description || "").trim(),
    event_date: new Date(b.event_date),
    price: Number(b.price),
    stock: Number(b.stock),
  };
  if (!e.name) throw new HttpError(400, "Nama event wajib diisi");
  if (isNaN(e.event_date)) throw new HttpError(400, "Tanggal event tidak valid");
  if (!Number.isInteger(e.price) || e.price < 0) throw new HttpError(400, "Harga harus bilangan bulat >= 0");
  if (!Number.isInteger(e.stock) || e.stock < 0) throw new HttpError(400, "Stok harus bilangan bulat >= 0");
  e.event_date = e.event_date.toISOString();
  return e;
}

// ----- Publik -----
router.get("/", async (req, res) => {
  res.json(must(await admin.from("events").select("*").order("event_date")));
});

router.get("/:id", async (req, res) => {
  const data = must(await admin.from("events").select("*").eq("id", req.params.id).maybeSingle());
  if (!data) throw new HttpError(404, "Event tidak ditemukan");
  res.json(data);
});

// ----- Admin -----
router.post("/", requireAdmin, async (req, res) => {
  const data = must(await admin.from("events").insert(parseEvent(req.body)).select().single());
  res.status(201).json(data);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const data = must(await admin.from("events").update(parseEvent(req.body)).eq("id", req.params.id).select().maybeSingle());
  if (!data) throw new HttpError(404, "Event tidak ditemukan");
  res.json(data);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  must(await admin.from("events").delete().eq("id", req.params.id));
  res.status(204).end();
});

module.exports = router;
