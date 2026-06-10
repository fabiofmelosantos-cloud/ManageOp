-- Tabela para registar férias
CREATE TABLE IF NOT EXISTS vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para registar DC (Descanso Compensatório)
CREATE TABLE IF NOT EXISTS compensatory_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para faltas (já existe "absences", mas vamos melhorar)
-- Adicionar colunas à tabela existente se necessário
ALTER TABLE absences ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE absences ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'justified', 'unjustified'));
ALTER TABLE absences ADD COLUMN IF NOT EXISTS notes TEXT;

-- Tabela para saldo de férias e DC por trabalhador
CREATE TABLE IF NOT EXISTS hr_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL UNIQUE REFERENCES workers(id) ON DELETE CASCADE,
  vacation_days_total INTEGER NOT NULL DEFAULT 22,
  vacation_days_used INTEGER NOT NULL DEFAULT 0,
  compensatory_days_total INTEGER NOT NULL DEFAULT 0,
  compensatory_days_used INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vacation_requests_worker ON vacation_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_compensatory_days_worker ON compensatory_days(worker_id);
CREATE INDEX IF NOT EXISTS idx_compensatory_days_date ON compensatory_days(date);
CREATE INDEX IF NOT EXISTS idx_absences_worker ON absences(worker_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);

-- RLS Policies
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensatory_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_balance ENABLE ROW LEVEL SECURITY;

-- Policies para vacation_requests
CREATE POLICY "Anyone authenticated can view vacation requests" ON vacation_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/HR can manage vacation requests" ON vacation_requests FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

-- Policies para compensatory_days
CREATE POLICY "Anyone authenticated can view compensatory days" ON compensatory_days FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/HR can manage compensatory days" ON compensatory_days FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

-- Policies para hr_balance
CREATE POLICY "Anyone authenticated can view HR balance" ON hr_balance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/HR can manage HR balance" ON hr_balance FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));
