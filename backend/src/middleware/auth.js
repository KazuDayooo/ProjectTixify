const { admin } = require("../lib/supabase");
const { HttpError } = require("../lib/http");

const configuredAdmins = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const getRole = (email = "", user = null) => {
  if (email && configuredAdmins().includes(email.toLowerCase())) return "admin";
  const role = user?.app_metadata?.role;
  return role === "admin" || role === "staff" ? role : "user";
};

const isAdmin = (email = "", user = null) => {
  return getRole(email, user) === "admin";
};

const requireRole = (...roles) => async (req, res, next) => {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Belum login");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sesi tidak valid, silakan login ulang");
  const role = getRole(data.user.email, data.user);
  if (!roles.includes(role)) throw new HttpError(403, "Akses tidak diizinkan");
  req.user = data.user;
  req.userRole = role;
  next();
};

const requireAdmin = requireRole("admin");
const requireStaff = requireRole("admin", "staff");

module.exports = requireAdmin;
module.exports.isAdmin = isAdmin;
module.exports.getRole = getRole;
module.exports.requireRole = requireRole;
module.exports.requireStaff = requireStaff;
