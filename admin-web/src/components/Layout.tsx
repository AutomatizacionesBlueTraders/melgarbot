import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-slate-900 text-slate-100 px-6 py-3 flex items-center gap-6">
        <Link to="/" className="font-semibold">MelgarBot Admin</Link>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/conversaciones" className={({ isActive }) => isActive ? "text-white" : "text-slate-400 hover:text-white"}>Conversaciones</NavLink>
          <NavLink to="/dependencias" className={({ isActive }) => isActive ? "text-white" : "text-slate-400 hover:text-white"}>Dependencias</NavLink>
          {me?.role === "super_admin" && (
            <NavLink to="/users" className={({ isActive }) => isActive ? "text-white" : "text-slate-400 hover:text-white"}>Usuarios</NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-slate-400">{me?.username} ({me?.role})</span>
          <button onClick={handleLogout} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600">Salir</button>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
