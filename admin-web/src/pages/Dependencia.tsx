import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

type Doc = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  status: "pending" | "processing" | "done" | "failed";
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  chunks: number;
};

type Detail = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  documents: Doc[];
};

export default function Dependencia() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () =>
    api<Detail>(`/dependencias/${id}`).then((d) => {
      setData(d);
      setName(d.name);
      setDescription(d.description || "");
    }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api(`/dependencias/${id}`, { method: "PATCH", body: { name, description } });
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };

  const onDelete = async () => {
    if (!confirm("¿Borrar dependencia y todos sus documentos?")) return;
    await api(`/dependencias/${id}`, { method: "DELETE" });
    nav("/dependencias");
  };

  if (err && !data) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>Cargando…</div>;

  return (
    <div>
      <Link to="/dependencias" className="text-sm text-slate-500 hover:underline">← Volver</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-4">{data.name}</h1>

      <form onSubmit={onSave} className="bg-white rounded-lg shadow-sm p-5 max-w-md space-y-3 mb-6">
        <h2 className="font-semibold">Editar</h2>
        <div className="text-sm text-slate-500">Slug: /{data.slug}</div>
        <label className="block text-sm">
          <span className="text-slate-600">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-melgar-500/40" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Descripción</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-melgar-500/40" />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex gap-3 items-center">
          <button className="bg-melgar-500 hover:bg-melgar-600 text-white rounded px-4 py-2 font-medium">Guardar</button>
          {me?.role === "super_admin" && (
            <button type="button" onClick={onDelete} className="text-red-700 hover:text-red-900 text-sm">
              Borrar dependencia
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Documentos ({data.documents.length})</h2>
          <Link
            to={`/documentos?dep=${data.id}`}
            className="text-sm bg-melgar-500 hover:bg-melgar-600 text-white rounded px-3 py-1.5"
          >
            Subir documento
          </Link>
        </div>
        <div className="divide-y">
          {data.documents.length === 0 && (
            <div className="text-slate-500 py-3">Sin documentos todavía.</div>
          )}
          {data.documents.map((d) => (
            <div key={d.id} className="py-2 flex justify-between items-center">
              <div>
                <div className="font-medium">{d.filename}</div>
                <div className="text-xs text-slate-500">
                  {(d.size_bytes / 1024).toFixed(1)} KB · {new Date(d.created_at).toLocaleString()} · {d.chunks} chunks
                </div>
                {d.status === "failed" && <div className="text-sm text-red-600 mt-1">{d.error_message}</div>}
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Doc["status"] }) {
  const cls: Record<Doc["status"], string> = {
    pending: "bg-slate-200 text-slate-700",
    processing: "bg-yellow-100 text-yellow-800",
    done: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return <span className={`text-xs px-2 py-1 rounded ${cls[status]}`}>{status}</span>;
}
