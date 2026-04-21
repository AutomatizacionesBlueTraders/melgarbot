import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-gray-100 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-6">MelgarBot</h2>
        <nav className="space-y-1 flex-1">
          <Link
            href="/conversaciones"
            className="block px-3 py-2 rounded hover:bg-gray-800"
          >
            Conversaciones
          </Link>
          <Link
            href="/dependencias"
            className="block px-3 py-2 rounded hover:bg-gray-800"
          >
            Dependencias
          </Link>
        </nav>
        <form
          action="/api/logout"
          method="POST"
          className="border-t border-gray-700 pt-4 mt-4"
        >
          <p className="text-xs text-gray-400 mb-2">{session.u}</p>
          <button
            type="submit"
            className="text-sm text-gray-300 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
