# MelgarBot

ChatBot de la Alcaldía de Melgar (Tolima) — WhatsApp → Evolution API → Chatwoot → n8n → Postgres + RAG.

## Stack

- **Postgres 16 + pgvector** — menú jerárquico, mensajes, documentos, chunks vectorizados (768d Gemini)
- **n8n** — orquesta el bot, el crawler y el logger de mensajes
- **admin-api** — backend Node + Fastify + TypeScript (JWT, REST)
- **admin-web** — frontend Vite + React + TypeScript + Tailwind
- **Evolution API** — WhatsApp (externo al repo)

## Desarrollo local

```bash
cp .env.docker.example .env
# editar .env con tus valores

docker compose up -d postgres n8n pgadmin admin-api admin-web
```

Servicios:
- n8n: http://localhost:5678
- pgadmin: http://localhost:5050
- admin-web: http://localhost:3000
- admin-api: http://localhost:4000 (REST)
- postgres: localhost:5432

## Esquema DB

- `init.sql` — schema completo, se ejecuta la primera vez que arranca el contenedor Postgres
- `migrations/` — scripts idempotentes para aplicar a una DB viva

## Workflows n8n

- `workflows/message-logger.json` — logger independiente (referencia; ahora el logging vive dentro del workflow principal del bot)

## Admin

- `admin-api/` — REST backend con Fastify
  - Auth: JWT en header `Authorization: Bearer <token>`
  - Roles: `super_admin` (ve todo) y `dependencia_admin` (solo su dependencia)
- `admin-web/` — SPA React que consume la API
- `admin/` — app Next.js **legacy** (reemplazada por admin-api + admin-web; se mantiene como referencia)

## Deploy (EasyPanel)

2 servicios:
- `admin-api` → tipo App, Dockerfile en `admin-api/`, puerto interno 4000
- `admin-web` → tipo App, Dockerfile en `admin-web/`, puerto interno 80
  - Build arg: `VITE_API_URL=https://<dominio-del-admin-api>`

La DB es `dB_Melgar` en EasyPanel (ya existente).
