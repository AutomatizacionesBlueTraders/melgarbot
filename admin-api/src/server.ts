import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import dependenciasRoutes from "./routes/dependencias.js";
import documentsRoutes from "./routes/documents.js";
import conversationsRoutes from "./routes/conversations.js";

const app = Fastify({ logger: true, bodyLimit: 50 * 1024 * 1024 });

await app.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
});

await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.get("/health", async () => ({ ok: true }));

await app.register(authRoutes);
await app.register(usersRoutes);
await app.register(dependenciasRoutes);
await app.register(documentsRoutes);
await app.register(conversationsRoutes);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
