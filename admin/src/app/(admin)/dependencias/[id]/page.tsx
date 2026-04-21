import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import {
  updateDependencia,
  deleteDependencia,
  deleteDocument,
} from "../actions";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

type Dep = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
};

type Doc = {
  id: number;
  filename: string;
  status: string;
  size_bytes: number | null;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
};

async function getDep(id: number): Promise<Dep | null> {
  const { rows } = await pool.query<Dep>(
    `SELECT id, slug, name, description, active FROM dependencias WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function getDocs(id: number): Promise<Doc[]> {
  const { rows } = await pool.query<Doc>(
    `SELECT id, filename, status, size_bytes, created_at, processed_at, error_message
     FROM documents WHERE dependencia_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  return rows;
}

function fmtSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) notFound();
  const dep = await getDep(id);
  if (!dep) notFound();
  const docs = await getDocs(id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/dependencias"
        className="text-blue-600 hover:underline text-sm"
      >
        ← Volver
      </Link>

      <h1 className="text-2xl font-bold">{dep.name}</h1>

      <form
        action={updateDependencia}
        className="bg-white rounded shadow p-4 space-y-3"
      >
        <input type="hidden" name="id" value={dep.id} />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nombre</label>
          <input
            name="name"
            defaultValue={dep.name}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Descripción
          </label>
          <textarea
            name="description"
            defaultValue={dep.description || ""}
            rows={3}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={dep.active}
          />
          Activa
        </label>
        <p className="text-xs text-gray-400">
          slug: <code>{dep.slug}</code>
        </p>
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </form>

      <section className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="font-semibold">Documentos ({docs.length})</h2>
        <UploadForm depId={dep.id} />
        <div className="divide-y border-t pt-2">
          {docs.length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              Esta dependencia aún no tiene documentos cargados.
            </p>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between py-2 text-sm gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{d.filename}</p>
                <p className="text-xs text-gray-500">
                  {fmtSize(d.size_bytes)} ·{" "}
                  {new Date(d.created_at).toLocaleString("es-CO")}
                </p>
                {d.error_message && (
                  <p className="text-xs text-red-600 mt-1 break-words">
                    {d.error_message}
                  </p>
                )}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  STATUS_BADGES[d.status] || "bg-gray-100"
                }`}
              >
                {d.status}
              </span>
              <form action={deleteDocument}>
                <input type="hidden" name="doc_id" value={d.id} />
                <input type="hidden" name="dep_id" value={dep.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:text-red-800"
                  title="Eliminar documento"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <form
        action={deleteDependencia}
        className="bg-red-50 rounded p-4 border border-red-200"
      >
        <input type="hidden" name="id" value={dep.id} />
        <p className="text-sm text-red-800 mb-2">
          Eliminar la dependencia borra también todos sus documentos y chunks
          asociados.
        </p>
        <button
          type="submit"
          className="bg-red-600 text-white rounded px-4 py-2 hover:bg-red-700 text-sm"
        >
          Eliminar dependencia
        </button>
      </form>
    </div>
  );
}
