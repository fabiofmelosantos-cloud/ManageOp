'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save } from 'lucide-react';
import type { ShiftReport, ShiftType } from '@/lib/types';

interface ShiftReportFormProps {
  lineId: string;
  lineName: string;
  coordinatorName: string;
  date: string;
  shift: ShiftType;
  productId: string;
  productName: string;
  targetQuantity: number;
  producedQuantity: number;
  onSave: (report: ShiftReport) => void;
}

export function ShiftReportForm({
  lineId,
  lineName,
  coordinatorName,
  date,
  shift,
  productId,
  productName,
  targetQuantity,
  producedQuantity,
  onSave,
}: ShiftReportFormProps) {
  const [downtime, setDowntime] = useState(0);
  const [quality, setQuality] = useState<'excellent' | 'good' | 'acceptable' | 'poor'>('good');
  const [wastePercentage, setWastePercentage] = useState(0);
  const [issues, setIssues] = useState('');
  const [observations, setObservations] = useState('');

  const handleSubmit = () => {
    const report: ShiftReport = {
      id: `report-${Date.now()}`,
      lineId,
      lineName,
      coordinatorName,
      date,
      shift,
      productId,
      productName,
      targetQuantity,
      producedQuantity,
      downtime,
      quality,
      wastePercentage,
      issues,
      observations,
      createdAt: new Date().toISOString(),
    };

    onSave(report);
  };

  const efficiency = targetQuantity > 0 ? (producedQuantity / targetQuantity) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Relatório de Final de Turno
        </CardTitle>
        <CardDescription>
          {lineName} - {new Date(date).toLocaleDateString('pt-PT')} - Turno{' '}
          {shift === 'morning' ? 'Manhã' : shift === 'afternoon' ? 'Tarde' : 'Noite'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Produto</Label>
            <p className="font-medium">{productName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Coordenador</Label>
            <p className="font-medium">{coordinatorName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Meta</p>
            <p className="text-2xl font-bold">{targetQuantity} kg</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Produzido</p>
            <p className="text-2xl font-bold text-primary">{producedQuantity.toFixed(0)} kg</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Eficiência</p>
            <p className={`text-2xl font-bold ${efficiency >= 100 ? 'text-green-600' : efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {efficiency.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Tempo Parado (minutos)</Label>
          <Input
            type="number"
            value={downtime}
            onChange={(e) => setDowntime(Number(e.target.value))}
            min={0}
          />
        </div>

        <div className="grid gap-2">
          <Label>Qualidade da Produção</Label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as any)}
            className="border rounded-md px-3 py-2"
          >
            <option value="excellent">Excelente</option>
            <option value="good">Boa</option>
            <option value="acceptable">Aceitável</option>
            <option value="poor">Má</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label>Desperdício (%)</Label>
          <Input
            type="number"
            value={wastePercentage}
            onChange={(e) => setWastePercentage(Number(e.target.value))}
            min={0}
            max={100}
            step={0.1}
          />
        </div>

        <div className="grid gap-2">
          <Label>Problemas/Incidentes</Label>
          <Textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Descreva problemas, avarias ou incidentes durante o turno..."
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label>Observações Gerais</Label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Notas adicionais, sugestões de melhoria..."
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Guardar Relatório
        </Button>
      </CardContent>
    </Card>
  );
}
