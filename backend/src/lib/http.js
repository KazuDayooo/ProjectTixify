class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Ambil data dari hasil Supabase, lempar HttpError kalau gagal
function must({ data, error }, status = 400) {
  if (error) throw new HttpError(status, error.message);
  return data;
}

module.exports = { HttpError, must };
