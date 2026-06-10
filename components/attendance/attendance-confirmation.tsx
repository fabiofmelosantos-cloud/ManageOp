'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, Send, UserX } from 'lucide-react';
import type { 
  Schedule, 
  Worker, 
  ProductionLine, 
  ShiftType, 
  LineAttendanceConfirmation,
  ShiftAttendanceReport 
} from '@/lib/types';

interface AttendanceConfirmationProps {
  schedule: Schedule;
  selectedDate: string;
  selectedShift: ShiftType;
  workers: Worker[];
  productionLines: ProductionLine[];
}

export function AttendanceConfirmation({
  schedule,
  selectedDate,
  selectedShift,
  workers,
  productionLines,
}: AttendanceConfirmationProps) {
  const [confirmations, setConfirmations] = useState<Map<string, LineAttendanceConfirmation>>(new Map());
  const [currentLine, setCurrentLine] = useState<string>('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [absences, setAbsences] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const daySchedule = schedule.days.find(
    d => d.date === selectedDate && d.shift === selectedShift
  );

  if (!daySchedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmação de Presença</CardTitle>
          <CardDescription>Nenhuma escala encontrada para esta data e turno</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Agrupar trabalhadores por linha
  const workersByLine = daySchedule.assignments.reduce((acc, assignment) => {
    if (!acc[assignment.productionLineId]) {
      acc[assignment.productionLineId] = [];
    }
    acc[assignment.productionLineId].push(assignment.workerId);
    return acc;
  }, {} as Record<string, string[]>);

  const activeLines = Object.keys(workersByLine);

  const handleToggleAbsence = (workerId: string) => {
    const newAbsences = new Set(absences);
    if (newAbsences.has(workerId)) {
      newAbsences.delete(workerId);
    } else {
      newAbsences.add(workerId);
    }
    setAbsences(newAbsences);
  };

  const handleConfirmLine = () => {
    if (!currentLine || !coordinatorName) return;

    const confirmation: LineAttendanceConfirmation = {
      lineId: currentLine,
      coordinatorName,
      confirmedAt: new Date().toISOString(),
      absences: Array.from(absences).map(workerId => ({ workerId })),
      notes: notes || undefined,
    };

    const newConfirmations = new Map(confirmations);
    newConfirmations.set(currentLine, confirmation);
    setConfirmations(newConfirmations);

    // Reset
    setCurrentLine('');
    setCoordinatorName('');
    setAbsences(new Set());
    setNotes('');
  };

  const handleSendToHR = () => {
    const report: ShiftAttendanceReport = {
      scheduleId: schedule.id,
      date: selectedDate,
      shift: selectedShift,
      confirmations: Array.from(confirmations.values()),
      allConfirmed: confirmations.size === activeLines.length,
      hrNotificationSent: true,
      createdAt: new Date().toISOString(),
    };

    // Simular envio de email/notificação
    const totalAbsences = report.confirmations.reduce((sum, c) => sum + c.absences.length, 0);
    
    alert(
      `Relatório enviado para Recursos Humanos!\n\n` +
      `Data: ${new Date(selectedDate).toLocaleDateString('pt-PT')}\n` +
      `Turno: ${selectedShift}\n` +
      `Linhas confirmadas: ${confirmations.size}/${activeLines.length}\n` +
      `Total de faltas: ${totalAbsences}\n\n` +
      `O RH será notificado via email.`
    );

    console.log('[v0] Relatório RH:', report);
  };

  const allLinesConfirmed = confirmations.size === activeLines.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Confirmação de Presença por Coordenador</CardTitle>
              <CardDescription>
                {new Date(selectedDate).toLocaleDateString('pt-PT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} - Turno {selectedShift === 'morning' ? 'Manhã' : selectedShift === 'afternoon' ? 'Tarde' : 'Noite'}
              </CardDescription>
            </div>
            {allLinesConfirmed && (
              <Badge className="bg-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Todas Confirmadas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Selecionar Linha para Confirmar</Label>
            <select
              value={currentLine}
              onChange={(e) => setCurrentLine(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Selecione uma linha...</option>
              {activeLines.map(lineId => {
                const line = productionLines.find(l => l.id === lineId);
                const isConfirmed = confirmations.has(lineId);
                return (
                  <option key={lineId} value={lineId} disabled={isConfirmed}>
                    {line?.name || lineId} {isConfirmed ? '✓ Confirmada' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {currentLine && (
            <>
              <div className="grid gap-2">
                <Label>Nome do Coordenador</Label>
                <Input
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <Label>Operadores na Linha</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {workersByLine[currentLine]?.map(workerId => {
                    const worker = workers.find(w => w.id === workerId);
                    const isAbsent = absences.has(workerId);
                    
                    return (
                      <div
                        key={workerId}
                        className={`flex items-center justify-between p-2 rounded ${
                          isAbsent ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAbsent}
                            onCheckedChange={() => handleToggleAbsence(workerId)}
                          />
                          <div>
                            <div className="font-medium">{worker?.name || 'Desconhecido'}</div>
                            <div className="text-sm text-muted-foreground">
                              Matrícula: {worker?.employeeId}
                            </div>
                          </div>
                        </div>
                        {isAbsent && (
                          <Badge variant="destructive">
                            <UserX className="h-3 w-3 mr-1" />
                            Ausente
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre faltas ou substituições..."
                  rows={3}
                />
              </div>

              <Button onClick={handleConfirmLine} className="w-full" disabled={!coordinatorName}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Linha
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {confirmations.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linhas Confirmadas</CardTitle>
            <CardDescription>
              {confirmations.size} de {activeLines.length} linhas confirmadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from(confirmations.values()).map((confirmation) => {
              const line = productionLines.find(l => l.id === confirmation.lineId);
              return (
                <div key={confirmation.lineId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{line?.name || 'Linha'}</div>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmada
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Coordenador: {confirmation.coordinatorName}</div>
                    <div>
                      Faltas: {confirmation.absences.length > 0 ? (
                        <span className="text-red-600 font-medium">
                          {confirmation.absences.length}
                        </span>
                      ) : (
                        'Nenhuma'
                      )}
                    </div>
                    {confirmation.notes && (
                      <div className="text-xs italic mt-1">"{confirmation.notes}"</div>
                    )}
                  </div>
                </div>
              );
            })}

            {allLinesConfirmed && (
              <Button onClick={handleSendToHR} className="w-full" variant="default">
                <Send className="h-4 w-4 mr-2" />
                Enviar Relatório para RH
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
