-- =========================================================
-- F1: Mensajes, Dependencias, Documentos, fecha en pages
-- Aplicar sobre DB viva. Idempotente (IF NOT EXISTS donde aplica).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1) MESSAGES (captura de WhatsApp in+out vía Evolution API)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id                  BIGSERIAL PRIMARY KEY,
    conversation_id     TEXT,
    phone               TEXT NOT NULL,
    contact_name        TEXT,
    direction           TEXT NOT NULL CHECK (direction IN ('in','out')),
    body                TEXT,
    message_type        TEXT DEFAULT 'text',
    evolution_msg_id    TEXT UNIQUE,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_phone_time
    ON messages(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time
    ON messages(conversation_id, created_at DESC);

-- ---------------------------------------------------------
-- 2) DEPENDENCIAS (Hacienda, Planeación, etc.)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS dependencias (
    id              SERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_deps_updated
    BEFORE UPDATE ON dependencias
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 3) DOCUMENTS (PDFs/DOCX que sube el admin por dependencia)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id              BIGSERIAL PRIMARY KEY,
    dependencia_id  INT NOT NULL REFERENCES dependencias(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    mime_type       TEXT,
    size_bytes      BIGINT,
    content_hash    TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','done','failed')),
    error_message   TEXT,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_dependencia
    ON documents(dependencia_id);
CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents(status);

-- ---------------------------------------------------------
-- 4) chunks: permitir origen = documento (además de página)
-- ---------------------------------------------------------
ALTER TABLE chunks
    ALTER COLUMN page_id DROP NOT NULL;

ALTER TABLE chunks
    ADD COLUMN IF NOT EXISTS document_id BIGINT
    REFERENCES documents(id) ON DELETE CASCADE;

ALTER TABLE chunks
    DROP CONSTRAINT IF EXISTS chk_chunks_source;
ALTER TABLE chunks
    ADD CONSTRAINT chk_chunks_source
    CHECK (page_id IS NOT NULL OR document_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);

-- ---------------------------------------------------------
-- 5) pages.published_at (para filtro 2022+)
-- ---------------------------------------------------------
ALTER TABLE pages
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pages_published
    ON pages(published_at DESC) WHERE active;

-- ---------------------------------------------------------
-- 6) admin_users (1 solo usuario, hash bcrypt desde la app)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id              SERIAL PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_admin_updated
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 7) search_chunks: soportar página O documento
-- ---------------------------------------------------------
DROP FUNCTION IF EXISTS search_chunks(vector, int, float);

CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding vector(768),
    match_count INT DEFAULT 5,
    min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    chunk_id   BIGINT,
    content    TEXT,
    source     TEXT,        -- 'page' | 'document'
    url        TEXT,        -- URL si es page, filename si es doc
    title      TEXT,
    dependencia TEXT,       -- slug de dependencia si aplica
    similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT
        c.id,
        c.content,
        CASE WHEN c.page_id IS NOT NULL THEN 'page' ELSE 'document' END,
        COALESCE(p.url, d.filename),
        COALESCE(p.title, d.filename),
        dep.slug,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM chunks c
    LEFT JOIN pages       p   ON p.id = c.page_id AND p.active
    LEFT JOIN documents   d   ON d.id = c.document_id AND d.status = 'done'
    LEFT JOIN dependencias dep ON dep.id = d.dependencia_id
    WHERE (p.id IS NOT NULL OR d.id IS NOT NULL)
      AND 1 - (c.embedding <=> query_embedding) >= min_similarity
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;

COMMIT;
