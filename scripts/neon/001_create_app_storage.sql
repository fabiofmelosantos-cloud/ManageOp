-- Criar tabela app_storage para armazenar dados da aplicação
CREATE TABLE IF NOT EXISTS app_storage (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_app_storage_key ON app_storage(key);

-- Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_app_storage_updated_at ON app_storage;
CREATE TRIGGER update_app_storage_updated_at
    BEFORE UPDATE ON app_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
