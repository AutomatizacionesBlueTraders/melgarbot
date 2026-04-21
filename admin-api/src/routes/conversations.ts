import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authPreHandler, requireRole } from "../auth.js";

export default async function conversationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authPreHandler);
  app.addHook("preHandler", requireRole("super_admin"));

  // Listado de hilos (un hilo por número)
  app.get("/conversations", async () => {
    const { rows } = await pool.query(
      `SELECT phone,
              MAX(contact_name) FILTER (WHERE contact_name IS NOT NULL) AS contact_name,
              COUNT(*)::int AS message_count,
              MAX(created_at) AS last_message_at,
              (ARRAY_AGG(body ORDER BY created_at DESC) FILTER (WHERE body IS NOT NULL))[1] AS last_body
         FROM messages
         WHERE phone IS NOT NULL
         GROUP BY phone
         ORDER BY last_message_at DESC
         LIMIT 200`,
    );
    return rows;
  });

  // Thread de un teléfono
  app.get<{ Params: { phone: string } }>("/conversations/:phone", async (req) => {
    const { phone } = req.params;
    const { rows } = await pool.query(
      `SELECT id, phone, contact_name, direction, body, message_type, created_at, metadata
         FROM messages WHERE phone = $1 ORDER BY created_at ASC LIMIT 1000`,
      [phone],
    );
    return rows;
  });
}
