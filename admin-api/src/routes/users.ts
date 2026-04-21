import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { authPreHandler, requireRole, type UserRole } from "../auth.js";

type CreateUserBody = {
  username: string;
  password: string;
  role: UserRole;
  dependencia_id?: number | null;
};

type UpdateUserBody = {
  password?: string;
  role?: UserRole;
  dependencia_id?: number | null;
};

export default async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authPreHandler);
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/users", async () => {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.role, u.dependencia_id,
              d.slug AS dependencia_slug, d.name AS dependencia_name,
              u.created_at
         FROM admin_users u
         LEFT JOIN dependencias d ON d.id = u.dependencia_id
         ORDER BY u.id`,
    );
    return rows;
  });

  app.post<{ Body: CreateUserBody }>("/users", async (req, reply) => {
    const { username, password, role, dependencia_id } = req.body || ({} as CreateUserBody);
    if (!username || !password || !role) {
      return reply.code(400).send({ error: "username, password, role requeridos" });
    }
    if (role === "dependencia_admin" && !dependencia_id) {
      return reply.code(400).send({ error: "dependencia_id es requerido para dependencia_admin" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO admin_users (username, password_hash, role, dependencia_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, role, dependencia_id`,
        [username, hash, role, role === "super_admin" ? null : dependencia_id],
      );
      return reply.code(201).send(rows[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (msg.includes("duplicate key")) {
        return reply.code(409).send({ error: "username ya existe" });
      }
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    "/users/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const { password, role, dependencia_id } = req.body || {};
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (password) {
        sets.push(`password_hash = $${sets.length + 1}`);
        vals.push(await bcrypt.hash(password, 10));
      }
      if (role) {
        sets.push(`role = $${sets.length + 1}`);
        vals.push(role);
      }
      if (dependencia_id !== undefined) {
        sets.push(`dependencia_id = $${sets.length + 1}`);
        vals.push(dependencia_id);
      }
      if (sets.length === 0) return reply.code(400).send({ error: "nada para actualizar" });
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE admin_users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length} RETURNING id, username, role, dependencia_id`,
        vals,
      );
      if (!rows[0]) return reply.code(404).send({ error: "usuario no existe" });
      return rows[0];
    },
  );

  app.delete<{ Params: { id: string } }>("/users/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (id === req.user!.uid) {
      return reply.code(400).send({ error: "no podés borrar tu propio usuario" });
    }
    const { rowCount } = await pool.query("DELETE FROM admin_users WHERE id = $1", [id]);
    if (!rowCount) return reply.code(404).send({ error: "usuario no existe" });
    return { ok: true };
  });
}
