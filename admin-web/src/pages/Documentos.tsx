import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  dependencia_id: number;
  dependencia_slug: string;
  dependencia_name: string;
  chunks: number;
};

type Dep = { id: number; name: string; slug: string };

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Documentos() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const preselectDep = params.get("dep");
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [depId, setDepId] = useState<string>(preselectDep || "");
  const [filterDep, setFilterDep] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const load = () =>
    Promise.all([api<Doc[]>("/documents"), api<Dep[]>("/dependencias")])
      .then(([d, ds]) => {
        setDocs(d);
        setDeps(ds);
        if (!depId && ds.length === 1) setDepId(String(ds[0].id));
      })
      .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const onUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !depId) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dependencia_id", depId);
      const r = await fetch(`${API}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error || `HTTP ${r.status}`);
      setFile(null);
      const input = document.getElementById("file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      load();
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "error");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Borrar documento?")) return;
    await api(`/documents/${id}`, { method: "DELETE" });
    load();
  };

  if (err && !docs) return <div className="text-red-600">{err}</div>;
  if (!docs) return <div>Cargando…</div>;

  const filtered = filterDep ? docs.filter((d) => String(d.dependencia_id) === filterDep) : docs;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Documentos</h1>

      {/* Subir */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <h2 className="font-semibold mb-3">Subir nuevo documento</h2>
        {deps.length === 0 ? (
          <div className="text-sm text-slate-500">
            Todavía no hay dependencias. <Link to="/dependencias" className="text-melgar-600 hover:underline">Creá una primero</Link>.
          </div>
        ) : (
          <form onSubmit={onUpload} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
            <label className="block text-sm">
              <span className="text-slate-600">Dependencia</span>
              {me?.role === "dependencia_admin" ? (
                <input
                  value={deps.find((d) => String(d.id) === depId)?.name || ""}
                  disabled
                  className="mt-1 w-full border rounded px-3 py-2 bg-slate-50"
                />
              ) : (
                <select
                  value={depId}
                  onChange={(e) => setDepId(e.target.value)}
                  required
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-melgar-500/40"
                >
                  <option value="">— elegir dependencia —</option>
                  {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Archivo (PDF / DOCX / TXT / MD)</span>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="mt-1 w-full text-sm border rounded px-3 py-2"
              />
            </label>
            <button
              disabled={!file || !depId || uploading}
              className="bg-melgar-500 hover:bg-melgar-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? "Procesando…" : "Subir y vectorizar"}
            </button>
            {uploadErr && <div className="sm:col-span-3 text-sm text-red-600">{uploadErr}</div>}
          </form>
        )}
      </div>

      {/* Listado */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Listado ({filtered.length})</h2>
          {me?.role === "super_admin" && deps.length > 1 && (
            <select
              value={filterDep}
              onChange={(e) => setFilterDep(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="">Todas las dependencias</option>
              {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        <div className="divide-y">
          {filtered.length === 0 && <div className="py-3 text-slate-500">Sin documentos.</div>}
          {filtered.map((d) => (
            <div key={d.id} className="py-2 flex justify-between items-center gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{d.filename}</div>
                <div className="text-xs text-slate-500">
                  <Link to={`/dependencias/${d.dependencia_id}`} className="text-melgar-700 hover:underline">
                    {d.dependencia_name}
                  </Link>
                  {" · "}
                  {(d.size_bytes / 1024).toFixed(1)} KB · {new Date(d.created_at).toLocaleString()} · {d.chunks} chunks
                </div>
                {d.status === "failed" && <div className="text-sm text-red-600 mt-1">{d.error_message}</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={d.status} />
                <button
                  onClick={() => onDelete(d.id)}
                  className="text-red-700 hover:text-red-900 text-sm"
                  aria-label="Borrar"
                >
                  ✕
                </button>
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
