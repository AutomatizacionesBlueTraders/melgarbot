import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

type Dep = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  doc_count: number;
};

export default function Dependencias() {
  const { me } = useAuth();
  const [items, setItems] = useState<Dep[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () => api<Dep[]>("/dependencias").then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api("/dependencias", { method: "POST", body: { slug, name, description } });
      setSlug(""); setName(""); setDescription("");
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };

  if (err && !items) return <div className="text-red-600">{err}</div>;
  if (!items) return <div>Cargando…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dependencias</h1>
      <div className="bg-white rounded shadow-sm divide-y mb-6">
        {items.length === 0 && <div className="p-4 text-slate-500">No hay dependencias todavía.</div>}
        {items.map((d) => (
          <Link key={d.id} to={`/dependencias/${d.id}`} className="block p-4 hover:bg-slate-50">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-slate-500">/{d.slug}</div>
              </div>
              <div className="text-xs text-slate-500">{d.doc_count} docs {d.active ? "" : "· inactiva"}</div>
            </div>
            {d.description && <div className="text-sm text-slate-600 mt-1">{d.description}</div>}
          </Link>
        ))}
      </div>

      {me?.role === "super_admin" && (
        <form onSubmit={onCreate} className="bg-white rounded shadow-sm p-4 max-w-md space-y-3">
          <h2 className="font-semibold">Crear dependencia</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Slug (id legible)</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required
              className="mt-1 w-full border rounded px-3 py-2" placeholder="hacienda" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="mt-1 w-full border rounded px-3 py-2" placeholder="Secretaría de Hacienda" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Descripción (opcional)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="bg-slate-900 text-white rounded px-4 py-2">Crear</button>
        </form>
      )}
    </div>
  );
}
