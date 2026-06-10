-- Sistema de Logs de Auditoria
-- Registra TODAS as alterações para rastreabilidade completa

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS para audit_logs (apenas ADMIN pode ver)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas Admin vê logs de auditoria"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

-- Função para registrar automaticamente mudanças
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Buscar informações do usuário
  SELECT id, name, role INTO user_profile
  FROM profiles
  WHERE id = auth.uid();

  -- Registrar a mudança
  INSERT INTO audit_logs (
    user_id,
    user_name,
    user_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    user_profile.id,
    user_profile.name,
    user_profile.role,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar triggers em tabelas críticas
CREATE TRIGGER audit_workers_changes
AFTER INSERT OR UPDATE OR DELETE ON workers
FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER audit_schedules_changes
AFTER INSERT OR UPDATE OR DELETE ON schedules
FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER audit_production_lines_changes
AFTER INSERT OR UPDATE OR DELETE ON production_lines
FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER audit_shift_assignments_changes
AFTER INSERT OR UPDATE OR DELETE ON shift_assignments
FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER audit_weekly_plan_changes
AFTER INSERT OR UPDATE OR DELETE ON weekly_production_plan
FOR EACH ROW EXECUTE FUNCTION log_table_changes();
