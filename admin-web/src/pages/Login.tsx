import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(u, p);
      nav("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">MelgarBot Admin</h1>
        <label className="block">
          <span className="text-sm text-slate-600">Usuario</span>
          <input value={u} onChange={(e) => setU(e.target.value)} autoFocus
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Password</span>
          <input type="password" value={p} onChange={(e) => setP(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button disabled={loading} className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-800 disabled:opacity-50">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
