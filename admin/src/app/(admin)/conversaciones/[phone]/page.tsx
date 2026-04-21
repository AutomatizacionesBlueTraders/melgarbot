import Link from "next/link";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Msg = {
  id: number;
  direction: "in" | "out";
  body: string | null;
  message_type: string | null;
  contact_name: string | null;
  created_at: string;
};

async function getThread(phone: string): Promise<Msg[]> {
  const { rows } = await pool.query<Msg>(
    `SELECT id, direction, body, message_type, contact_name, created_at
     FROM messages
     WHERE phone = $1
     ORDER BY created_at ASC`,
    [phone],
  );
  return rows;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone } = await params;
  const messages = await getThread(phone);
  const name =
    messages.find((m) => m.contact_name)?.contact_name || phone;

  return (
    <div className="space-y-4">
      <Link
        href="/conversaciones"
        className="text-blue-600 hover:underline text-sm"
      >
        ← Volver
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-gray-500 text-sm">
          {phone} · {messages.length} mensajes
        </p>
      </div>
      <div className="bg-white rounded shadow p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500">Sin mensajes.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[75%] px-3 py-2 rounded-lg ${
                m.direction === "in"
                  ? "bg-gray-100"
                  : "bg-green-100"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">
                {m.body || (
                  <span className="italic text-gray-500">
                    [{m.message_type || "sin contenido"}]
                  </span>
                )}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                {fmt(m.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
