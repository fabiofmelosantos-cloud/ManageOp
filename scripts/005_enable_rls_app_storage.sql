-- Ativar RLS na tabela app_storage para forçar segurança
ALTER TABLE app_storage ENABLE ROW LEVEL SECURITY;

-- Política: Apenas usuários autenticados podem acessar
DROP POLICY IF EXISTS "Usuários autenticados podem acessar app_storage" ON app_storage;
CREATE POLICY "Usuários autenticados podem acessar app_storage"
ON app_storage FOR ALL
USING (auth.uid() IS NOT NULL);
