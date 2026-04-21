-- =========================================================
-- MelgarBot - Esquema inicial Postgres + pgvector
-- Se ejecuta automáticamente la primera vez que arranca el contenedor
-- =========================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------
-- Trigger genérico para updated_at (se usa en varias tablas)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- 1) MENÚ JERÁRQUICO (reemplaza Airtable)
-- ---------------------------------------------------------
CREATE TABLE menu_items (
    id              SERIAL PRIMARY KEY,
    option_number   INT NOT NULL,
    option_text     TEXT NOT NULL,
    message         TEXT,
    parent_id       INT REFERENCES menu_items(id) ON DELETE CASCADE,
    sort_order      INT DEFAULT 0,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_parent ON menu_items(parent_id) WHERE active;
CREATE UNIQUE INDEX uq_menu_parent_option ON menu_items(parent_id, option_number) WHERE active;

CREATE TRIGGER trg_menu_updated   BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 2) DEPENDENCIAS (Hacienda, Planeación, etc.)
-- ---------------------------------------------------------
CREATE TABLE dependencias (
    id              SERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_deps_updated   BEFORE UPDATE ON dependencias
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 3) PÁGINAS SCRAPEADAS
-- ---------------------------------------------------------
CREATE TABLE pages (
    id              SERIAL PRIMARY KEY,
    url             TEXT UNIQUE NOT NULL,
    title           TEXT,
    section         TEXT,
    content_hash    TEXT,
    published_at    TIMESTAMPTZ,          -- fecha de publicación (filtro 2022+)
    last_crawled    TIMESTAMPTZ,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_section   ON pages(section) WHERE active;
CREATE INDEX idx_pages_published ON pages(published_at DESC) WHERE active;

-- ---------------------------------------------------------
-- 4) DOCUMENTS (PDFs/DOCX subidos desde el admin por dependencia)
-- ---------------------------------------------------------
CREATE TABLE documents (
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

CREATE INDEX idx_documents_dependencia ON documents(dependencia_id);
CREATE INDEX idx_documents_status      ON documents(status);

-- ---------------------------------------------------------
-- 5) CHUNKS + EMBEDDINGS (origen: página o documento)
-- Gemini text-embedding-004 = 768 dimensiones
-- ---------------------------------------------------------
CREATE TABLE chunks (
    id              BIGSERIAL PRIMARY KEY,
    page_id         INT     REFERENCES pages(id)     ON DELETE CASCADE,
    document_id     BIGINT  REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index     INT NOT NULL,
    content         TEXT NOT NULL,
    tokens          INT,
    embedding       vector(768),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_chunks_source CHECK (page_id IS NOT NULL OR document_id IS NOT NULL)
);

CREATE INDEX idx_chunks_page     ON chunks(page_id);
CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_chunks_embedding_hnsw ON chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_chunks_content_trgm ON chunks USING gin (content gin_trgm_ops);

