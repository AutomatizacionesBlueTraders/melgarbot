import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { authPreHandler, signToken, type UserRole } from "../auth.js";

type LoginBody = { username: string; password: string };

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  dependencia_id: number | null;
};

export default async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/auth/login", async (req, reply) => {
    const { username, password } = req.body || ({} as LoginBody);
    if (!username || !password) {
      return reply.code(400).send({ error: "username y password requeridos" });
    }
    const { rows } = await pool.query<UserRow>(
      "SELECT id, username, password_hash, role, dependencia_id FROM admin_users WHERE username = $1",
      [username],
    );
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return reply.code(401).send({ error: "credenciales inválidas" });
    }
    const token = await signToken({
      uid: u.id,
      u: u.username,
      r: u.role,
      dep: u.dependencia_id,
    });
    return {
      token,
      user: {
        id: u.id,
        username: u.username,
        role: u.role,
        dependencia_id: u.dependencia_id,
      },
    };
  });

  app.get("/auth/me", { preHandler: authPreHandler }, async (req) => {
    const u = req.user!;
    let depSlug: string | null = null;
    if (u.dep) {
      const { rows } = await pool.query<{ slug: string }>(
        "SELECT slug FROM dependencias WHERE id = $1",
        [u.dep],
      );
      depSlug = rows[0]?.slug ?? null;
    }
    return {
      id: u.uid,
      username: u.u,
      role: u.r,
      dependencia_id: u.dep,
      dependencia_slug: depSlug,
    };
  });
}
