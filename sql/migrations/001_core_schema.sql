-- 001_core_schema.sql
-- Core schema for Iwacu Rwanda: hierarchy (ltree), boundaries (PostGIS), leaders base.
-- Idempotent where possible. Run after enabling extensions postgis + ltree.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;

-- Administrative hierarchy nodes (province > district > sector > cell > village)
CREATE TABLE IF NOT EXISTS admin_nodes (
  code text PRIMARY KEY,
  name_kiny text NOT NULL,
  name_eng text,
  level text NOT NULL CHECK (level IN ('province','district','sector','cell','village')),
  path ltree NOT NULL,
  parent_code text REFERENCES admin_nodes(code),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_nodes_path_idx ON admin_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS admin_nodes_parent_idx ON admin_nodes(parent_code);
CREATE INDEX IF NOT EXISTS admin_nodes_level_idx ON admin_nodes(level);

-- Boundary polygons (official only; no invented geometries)
CREATE TABLE IF NOT EXISTS boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_code text NOT NULL REFERENCES admin_nodes(code) ON DELETE CASCADE,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boundaries_geom_idx ON boundaries USING GIST (geom);
CREATE UNIQUE INDEX IF NOT EXISTS boundaries_node_code_uidx ON boundaries(node_code);

-- Contact kinds (extensible without code change)
CREATE TABLE IF NOT EXISTS contact_kinds (
  code text PRIMARY KEY,
  label_kiny text NOT NULL,
  label_eng text,
  icon text,
  value_pattern text,
  is_phone boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100
);

INSERT INTO contact_kinds (code, label_kiny, label_eng, icon, is_phone, is_public, sort_order) VALUES
  ('phone', 'Telefoni', 'Phone', 'phone', true, true, 10),
  ('whatsapp', 'WhatsApp', 'WhatsApp', 'message-circle', true, true, 20),
  ('email', 'Imeyili', 'Email', 'mail', false, true, 30)
ON CONFLICT (code) DO NOTHING;

-- Leaders
CREATE TABLE IF NOT EXISTS leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL,
  role_label_kiny text,
  role_label_eng text,
  scope_code text NOT NULL REFERENCES admin_nodes(code),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft','pending','verified','rejected','archived')),
  owner_id uuid REFERENCES auth.users(id),
  phone_raw_masked text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaders_scope_idx ON leaders(scope_code);
CREATE INDEX IF NOT EXISTS leaders_status_idx ON leaders(status);
CREATE INDEX IF NOT EXISTS leaders_owner_idx ON leaders(owner_id);

-- Public view (only verified, masked)
CREATE OR REPLACE VIEW leaders_public_view AS
SELECT
  id,
  full_name,
  role,
  COALESCE(role_label_kiny, role) AS role_label_kiny,
  role_label_eng,
  scope_code,
  status,
  phone_raw_masked,
  contacts,
  updated_at
FROM leaders
WHERE status = 'verified';

-- RPC: locate sector by point
CREATE OR REPLACE FUNCTION locate_sector(p_lat double precision, p_lng double precision)
RETURNS TABLE (
  code text,
  name_kiny text,
  name_eng text,
  level text,
  cell_code text,
  cell_name_kiny text,
  cell_name_eng text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.code,
    s.name_kiny,
    s.name_eng,
    s.level,
    c.code AS cell_code,
    c.name_kiny AS cell_name_kiny,
    c.name_eng AS cell_name_eng
  FROM boundaries b
  JOIN admin_nodes s ON s.code = b.node_code AND s.level = 'sector'
  LEFT JOIN admin_nodes c ON c.parent_code = s.code AND c.level = 'cell'
    AND EXISTS (
      SELECT 1 FROM boundaries cb
      WHERE cb.node_code = c.code
        AND ST_Contains(cb.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
    )
  WHERE ST_Contains(b.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  ORDER BY c.code NULLS LAST
  LIMIT 1;
$$;

-- Basic RLS (anon can read public view; authenticated owners manage their rows)
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leaders_public_read ON leaders;
CREATE POLICY leaders_public_read ON leaders
  FOR SELECT USING (status = 'verified');

DROP POLICY IF EXISTS leaders_owner_all ON leaders;
CREATE POLICY leaders_owner_all ON leaders
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