-- ---------------------------------------------------------
-- 6) ESTADO CONVERSACIONAL (reemplaza DataTable n8n)
-- ---------------------------------------------------------
CREATE TABLE conversations (
    id                  BIGSERIAL PRIMARY KEY,
    conversation_id     TEXT UNIQUE NOT NULL,
    phone               TEXT,
    state               JSONB DEFAULT '{"path": [], "mode": "menu"}'::jsonb,
    fail_attempts       INT DEFAULT 0,
    last_message_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_phone ON conversations(phone);

CREATE TRIGGER trg_conv_updated   BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 7) MESSAGES (captura WhatsApp in+out vía Evolution API)
-- ---------------------------------------------------------
CREATE TABLE messages (
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

CREATE INDEX idx_messages_phone_time ON messages(phone, created_at DESC);
CREATE INDEX idx_messages_conv_time  ON messages(conversation_id, created_at DESC);

-- ---------------------------------------------------------
-- 8) OBSERVABILIDAD: preguntas sin respuesta suficiente
-- ---------------------------------------------------------
CREATE TABLE unanswered (
    id                  BIGSERIAL PRIMARY KEY,
    conversation_id     TEXT,
    question            TEXT NOT NULL,
    top_score           FLOAT,
    top_urls            TEXT[],
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9) ADMIN USERS (1 solo admin, hash bcrypt generado por la app)
-- ---------------------------------------------------------
CREATE TABLE admin_users (
    id              SERIAL PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_admin_updated   BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------
-- 10) Función helper: búsqueda semántica top-k (pages + documents)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding vector(768),
    match_count INT DEFAULT 5,
    min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    chunk_id    BIGINT,
    content     TEXT,
    source      TEXT,        -- 'page' | 'document'
    url         TEXT,        -- URL si es page, filename si es doc
    title       TEXT,
    dependencia TEXT,
    similarity  FLOAT
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
    LEFT JOIN pages        p   ON p.id = c.page_id AND p.active
    LEFT JOIN documents    d   ON d.id = c.document_id AND d.status = 'done'
    LEFT JOIN dependencias dep ON dep.id = d.dependencia_id
    WHERE (p.id IS NOT NULL OR d.id IS NOT NULL)
      AND 1 - (c.embedding <=> query_embedding) >= min_similarity
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ---------------------------------------------------------
-- 11) URLs raíz a crawlear (seed del crawler)
-- ---------------------------------------------------------
CREATE TABLE crawl_seeds (
    id              SERIAL PRIMARY KEY,
    url             TEXT UNIQUE NOT NULL,
    section         TEXT NOT NULL,
    frequency_hours INT DEFAULT 24,
    active          BOOLEAN DEFAULT TRUE
);

INSERT INTO crawl_seeds (url, section, frequency_hours) VALUES
    ('https://www.melgar-tolima.gov.co/',                                               'home',            168),
    ('https://www.melgar-tolima.gov.co/contactenos/',                                    'contacto',        168),
    ('https://www.melgar-tolima.gov.co/peticiones-quejas-reclamos',                      'pqrds',           168),
    ('https://www.melgar-tolima.gov.co/politicas/',                                      'politicas',       168),
    ('https://www.melgar-tolima.gov.co/tema/noticias',                                   'noticias',           6),
    ('https://www.melgar-tolima.gov.co/tema/convocatorias',                              'convocatorias',      6),
    ('https://www.melgar-tolima.gov.co/tema/calendario-de-actividades-277239',           'calendario',        12),
    ('https://www.melgar-tolima.gov.co/tema/tramites-y-servicios',                       'tramites',          48),
    ('https://www.melgar-tolima.gov.co/tema/normatividad',                               'normatividad',     168),
    ('https://www.melgar-tolima.gov.co/tema/contratacion',                               'contratacion',      24),
    ('https://www.melgar-tolima.gov.co/tema/control',                                    'control',          168),
    ('https://www.melgar-tolima.gov.co/tema/cajas-de-herramientas',                      'datos-abiertos',   168),
    ('https://www.melgar-tolima.gov.co/control/programa-de-gestion-documental',          'gestion-doc',      168),
    ('https://www.melgar-tolima.gov.co/tema/informe-de-pqr',                             'informes-pqr',      48),
    ('https://www.melgar-tolima.gov.co/tema/glosario',                                   'glosario',         168),
    ('https://www.melgar-tolima.gov.co/tema/preguntas-y-respuestas',                     'faq',              168),
    ('https://www.melgar-tolima.gov.co/tema/estudios-e-investigaciones',                 'estudios',         168),
    ('https://www.melgar-tolima.gov.co/tema/informacion-adicional',                      'info-adicional',   168),
    ('https://www.melgar-tolima.gov.co/tema/informacion-especifica-para-grupos-de-interes','grupos-interes', 168),
    ('https://www.melgar-tolima.gov.co/tema/descripcion-menu-participa',                 'participa',        168),
    ('https://www.melgar-tolima.gov.co/tema/retos-de-participacion',                     'retos',            168);

-- Fin init.sql
