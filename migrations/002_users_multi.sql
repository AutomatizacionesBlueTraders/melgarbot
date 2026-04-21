-- =========================================================
-- F2: Multi-usuario con roles y vinculación a dependencia
-- Idempotente.
-- =========================================================

BEGIN;

ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin',
    ADD COLUMN IF NOT EXISTS dependencia_id INT
        REFERENCES dependencias(id) ON DELETE CASCADE;

-- Constraint de valores válidos (DROP+CREATE idempotente)
ALTER TABLE admin_users
    DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE admin_users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('super_admin','dependencia_admin'));

-- Si el rol es dependencia_admin, la dependencia es obligatoria
ALTER TABLE admin_users
    DROP CONSTRAINT IF EXISTS chk_users_dep_required;
ALTER TABLE admin_users
    ADD CONSTRAINT chk_users_dep_required
    CHECK (
        role = 'super_admin'
        OR (role = 'dependencia_admin' AND dependencia_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_users_dependencia
    ON admin_users(dependencia_id) WHERE dependencia_id IS NOT NULL;

COMMIT;
