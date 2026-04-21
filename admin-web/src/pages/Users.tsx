import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";

type User = {
  id: number;
  username: string;
  role: "super_admin" | "dependencia_admin";
  dependencia_id: number | null;
  dependencia_slug: string | null;
  dependencia_name: string | null;
  created_at: string;
};

type Dep = { id: number; name: string; slug: string };

export default function Users() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"super_admin" | "dependencia_admin">("dependencia_admin");
  const [depId, setDepId] = useState<number | null>(null);

  const load = () =>
    Promise.all([api<User[]>("/users"), api<Dep[]>("/dependencias")])
      .then(([u, d]) => { setUsers(u); setDeps(d); })
      .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api("/users", {
        method: "POST",
        body: { username, password, role, dependencia_id: role === "dependencia_admin" ? depId : null },
      });
      setUsername(""); setPassword(""); setDepId(null);
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Borrar usuario?")) return;
    await api(`/users/${id}`, { method: "DELETE" });
    load();
  };

  if (!users) return <div>Cargando…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Usuarios</h1>
      <div className="bg-white rounded shadow-sm divide-y mb-6">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{u.username}</div>
              <div className="text-sm text-slate-500">
                {u.role === "super_admin" ? "Super admin" : `Admin de ${u.dependencia_name || u.dependencia_slug}`}
              </div>
            </div>
            <button onClick={() => onDelete(u.id)} className="text-red-700 hover:text-red-900 text-sm">Borrar</button>
          </div>
        ))}
      </div>

      <form onSubmit={onCreate} className="bg-white rounded shadow-sm p-4 max-w-md space-y-3">
        <h2 className="font-semibold">Crear usuario</h2>
        <label className="block text-sm">
          <span className="text-slate-600">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Rol</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "super_admin" | "dependencia_admin")}
            className="mt-1 w-full border rounded px-3 py-2">
            <option value="dependencia_admin">Admin de dependencia</option>
            <option value="super_admin">Super admin</option>
          </select>
        </label>
        {role === "dependencia_admin" && (
          <label className="block text-sm">
            <span className="text-slate-600">Dependencia</span>
            <select value={depId ?? ""} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : null)}
              required
              className="mt-1 w-full border rounded px-3 py-2">
              <option value="">— elegir —</option>
              {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="bg-melgar-500 hover:bg-melgar-600 text-white rounded px-4 py-2 font-medium">Crear</button>
      </form>
    </div>
  );
}
