'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ScheduleConflict, ShiftType } from '@/lib/types';

interface ConflictDetectorProps {
  conflicts: ScheduleConflict[];
  warnings: ScheduleConflict[];
  onClose?: () => void;
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};

export function ConflictDetector({ conflicts, warnings, onClose }: ConflictDetectorProps) {
  const hasIssues = conflicts.length > 0 || warnings.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <Card className={hasIssues ? 'border-destructive' : 'border-green-500'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasIssues ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            <CardTitle>
              {hasIssues ? 'Conflitos Detectados' : 'Sem Conflitos'}
            </CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
        <CardDescription>
          {hasIssues
            ? `${conflicts.length} erro(s) e ${warnings.length} aviso(s) encontrados`
            : 'A escala não apresenta conflitos'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasIssues ? (
          <div className="space-y-4">
            {conflicts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Erros ({conflicts.length})
                </h4>
                <div className="space-y-2">
                  {conflicts.map((conflict, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-destructive bg-destructive/5 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{conflict.description}</p>
                        <Badge variant="destructive" className="shrink-0">
                          Erro
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Data: {formatDate(conflict.date)}</p>
                        {conflict.shift && <p>Turno: {shiftLabels[conflict.shift]}</p>}
                        {conflict.workerName && <p>Trabalhador: {conflict.workerName}</p>}
                        {conflict.lineName && <p>Linha: {conflict.lineName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Avisos ({warnings.length})
                </h4>
                <div className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-amber-600 bg-amber-50 dark:bg-amber-950/20 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{warning.description}</p>
                        <Badge variant="outline" className="shrink-0 border-amber-600 text-amber-600">
                          Aviso
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Data: {formatDate(warning.date)}</p>
                        {warning.shift && <p>Turno: {shiftLabels[warning.shift]}</p>}
                        {warning.workerName && <p>Trabalhador: {warning.workerName}</p>}
                        {warning.lineName && <p>Linha: {warning.lineName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Todos os trabalhadores foram alocados corretamente sem conflitos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
