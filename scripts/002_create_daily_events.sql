-- Criar tabela para eventos especiais em dias de produção
CREATE TABLE IF NOT EXISTS daily_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event_type TEXT NOT NULL, -- 'audit', 'visit', 'maintenance', 'other'
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME,
  end_time TIME,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_daily_events_date ON daily_events(date);
CREATE INDEX IF NOT EXISTS idx_daily_events_daily_plan ON daily_events(daily_plan_id);

-- RLS Policies
ALTER TABLE daily_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view daily events"
  ON daily_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/Manager/Coordinator can manage daily events"
  ON daily_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'coordinator')
    )
  );
