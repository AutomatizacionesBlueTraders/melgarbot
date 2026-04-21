import Link from "next/link";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Conv = {
  phone: string;
  contact_name: string | null;
  last_at: string | null;
  msg_count: string;
  last_body: string | null;
  last_direction: "in" | "out" | null;
};

async function getConversations(): Promise<Conv[]> {
  const { rows } = await pool.query<Conv>(`
    WITH last AS (
      SELECT DISTINCT ON (phone)
             phone, body, direction, created_at
      FROM messages
      ORDER BY phone, created_at DESC
    )
    SELECT m.phone,
           MAX(m.contact_name) FILTER (WHERE m.contact_name IS NOT NULL) AS contact_name,
           MAX(m.created_at) AS last_at,
           COUNT(*)::text AS msg_count,
           l.body AS last_body,
           l.direction AS last_direction
    FROM messages m
    JOIN last l ON l.phone = m.phone
    GROUP BY m.phone, l.body, l.direction
    ORDER BY last_at DESC NULLS LAST;
  `);
  return rows;
}

function fmt(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function Page() {
  const convs = await getConversations();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Conversaciones ({convs.length})</h1>
      <div className="bg-white rounded shadow divide-y">
        {convs.length === 0 && (
          <p className="p-6 text-gray-500">Sin conversaciones aún.</p>
        )}
        {convs.map((c) => (
          <Link
            key={c.phone}
            href={`/conversaciones/${c.phone}`}
            className="flex items-start justify-between p-4 hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1 pr-4">
              <p className="font-medium truncate">
                {c.contact_name || c.phone}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {c.last_direction === "out" ? "→ " : ""}
                {c.last_body || <span className="italic">(sin contenido)</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {c.phone} · {c.msg_count} mensajes
              </p>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              {fmt(c.last_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
