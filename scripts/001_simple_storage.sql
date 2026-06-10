-- Tabela simples de key-value para armazenamento centralizado
CREATE TABLE IF NOT EXISTS app_storage (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar timestamp
CREATE TRIGGER update_app_storage_updated_at 
  BEFORE UPDATE ON app_storage 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Desabilitar RLS para simplicidade (acesso público)
ALTER TABLE app_storage DISABLE ROW LEVEL SECURITY;
