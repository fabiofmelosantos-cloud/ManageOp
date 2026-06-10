'use client';

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
import type { ScheduleDay, ShiftType, Worker, ProductionLine, Product } from '@/lib/types';

interface ScheduleWorkerViewProps {
  days: ScheduleDay[];
  workers: Worker[];
  productionLines: ProductionLine[];
  products: Product[];
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};

export function ScheduleWorkerView({
  days,
  workers,
  productionLines,
  products,
}: ScheduleWorkerViewProps) {
  const getLineName = (lineId: string) => {
    return productionLines.find(l => l.id === lineId)?.name || 'Desconhecida';
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Desconhecido';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };

  // Organizar alocações por trabalhador
  const workerSchedules = workers.map(worker => {
    const assignments = days.flatMap(day =>
      day.assignments
        .filter(a => a.workerId === worker.id)
        .map(assignment => ({
          date: day.date,
          shift: day.shift,
          ...assignment,
        }))
    );

    return {
      worker,
      assignments: assignments.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }).filter(ws => ws.assignments.length > 0);

  if (workerSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma alocação encontrada
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {workerSchedules.map(({ worker, assignments }) => (
        <Card key={worker.id}>
          <CardHeader>
            <CardTitle>{worker.name}</CardTitle>
            <CardDescription>
              {worker.employeeId} • {assignments.length} dia{assignments.length !== 1 ? 's' : ''}{' '}
              de trabalho • Padrão {worker.schedulePattern}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Linha</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{formatDate(assignment.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shiftLabels[assignment.shift]}</Badge>
                      </TableCell>
                      <TableCell>{getLineName(assignment.productionLineId)}</TableCell>
                      <TableCell>{getProductName(assignment.productId)}</TableCell>
                      <TableCell>
                        <Badge>#{assignment.position}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
