require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:8081,http://127.0.0.1:8081")
  .split(",")
  .map((s) => s.trim());

function isLocalDevelopmentOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" ||
      /^10(?:\.\d{1,3}){3}$/.test(hostname) ||
      /^192\.168(?:\.\d{1,3}){2}$/.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(hostname);
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));
app.use(express.json({ limit: "50kb" }));

app.get("/api", (req, res) => res.json({
  ok: true,
  service: "Tixify API",
  endpoints: ["/api/health", "/api/events", "/api/orders"],
}));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));

app.use((req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan" }));
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Kesalahan server" : err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, "0.0.0.0", () => console.log(`API berjalan di port ${port} (menerima koneksi jaringan lokal)`));
