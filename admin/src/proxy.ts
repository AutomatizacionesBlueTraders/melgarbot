import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/login")) {
    return NextResponse.next();
  }
  const tok = req.cookies.get("melgar_session")?.value;
  if (!tok) return NextResponse.redirect(new URL("/login", req.url));
  try {
    await jwtVerify(tok, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
