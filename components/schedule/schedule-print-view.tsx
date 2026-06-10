'use client';

import { Badge } from '@/components/ui/badge';
import type { ScheduleDay, Worker, ProductionLine, Product, Specialty, ShiftType } from '@/lib/types';

interface SchedulePrintViewProps {
  days: ScheduleDay[];
  workers: Worker[];
  productionLines: ProductionLine[];
  products: Product[];
  specialties: Specialty[];
  scheduleName: string;
  startDate: string;
  endDate: string;
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'MANHÃ',
  afternoon: 'TARDE',
  night: 'NOITE',
};

export function SchedulePrintView({
  days,
  workers,
  productionLines,
  products,
  specialties,
  scheduleName,
  startDate,
  endDate,
}: SchedulePrintViewProps) {
  const getWorkerName = (workerId: string) => {
    return workers.find(w => w.id === workerId)?.name || 'Desconhecido';
  };

  const getWorkerEmployeeId = (workerId: string) => {
    return workers.find(w => w.id === workerId)?.employeeId || 'N/A';
  };

  const getLineName = (lineId: string) => {
    return productionLines.find(l => l.id === lineId)?.name || 'Desconhecida';
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Desconhecido';
  };

  const getAssignedSpecialty = (workerId: string, lineId: string, productId: string): string => {
    const worker = workers.find(w => w.id === workerId);
    const line = productionLines.find(l => l.id === lineId);
    
    if (!worker || !line) return 'N/A';
    
    const requirement = line.requirements.find(r => r.productId === productId);
    if (!requirement || requirement.requiredSpecialties.length === 0) return 'N/A';
    
    const matchingSpecialty = requirement.requiredSpecialties.find(rs => 
      worker.specialties.includes(rs.specialtyId)
    );
    
    if (matchingSpecialty) {
      const specialty = specialties.find(s => s.id === matchingSpecialty.specialtyId);
      return specialty?.name || 'N/A';
    }
    
    return 'N/A';
  };

  const daysByDate = days.reduce((acc, day) => {
    if (!acc[day.date]) acc[day.date] = [];
    acc[day.date].push(day);
    return acc;
  }, {} as Record<string, ScheduleDay[]>);

  const sortedDates = Object.keys(daysByDate).sort();

  return (
    <div className="print-container bg-white text-black p-8 space-y-6">
      <style jsx>{`
        @media print {
          .print-container {
            margin: 0;
            padding: 20px;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="text-center border-b-4 border-black pb-4 mb-6">
        <h1 className="text-3xl font-bold mb-2">{scheduleName.toUpperCase()}</h1>
        <p className="text-lg">
          Período: {new Date(startDate).toLocaleDateString('pt-PT')} a {new Date(endDate).toLocaleDateString('pt-PT')}
        </p>
      </div>

      {sortedDates.map((dateStr, dateIndex) => {
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('pt-PT', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('pt-PT');
        const dayShifts = daysByDate[dateStr].sort((a, b) => {
          const order = { morning: 1, afternoon: 2, night: 3 };
          return order[a.shift] - order[b.shift];
        });

        return (
          <div key={dateStr} className={dateIndex > 0 ? 'page-break' : ''}>
            <div className="bg-gray-900 text-white p-4 mb-4">
              <h2 className="text-2xl font-bold">
                {dayName.toUpperCase()} - {formattedDate}
              </h2>
            </div>

            <div className="space-y-6">
              {dayShifts.map(shift => {
                const byLine = shift.assignments.reduce((acc, assignment) => {
                  if (!acc[assignment.productionLineId]) acc[assignment.productionLineId] = [];
                  acc[assignment.productionLineId].push(assignment);
                  return acc;
                }, {} as Record<string, typeof shift.assignments>);

                return (
                  <div key={`${dateStr}-${shift.shift}`} className="border-2 border-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 text-white p-3">
                      <h3 className="text-xl font-bold">{shiftLabels[shift.shift]}</h3>
                    </div>
                    
                    {shift.assignments.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 italic">
                        Sem alocações
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {Object.entries(byLine).map(([lineId, assignments]) => {
                          const line = productionLines.find(l => l.id === lineId);
                          const product = products.find(p => p.id === assignments[0]?.productId);

                          return (
                            <div key={lineId} className="border border-gray-300 rounded">
                              <div className="bg-gray-100 p-2 border-b border-gray-300">
                                <div className="font-bold text-lg">{line?.name || 'N/A'}</div>
                                <div className="text-sm text-gray-600">Produto: {product?.name || 'N/A'}</div>
                              </div>
                              
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="border border-gray-300 p-2 text-left w-16">Pos</th>
                                    <th className="border border-gray-300 p-2 text-left w-24">Matrícula</th>
                                    <th className="border border-gray-300 p-2 text-left">Nome</th>
                                    <th className="border border-gray-300 p-2 text-left">Especialidade</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {assignments.sort((a, b) => a.position - b.position).map(assignment => {
                                    const worker = workers.find(w => w.id === assignment.workerId);
                                    const specialtyName = getAssignedSpecialty(
                                      assignment.workerId,
                                      assignment.productionLineId,
                                      assignment.productId
                                    );

                                    return (
                                      <tr key={`${assignment.workerId}-${assignment.position}`}>
                                        <td className="border border-gray-300 p-2 text-center font-mono">
                                          #{assignment.position}
                                        </td>
                                        <td className="border border-gray-300 p-2 font-mono">
                                          {getWorkerEmployeeId(assignment.workerId)}
                                        </td>
                                        <td className="border border-gray-300 p-2 font-medium">
                                          {getWorkerName(assignment.workerId)}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {specialtyName}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-500">
        <p>Documento gerado automaticamente pelo Sistema de Gestão de Escalas</p>
        <p>Data de geração: {new Date().toLocaleString('pt-PT')}</p>
      </div>
    </div>
  );
}
