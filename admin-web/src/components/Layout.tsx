import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-white border-b-2 border-white pb-1"
      : "text-white/80 hover:text-white pb-1";

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-melgar-500 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Alcaldía de Melgar" className="h-10 w-10 rounded-full bg-white p-1" />
            <div className="leading-tight">
              <div className="font-semibold">Alcaldía de Melgar</div>
              <div className="text-xs text-white/80">Panel Administrativo</div>
            </div>
          </Link>
          <nav className="flex gap-5 text-sm ml-4">
            {me?.role === "super_admin" && (
              <NavLink to="/conversaciones" className={linkCls}>Conversaciones</NavLink>
            )}
            <NavLink to="/dependencias" className={linkCls}>Dependencias</NavLink>
            <NavLink to="/documentos" className={linkCls}>Documentos</NavLink>
            {me?.role === "super_admin" && (
              <NavLink to="/users" className={linkCls}>Usuarios</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-white/80 hidden sm:inline">
              {me?.username} · {me?.role === "super_admin" ? "Super admin" : "Admin dependencia"}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded bg-white/15 hover:bg-white/25 border border-white/20"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-xs text-slate-500">
        Alcaldía Municipal de Melgar — Tolima · <em>Bienestar y Desarrollo para Todos</em>
      </footer>
    </div>
  );
}
