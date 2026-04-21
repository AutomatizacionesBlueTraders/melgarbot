import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Conversaciones from "./pages/Conversaciones";
import Conversacion from "./pages/Conversacion";
import Dependencias from "./pages/Dependencias";
import Dependencia from "./pages/Dependencia";
import Users from "./pages/Users";
import type { ReactElement } from "react";

function RequireAuth({ children, superOnly }: { children: ReactElement; superOnly?: boolean }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="p-6">Cargando…</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (superOnly && me.role !== "super_admin") return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { me } = useAuth();
  if (me?.role === "dependencia_admin" && me.dependencia_id) {
    return <Navigate to={`/dependencias/${me.dependencia_id}`} replace />;
  }
  return <Navigate to="/conversaciones" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<Home />} />
            <Route path="/conversaciones" element={<RequireAuth superOnly><Conversaciones /></RequireAuth>} />
            <Route path="/conversaciones/:phone" element={<RequireAuth superOnly><Conversacion /></RequireAuth>} />
            <Route path="/dependencias" element={<Dependencias />} />
            <Route path="/dependencias/:id" element={<Dependencia />} />
            <Route path="/users" element={<RequireAuth superOnly><Users /></RequireAuth>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
