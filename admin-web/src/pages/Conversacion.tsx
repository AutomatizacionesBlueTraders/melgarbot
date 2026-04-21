import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

type Msg = {
  id: string;
  phone: string;
  contact_name: string | null;
  direction: "in" | "out";
  body: string | null;
  message_type: string;
  created_at: string;
};

export default function Conversacion() {
  const { phone } = useParams<{ phone: string }>();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) return;
    api<Msg[]>(`/conversations/${encodeURIComponent(phone)}`).then(setMsgs).catch((e) => setErr(e.message));
  }, [phone]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!msgs) return <div>Cargando…</div>;

  const name = msgs.find((m) => m.contact_name)?.contact_name;

  return (
    <div>
      <Link to="/conversaciones" className="text-sm text-slate-500 hover:underline">← Volver</Link>
      <h1 className="text-2xl font-semibold mb-1 mt-2">{name || phone}</h1>
      <div className="text-sm text-slate-500 mb-4">{phone}</div>
      <div className="bg-white rounded shadow-sm p-4 space-y-2">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[70%] rounded-lg px-3 py-2 ${m.direction === "in" ? "bg-slate-100" : "bg-green-100"}`}>
              {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
              {!m.body && <div className="italic text-slate-500">[{m.message_type}]</div>}
              <div className="text-xs text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
