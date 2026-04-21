import Link from "next/link";
import { pool } from "@/lib/db";
import { createDependencia } from "./actions";

export const dynamic = "force-dynamic";

type Dep = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  doc_count: string;
};

async function getDeps(): Promise<Dep[]> {
  const { rows } = await pool.query<Dep>(`
    SELECT d.id, d.slug, d.name, d.description, d.active,
           COALESCE(COUNT(doc.id), 0)::text AS doc_count
    FROM dependencias d
    LEFT JOIN documents doc ON doc.dependencia_id = d.id
    GROUP BY d.id
    ORDER BY d.name
  `);
  return rows;
}

export default async function Page() {
  const deps = await getDeps();
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Dependencias ({deps.length})</h1>

      <form
        action={createDependencia}
        className="bg-white rounded shadow p-4 space-y-3"
      >
        <h2 className="font-semibold">Nueva dependencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            name="name"
            placeholder="Nombre (ej. Secretaría de Hacienda)"
            className="border rounded px-3 py-2"
            required
          />
          <input
            name="description"
            placeholder="Descripción (opcional)"
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
        >
          Crear
        </button>
      </form>

      <div className="bg-white rounded shadow divide-y">
        {deps.length === 0 && (
          <p className="p-6 text-gray-500">Sin dependencias.</p>
        )}
        {deps.map((d) => (
          <Link
            key={d.id}
            href={`/dependencias/${d.id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1 pr-4">
              <p className="font-medium">
                {d.name}
                {!d.active && (
                  <span className="ml-2 text-xs text-gray-500">(inactiva)</span>
                )}
              </p>
              {d.description && (
                <p className="text-sm text-gray-500 truncate">
                  {d.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                slug: <code>{d.slug}</code> · {d.doc_count} documentos
              </p>
            </div>
            <span className="text-blue-600 text-sm">Editar →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
