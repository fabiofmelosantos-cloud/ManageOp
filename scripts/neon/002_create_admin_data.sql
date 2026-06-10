-- Inserir dados iniciais do administrador
INSERT INTO app_storage (key, value) VALUES 
('profiles', '[{"id": "admin_1", "email": "admin@manageop.com", "name": "Administrador", "role": "admin", "employeeNumber": "ADM001", "createdAt": "2024-01-01T00:00:00.000Z"}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inserir especialidades padrão
INSERT INTO app_storage (key, value) VALUES 
('specialties', '[
  {"id": "spec_1", "name": "Operador de Linha", "description": "Operação geral de linha de produção"},
  {"id": "spec_2", "name": "Embalador", "description": "Embalamento de produtos"},
  {"id": "spec_3", "name": "Controlador de Qualidade", "description": "Controlo de qualidade"},
  {"id": "spec_4", "name": "Operador de Empilhador", "description": "Operação de empilhador"},
  {"id": "spec_5", "name": "Técnico de Manutenção", "description": "Manutenção de equipamentos"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inserir produtos exemplo
INSERT INTO app_storage (key, value) VALUES 
('products', '[
  {"id": "prod_1", "name": "Produto A", "code": "PA001", "description": "Produto standard A"},
  {"id": "prod_2", "name": "Produto B", "code": "PB002", "description": "Produto standard B"},
  {"id": "prod_3", "name": "Produto C", "code": "PC003", "description": "Produto premium C"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inserir linhas de produção exemplo
INSERT INTO app_storage (key, value) VALUES 
('production_lines', '[
  {"id": "line_1", "name": "Linha 1", "description": "Linha de produção principal", "isActive": true, "rpm": 100, "lineLoad": 80, "timeToLaminator": 30, "timeToPackaging": 45, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "line_2", "name": "Linha 2", "description": "Linha de produção secundária", "isActive": true, "rpm": 90, "lineLoad": 75, "timeToLaminator": 25, "timeToPackaging": 40, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "line_3", "name": "Linha 3", "description": "Linha de embalamento", "isActive": true, "rpm": 120, "lineLoad": 85, "timeToLaminator": 20, "timeToPackaging": 35, "createdAt": "2024-01-01T00:00:00.000Z"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inserir trabalhadores exemplo
INSERT INTO app_storage (key, value) VALUES 
('workers', '[
  {"id": "worker_1", "name": "João Silva", "employeeNumber": "EMP001", "shift": "morning", "specialties": ["spec_1", "spec_2"], "isActive": true, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "worker_2", "name": "Maria Santos", "employeeNumber": "EMP002", "shift": "morning", "specialties": ["spec_1", "spec_3"], "isActive": true, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "worker_3", "name": "Pedro Costa", "employeeNumber": "EMP003", "shift": "afternoon", "specialties": ["spec_2", "spec_4"], "isActive": true, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "worker_4", "name": "Ana Ferreira", "employeeNumber": "EMP004", "shift": "afternoon", "specialties": ["spec_1", "spec_5"], "isActive": true, "createdAt": "2024-01-01T00:00:00.000Z"},
  {"id": "worker_5", "name": "Carlos Oliveira", "employeeNumber": "EMP005", "shift": "night", "specialties": ["spec_1", "spec_2", "spec_3"], "isActive": true, "createdAt": "2024-01-01T00:00:00.000Z"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inicializar arrays vazios para outras tabelas
INSERT INTO app_storage (key, value) VALUES 
('schedules', '[]'::jsonb),
('weekly_plans', '[]'::jsonb),
('production_tracking', '[]'::jsonb),
('shift_reports', '[]'::jsonb),
('vacations', '[]'::jsonb),
('compensatory_days', '[]'::jsonb),
('absences', '[]'::jsonb),
('daily_events', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
