const { createClient } = require("@supabase/supabase-js");
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// service_role: melewati RLS, hanya dipakai di server
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
// anon: khusus untuk proses login
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, opts);

module.exports = { admin, anon };
