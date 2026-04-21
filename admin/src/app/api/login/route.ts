import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  const r = await pool.query(
    "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
    [username],
  );
  if (!r.rowCount) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, r.rows[0].password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  const token = await signSession(r.rows[0].id, r.rows[0].username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
