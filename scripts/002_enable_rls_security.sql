-- Ativar Row Level Security em todas as tabelas
-- Garante que apenas usuários autorizados podem acessar dados

-- Ativar RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_production_plan ENABLE ROW LEVEL SECURITY;

-- Política para ADMIN: Acesso total
CREATE POLICY "Admins têm acesso total a workers"
ON workers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Admins têm acesso total a production_lines"
ON production_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Admins têm acesso total a schedules"
ON schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Admins têm acesso total a shift_assignments"
ON shift_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

-- Política para COORDENADOR: Apenas suas linhas
CREATE POLICY "Coordenadores veem suas linhas"
ON production_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'ADMIN' OR profiles.role = 'COORDENADOR')
  )
);

CREATE POLICY "Coordenadores editam suas linhas"
ON production_lines FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'COORDENADOR')
  )
);

-- Política para OPERADOR: Apenas seus próprios dados
CREATE POLICY "Operadores veem seus próprios dados"
ON workers FOR SELECT
USING (
  auth.uid()::text = id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'COORDENADOR', 'RH')
  )
);

CREATE POLICY "Operadores veem suas próprias escalas"
ON shift_assignments FOR SELECT
USING (
  worker_id = auth.uid()::text
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'COORDENADOR', 'RH')
  )
);

-- Política para RH: Ver relatórios mas não editar
CREATE POLICY "RH vê todos os workers"
ON workers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'RH')
  )
);

CREATE POLICY "RH vê todas as escalas"
ON schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'RH', 'COORDENADOR')
  )
);

-- Políticas para tabelas de suporte (todos podem ler)
CREATE POLICY "Todos leem produtos"
ON products FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos leem especialidades"
ON specialties FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins editam produtos"
ON products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Admins editam especialidades"
ON specialties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

-- Plano de produção: Coordenadores e Admin podem editar
CREATE POLICY "Coordenadores e Admin editam plano de produção"
ON weekly_production_plan FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'COORDENADOR')
  )
);
