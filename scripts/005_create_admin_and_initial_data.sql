-- Criar perfil de administrador
INSERT INTO profiles (id, name, email, employee_id, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@manageop.com',
  'admin',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Criar algumas especialidades básicas
INSERT INTO specialties (id, name, description, created_at) VALUES
  (gen_random_uuid(), 'Operador Geral', 'Operador com conhecimento geral de todas as linhas', NOW()),
  (gen_random_uuid(), 'Técnico de Qualidade', 'Responsável pelo controle de qualidade', NOW()),
  (gen_random_uuid(), 'Líder de Equipa', 'Coordena equipa de produção', NOW()),
  (gen_random_uuid(), 'Manutenção', 'Manutenção preventiva e corretiva', NOW())
ON CONFLICT DO NOTHING;

-- Criar produtos exemplo
INSERT INTO products (id, name, description, created_at) VALUES
  (gen_random_uuid(), 'Produto A', 'Produto de linha principal', NOW()),
  (gen_random_uuid(), 'Produto B', 'Produto secundário', NOW()),
  (gen_random_uuid(), 'Produto C', 'Produto especial', NOW())
ON CONFLICT DO NOTHING;

-- Criar linhas de produção exemplo
INSERT INTO production_lines (id, name, description, is_active, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Linha 1', 'Linha principal de produção', true, (SELECT id FROM profiles WHERE email = 'admin@manageop.com'), NOW(), NOW()),
  (gen_random_uuid(), 'Linha 2', 'Linha secundária', true, (SELECT id FROM profiles WHERE email = 'admin@manageop.com'), NOW(), NOW()),
  (gen_random_uuid(), 'Linha 3', 'Linha auxiliar', true, (SELECT id FROM profiles WHERE email = 'admin@manageop.com'), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Criar alguns trabalhadores exemplo
INSERT INTO workers (id, name, employee_id, email, phone, specialties, available_shifts, schedule_pattern, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Trabalhador ' || i,
  'EMP' || LPAD(i::text, 4, '0'),
  'trabalhador' || i || '@manageop.com',
  '+351 9' || LPAD(i::text, 8, '0'),
  ARRAY[(SELECT id FROM specialties ORDER BY random() LIMIT 1)],
  ARRAY['morning', 'afternoon', 'night'],
  'rotating',
  (SELECT id FROM profiles WHERE email = 'admin@manageop.com'),
  NOW(),
  NOW()
FROM generate_series(1, 10) AS i
ON CONFLICT DO NOTHING;

-- Log de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Dados iniciais criados com sucesso!';
  RAISE NOTICE 'Login: admin@manageop.com';
  RAISE NOTICE 'Senha: admin123';
END $$;
