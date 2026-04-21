import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { pool } from "@/lib/db";
import { extractText } from "@/lib/extract";
import { chunkText } from "@/lib/chunk";
import { embedBatch, toPgVector } from "@/lib/embed";

export const runtime = "nodejs";
export const maxDuration = 120;

const STORAGE_DIR =
  process.env.STORAGE_DIR ||
  path.join(process.cwd(), "storage", "documents");

export async function POST(req: Request) {
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  const form = await req.formData();
  const file = form.get("file");
  const depIdRaw = form.get("dependencia_id");
  const depId = Number(depIdRaw);

  if (!(file instanceof File) || !depId) {
    return NextResponse.json(
      { error: "Faltan campos (file, dependencia_id)" },
      { status: 400 },
    );
  }

  const depRow = await pool.query(
    `SELECT id, slug FROM dependencias WHERE id = $1`,
    [depId],
  );
  if (!depRow.rowCount) {
    return NextResponse.json(
      { error: "Dependencia inexistente" },
      { status: 404 },
    );
  }
  const depSlug = depRow.rows[0].slug as string;

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buf).digest("hex");
  const ext = path.extname(file.name) || "";
  const storedName = `${hash}${ext}`;
  const storagePath = path.join(STORAGE_DIR, storedName);
  await fs.writeFile(storagePath, buf);

  const ins = await pool.query(
    `INSERT INTO documents
       (dependencia_id, filename, file_path, mime_type, size_bytes, content_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing')
     RETURNING id`,
    [depId, file.name, storagePath, file.type || null, buf.length, hash],
  );
  const docId = ins.rows[0].id as number;

  try {
    const text = await extractText(buf, file.name, file.type || undefined);
    if (!text.trim()) throw new Error("El documento no contiene texto extraíble");

    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("No se pudieron generar chunks");

    const embeddings = await embedBatch(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await pool.query(
        `INSERT INTO chunks
           (document_id, chunk_index, content, tokens, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
        [
          docId,
          i,
          chunks[i],
          Math.round(chunks[i].length / 4),
          toPgVector(embeddings[i]),
          JSON.stringify({
            dependencia_slug: depSlug,
            document_filename: file.name,
            chunk_total: chunks.length,
          }),
        ],
      );
    }

    await pool.query(
      `UPDATE documents SET status = 'done', processed_at = NOW() WHERE id = $1`,
      [docId],
    );

    return NextResponse.json({
      ok: true,
      id: docId,
      chunks: chunks.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await pool.query(
      `UPDATE documents SET status = 'failed', error_message = $2 WHERE id = $1`,
      [docId, msg.slice(0, 1000)],
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
