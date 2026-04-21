import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authPreHandler, requireRole } from "../auth.js";

type CreateDep = { slug: string; name: string; description?: string };
type UpdateDep = { slug?: string; name?: string; description?: string; active?: boolean };

export default async function dependenciasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authPreHandler);

  // Listado: super_admin ve todas; dependencia_admin solo la suya
  app.get("/dependencias", async (req) => {
    const u = req.user!;
    if (u.r === "super_admin") {
      const { rows } = await pool.query(
        `SELECT d.id, d.slug, d.name, d.description, d.active,
                COUNT(doc.id)::int AS doc_count
           FROM dependencias d
           LEFT JOIN documents doc ON doc.dependencia_id = d.id
           GROUP BY d.id
           ORDER BY d.name`,
      );
      return rows;
    }
    const { rows } = await pool.query(
      `SELECT d.id, d.slug, d.name, d.description, d.active,
              COUNT(doc.id)::int AS doc_count
         FROM dependencias d
         LEFT JOIN documents doc ON doc.dependencia_id = d.id
         WHERE d.id = $1
         GROUP BY d.id`,
      [u.dep],
    );
    return rows;
  });

  // Detalle + documentos
  app.get<{ Params: { id: string } }>("/dependencias/:id", async (req, reply) => {
    const u = req.user!;
    const id = Number(req.params.id);
    if (u.r === "dependencia_admin" && u.dep !== id) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const { rows } = await pool.query(
      "SELECT id, slug, name, description, active FROM dependencias WHERE id = $1",
      [id],
    );
    if (!rows[0]) return reply.code(404).send({ error: "no existe" });
    const docs = await pool.query(
      `SELECT id, filename, mime_type, size_bytes, status, error_message, created_at, processed_at,
              (SELECT COUNT(*)::int FROM chunks c WHERE c.document_id = documents.id) AS chunks
         FROM documents WHERE dependencia_id = $1 ORDER BY id DESC`,
      [id],
    );
    return { ...rows[0], documents: docs.rows };
  });

  // Crear (solo super_admin)
  app.post<{ Body: CreateDep }>(
    "/dependencias",
    { preHandler: requireRole("super_admin") },
    async (req, reply) => {
      const { slug, name, description } = req.body || ({} as CreateDep);
      if (!slug || !name) return reply.code(400).send({ error: "slug y name requeridos" });
      try {
        const { rows } = await pool.query(
          `INSERT INTO dependencias (slug, name, description) VALUES ($1, $2, $3)
           RETURNING id, slug, name, description, active`,
          [slug, name, description || null],
        );
        return reply.code(201).send(rows[0]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        if (msg.includes("duplicate key")) return reply.code(409).send({ error: "slug ya existe" });
        return reply.code(500).send({ error: msg });
      }
    },
  );

  // Update: super_admin cualquiera; dependencia_admin solo la suya
  app.patch<{ Params: { id: string }; Body: UpdateDep }>(
    "/dependencias/:id",
    async (req, reply) => {
      const u = req.user!;
      const id = Number(req.params.id);
      if (u.r === "dependencia_admin" && u.dep !== id) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const { slug, name, description, active } = req.body || {};
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, v: unknown) => {
        sets.push(`${col} = $${sets.length + 1}`);
        vals.push(v);
      };
      if (slug !== undefined) push("slug", slug);
      if (name !== undefined) push("name", name);
      if (description !== undefined) push("description", description);
      if (active !== undefined && u.r === "super_admin") push("active", active);
      if (sets.length === 0) return reply.code(400).send({ error: "nada para actualizar" });
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE dependencias SET ${sets.join(", ")} WHERE id = $${vals.length}
         RETURNING id, slug, name, description, active`,
        vals,
      );
      if (!rows[0]) return reply.code(404).send({ error: "no existe" });
      return rows[0];
    },
  );

  // Borrar (solo super_admin)
  app.delete<{ Params: { id: string } }>(
    "/dependencias/:id",
    { preHandler: requireRole("super_admin") },
    async (req, reply) => {
      const id = Number(req.params.id);
      const { rowCount } = await pool.query("DELETE FROM dependencias WHERE id = $1", [id]);
      if (!rowCount) return reply.code(404).send({ error: "no existe" });
      return { ok: true };
    },
  );
}
