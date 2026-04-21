import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const tok = c.get(SESSION_COOKIE)?.value;
  if (!tok) return null;
  try {
    return await verifySession(tok);
  } catch {
    return null;
  }
}
