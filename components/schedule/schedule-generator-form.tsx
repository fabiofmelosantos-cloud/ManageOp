'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, Loader2, FileCheck } from 'lucide-react';
import type { ScheduleGenerationConfig, WeeklyProductionPlan } from '@/lib/types';

interface ScheduleGeneratorFormProps {
  onGenerate: (config: ScheduleGenerationConfig) => void;
  isGenerating: boolean;
  errors?: string[];
}

export function ScheduleGeneratorForm({
  onGenerate,
  isGenerating,
  errors = [],
}: ScheduleGeneratorFormProps) {
  const [mounted, setMounted] = useState(false);
  const [latestPlan, setLatestPlan] = useState<WeeklyProductionPlan | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadLatestPlan = async () => {
      try {
        const { getLatestWeeklyPlan } = await import('@/lib/storage');
        const plan = getLatestWeeklyPlan();
        setLatestPlan(plan);
        
        if (plan) {
          setStartDate(plan.startDate);
          const end = new Date(plan.startDate);
          end.setDate(end.getDate() + 6);
          setEndDate(end.toISOString().split('T')[0]);
        } else {
          // Se não houver plano, usar data atual
          const today = new Date();
          setStartDate(today.toISOString().split('T')[0]);
          today.setDate(today.getDate() + 6);
          setEndDate(today.toISOString().split('T')[0]);
        }
      } catch (error) {
        console.error('[v0] Error loading latest plan:', error);
        setLatestPlan(null);
      }
    };

    loadLatestPlan();
  }, [mounted]);

  const totalDays = startDate && endDate 
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      alert('A data de fim deve ser posterior à data de início');
      return;
    }
    
    onGenerate({ 
      startDate, 
      endDate, 
      shifts: ['morning', 'afternoon', 'night']
    });
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerar Nova Escala
          </CardTitle>
          <CardDescription>
            A carregar formulário...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Gerar Nova Escala
        </CardTitle>
        <CardDescription>
          A escala será gerada automaticamente baseada no último plano de produção criado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Não é possível gerar a escala:</p>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {latestPlan ? (
            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
              <FileCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-200">
                <p className="font-semibold">Plano de Produção Carregado:</p>
                <p className="text-sm mt-1">{latestPlan.name}</p>
                <p className="text-xs mt-1">
                  {new Date(latestPlan.startDate).toLocaleDateString('pt-PT')} -{' '}
                  {new Date(new Date(latestPlan.startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum plano de produção encontrado. A escala será gerada com todas as linhas ativas.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data de Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Data de Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          {totalDays > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Período: <span className="font-semibold text-foreground">{totalDays} dias</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Serão gerados os 3 turnos (Manhã, Tarde e Noite) para cada dia
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="submit" disabled={isGenerating || errors.length > 0} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  A Gerar...
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 mr-2" />
                  Gerar Escala Automaticamente
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
