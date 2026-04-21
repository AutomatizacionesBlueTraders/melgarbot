import { SignJWT, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export type UserRole = "super_admin" | "dependencia_admin";

export type SessionPayload = {
  uid: number;
  u: string;
  r: UserRole;
  dep: number | null;
};

export async function signToken(p: SessionPayload): Promise<string> {
  return await new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as SessionPayload;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionPayload;
  }
}

export async function authPreHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  if (!m) return reply.code(401).send({ error: "missing token" });
  try {
    req.user = await verifyToken(m[1]);
  } catch {
    return reply.code(401).send({ error: "invalid token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: "unauthenticated" });
    if (!roles.includes(req.user.r)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };
}
