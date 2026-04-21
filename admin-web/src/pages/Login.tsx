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
    <div className="min-h-full flex items-center justify-center bg-gradient-to-b from-melgar-50 to-slate-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" alt="Alcaldía de Melgar" className="h-16 w-16 rounded-full bg-melgar-50 p-1" />
          <h1 className="text-lg font-semibold text-center">Alcaldía de Melgar</h1>
          <div className="text-xs text-slate-500 text-center -mt-1">Panel Administrativo</div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">Usuario</span>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            autoFocus
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-melgar-500/40"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Contraseña</span>
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-melgar-500/40"
          />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button
          disabled={loading}
          className="w-full bg-melgar-500 hover:bg-melgar-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
