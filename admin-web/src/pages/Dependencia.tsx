import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getToken } from "../api";
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

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Dependencia() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const onUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dependencia_id", String(id));
      const r = await fetch(`${API}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error || `HTTP ${r.status}`);
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value && ((document.getElementById("file-input") as HTMLInputElement).value = "");
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setUploading(false); }
  };

  const onDeleteDoc = async (docId: string) => {
    if (!confirm("¿Borrar documento?")) return;
    await api(`/documents/${docId}`, { method: "DELETE" });
    load();
  };

  if (err && !data) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>Cargando…</div>;

  return (
    <div>
      <Link to="/dependencias" className="text-sm text-slate-500 hover:underline">← Volver</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-4">{data.name}</h1>

      <form onSubmit={onSave} className="bg-white rounded shadow-sm p-4 max-w-md space-y-3 mb-6">
        <h2 className="font-semibold">Editar</h2>
        <div className="text-sm text-slate-500">Slug: /{data.slug}</div>
        <label className="block text-sm">
          <span className="text-slate-600">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Descripción</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex gap-2">
          <button className="bg-slate-900 text-white rounded px-4 py-2">Guardar</button>
          {me?.role === "super_admin" && (
            <button type="button" onClick={onDelete} className="text-red-700 hover:text-red-900 text-sm">Borrar dependencia</button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-3">Documentos ({data.documents.length})</h2>
        <form onSubmit={onUpload} className="flex items-end gap-2 mb-4">
          <input id="file-input" type="file" accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm" />
          <button disabled={!file || uploading}
            className="bg-slate-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {uploading ? "Subiendo…" : "Subir y vectorizar"}
          </button>
        </form>
        <div className="divide-y">
          {data.documents.length === 0 && <div className="text-slate-500 py-2">Sin documentos todavía.</div>}
          {data.documents.map((d) => (
            <div key={d.id} className="py-2 flex justify-between items-center">
              <div>
                <div className="font-medium">{d.filename}</div>
                <div className="text-xs text-slate-500">
                  {(d.size_bytes / 1024).toFixed(1)} KB · {new Date(d.created_at).toLocaleString()} · {d.chunks} chunks
                </div>
                {d.status === "failed" && <div className="text-sm text-red-600 mt-1">{d.error_message}</div>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                <button onClick={() => onDeleteDoc(d.id)} className="text-red-700 hover:text-red-900 text-sm">✕</button>
              </div>
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
