# MelgarBot

ChatBot de la Alcaldía de Melgar (Tolima) — WhatsApp → Evolution API → Chatwoot → n8n → Postgres + RAG.

## Stack

- **Postgres 16 + pgvector** — menú jerárquico, mensajes, documentos, chunks vectorizados (768d Gemini)
- **n8n** — orquesta el bot, el crawler y el Message Logger
- **Next.js 16 (admin)** — panel para ver conversaciones y subir documentos por dependencia
- **Evolution API** — WhatsApp (externo al repo)

## Desarrollo local

```bash
cp .env.docker.example .env
# editar .env con tus valores

docker compose up -d postgres n8n pgadmin admin
```

Servicios:
- n8n: http://localhost:5678
- pgadmin: http://localhost:5050
- admin: http://localhost:3000
- postgres: localhost:5432

## Esquema DB

- `init.sql` — se ejecuta la primera vez que arranca el contenedor Postgres
- `migrations/` — aplicar manualmente sobre una DB viva

## Workflows n8n

- `workflows/message-logger.json` — captura mensajes IN/OUT de Evolution API en tabla `messages`
- (más workflows por agregar)

## Admin (Next.js)

- Login con 1 admin (tabla `admin_users`, hash bcrypt)
- `/conversaciones` — lista de números → thread por teléfono
- `/dependencias` — CRUD + subida de docs PDF/DOCX/TXT, vectorización inmediata con Gemini

Ver `admin/README.md` para más detalle.
