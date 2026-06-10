-- Script para ativar Row Level Security em todas as tabelas
-- Corrige os 16 erros de segurança reportados pelo Supabase

-- Ativar RLS nas tabelas principais
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Ativar RLS nas tabelas de RH
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensatory_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- Ativar RLS nas tabelas auxiliares
ALTER TABLE public.daily_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_line_allocations ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS está ativado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'daily_plans', 'production_lines', 'products', 'schedules',
    'shift_assignments', 'shift_plans', 'workers', 'attendance',
    'absences', 'compensatory_days', 'vacations', 'daily_events',
    'production_tracking', 'profiles', 'shift_line_allocations'
)
ORDER BY tablename;
