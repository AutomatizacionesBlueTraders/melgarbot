import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Row = {
  phone: string;
  contact_name: string | null;
  message_count: number;
  last_message_at: string;
  last_body: string | null;
};

export default function Conversaciones() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Row[]>("/conversations").then(setRows).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!rows) return <div>Cargando…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Conversaciones</h1>
      <div className="bg-white rounded shadow-sm divide-y">
        {rows.length === 0 && <div className="p-4 text-slate-500">Sin conversaciones todavía.</div>}
        {rows.map((r) => (
          <Link key={r.phone} to={`/conversaciones/${encodeURIComponent(r.phone)}`}
            className="block p-4 hover:bg-slate-50">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="font-medium">{r.contact_name || r.phone}</div>
                <div className="text-sm text-slate-500">{r.phone}</div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(r.last_message_at).toLocaleString()} · {r.message_count} msg
              </div>
            </div>
            {r.last_body && <div className="text-sm text-slate-600 mt-1 truncate">{r.last_body}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
