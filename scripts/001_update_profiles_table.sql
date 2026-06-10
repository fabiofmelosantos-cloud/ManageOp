-- Atualizar tabela profiles para suportar o novo sistema de autenticação
-- Este script adiciona campos necessários caso não existam

-- Adicionar coluna email se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Criar índice no email para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Atualizar RLS policies para permitir usuários criarem seus próprios perfis
DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON profiles;
CREATE POLICY "Usuários podem inserir próprio perfil" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Permitir usuários atualizarem seus próprios perfis
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Permitir que todos vejam perfis (necessário para funcionalidades do app)
DROP POLICY IF EXISTS "Qualquer um pode ver perfis" ON profiles;
CREATE POLICY "Qualquer um pode ver perfis" 
  ON profiles 
  FOR SELECT 
  USING (true);

-- Garantir que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
