import type { FastifyInstance } from "fastify";
import { createHash } from "crypto";
import { pool } from "../db.js";
import { authPreHandler } from "../auth.js";
import { extractText } from "../lib/extract.js";
import { chunkText } from "../lib/chunk.js";
import { embedBatch, toPgVector } from "../lib/embed.js";

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authPreHandler);

  // Listado: super_admin ve todos; dependencia_admin solo los suyos
  app.get("/documents", async (req) => {
    const u = req.user!;
    const params: unknown[] = [];
    const where: string[] = [];
    if (u.r === "dependencia_admin") {
      where.push(`d.dependencia_id = $${params.length + 1}`);
      params.push(u.dep);
    }
    const sql = `
      SELECT d.id, d.filename, d.mime_type, d.size_bytes, d.status, d.error_message,
             d.created_at, d.processed_at,
             d.dependencia_id, dep.slug AS dependencia_slug, dep.name AS dependencia_name,
             (SELECT COUNT(*)::int FROM chunks c WHERE c.document_id = d.id) AS chunks
        FROM documents d
        JOIN dependencias dep ON dep.id = d.dependencia_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY d.id DESC
      LIMIT 500`;
    const { rows } = await pool.query(sql, params);
    return rows;
  });

  // POST /documents/upload  — multipart/form-data: file + dependencia_id
  app.post("/documents/upload", async (req, reply) => {
    const u = req.user!;
    const parts = req.parts();
    let depId: number | null = null;
    let fileBuf: Buffer | null = null;
    let filename = "";
    let mime: string | undefined = undefined;

    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "dependencia_id") {
        depId = Number(part.value);
      } else if (part.type === "file" && part.fieldname === "file") {
        filename = part.filename;
        mime = part.mimetype;
        fileBuf = await part.toBuffer();
      }
    }

    if (!fileBuf || !depId) {
      return reply.code(400).send({ error: "file y dependencia_id requeridos" });
    }

    // Autorización: dependencia_admin solo puede subir a su dependencia
    if (u.r === "dependencia_admin" && u.dep !== depId) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const dep = await pool.query<{ id: number; slug: string }>(
      "SELECT id, slug FROM dependencias WHERE id = $1",
      [depId],
    );
    if (!dep.rowCount) return reply.code(404).send({ error: "dependencia no existe" });
    const depSlug = dep.rows[0].slug;

    const hash = createHash("sha256").update(fileBuf).digest("hex");

    const ins = await pool.query(
      `INSERT INTO documents
         (dependencia_id, filename, file_path, mime_type, size_bytes, content_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')
       RETURNING id`,
      [depId, filename, "", mime || null, fileBuf.length, hash],
    );
    const docId = ins.rows[0].id as number;

    try {
      const text = await extractText(fileBuf, filename, mime);
      if (!text.trim()) throw new Error("el documento no contiene texto extraíble");
      const chunks = chunkText(text);
      if (chunks.length === 0) throw new Error("no se pudieron generar chunks");
      const embeddings = await embedBatch(chunks);

      for (let i = 0; i < chunks.length; i++) {
        await pool.query(
          `INSERT INTO chunks (document_id, chunk_index, content, tokens, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
          [
            docId,
            i,
            chunks[i],
            Math.round(chunks[i].length / 4),
            toPgVector(embeddings[i]),
            JSON.stringify({
              dependencia_slug: depSlug,
              document_filename: filename,
              chunk_total: chunks.length,
            }),
          ],
        );
      }

      await pool.query(
        "UPDATE documents SET status = 'done', processed_at = NOW() WHERE id = $1",
        [docId],
      );
      return { ok: true, id: docId, chunks: chunks.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await pool.query(
        "UPDATE documents SET status = 'failed', error_message = $2 WHERE id = $1",
        [docId, msg.slice(0, 1000)],
      );
      return reply.code(500).send({ ok: false, error: msg });
    }
  });

  app.delete<{ Params: { id: string } }>("/documents/:id", async (req, reply) => {
    const u = req.user!;
    const id = Number(req.params.id);
    const { rows } = await pool.query<{ dependencia_id: number }>(
      "SELECT dependencia_id FROM documents WHERE id = $1",
      [id],
    );
    if (!rows[0]) return reply.code(404).send({ error: "no existe" });
    if (u.r === "dependencia_admin" && u.dep !== rows[0].dependencia_id) {
      return reply.code(403).send({ error: "forbidden" });
    }
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    return { ok: true };
  });
}
