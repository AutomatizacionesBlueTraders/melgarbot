export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  pg: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "dB_Melgar",
    user: process.env.PGUSER || "dB_Melgar",
    password: process.env.PGPASSWORD || "",
  },
};
