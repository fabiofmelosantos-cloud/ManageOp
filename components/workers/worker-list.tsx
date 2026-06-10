'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, User } from 'lucide-react';
import type { Worker, Specialty, ShiftType } from '@/lib/types';

interface WorkerListProps {
  workers: Worker[];
  specialties: Specialty[];
  onEdit: (worker: Worker) => void;
  onDelete: (workerId: string) => void;
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};

const patternLabels = {
  '5x2': '5x2',
  '4x2': '4x2',
};

export function WorkerList({ workers, specialties, onEdit, onDelete }: WorkerListProps) {
  const getSpecialtyName = (specialtyId: string) => {
    return specialties.find(s => s.id === specialtyId)?.name || 'Desconhecida';
  };

  if (workers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum trabalhador cadastrado ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trabalhadores Cadastrados</CardTitle>
        <CardDescription>
          Total de {workers.length} trabalhador{workers.length !== 1 ? 'es' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nº Funcionário</TableHead>
                <TableHead>Escala</TableHead>
                <TableHead>Turnos</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map(worker => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.name}</TableCell>
                  <TableCell>{worker.employeeId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{patternLabels[worker.schedulePattern]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(worker.availableShifts || []).map(shift => (
                        <Badge key={shift} variant="secondary" className="text-xs">
                          {shiftLabels[shift]}
                        </Badge>
                      ))}
                      {(!worker.availableShifts || worker.availableShifts.length === 0) && (
                        <span className="text-xs text-muted-foreground">Sem turnos definidos</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(worker.specialties || []).slice(0, 2).map(specialtyId => (
                        <Badge key={specialtyId} className="text-xs">
                          {getSpecialtyName(specialtyId)}
                        </Badge>
                      ))}
                      {(worker.specialties || []).length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{worker.specialties.length - 2}
                        </Badge>
                      )}
                      {(!worker.specialties || worker.specialties.length === 0) && (
                        <span className="text-xs text-muted-foreground">Sem especialidades</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(worker)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(worker.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
