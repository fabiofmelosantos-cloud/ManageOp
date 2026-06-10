'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ScheduleDay, ShiftType, Worker, ProductionLine, Product } from '@/lib/types';

interface ScheduleCalendarViewProps {
  days: ScheduleDay[];
  workers: Worker[];
  productionLines: ProductionLine[];
  products: Product[];
}

const shiftLabels: Record<ShiftType, string> = {
  morning: 'M',
  afternoon: 'T',
  night: 'N',
};

const shiftColors: Record<ShiftType, string> = {
  morning: 'bg-amber-500',
  afternoon: 'bg-blue-500',
  night: 'bg-purple-500',
};

export function ScheduleCalendarView({
  days,
  workers,
  productionLines,
  products,
}: ScheduleCalendarViewProps) {
  const getWorkerName = (workerId: string) => {
    return workers.find(w => w.id === workerId)?.name || 'Desconhecido';
  };

  // Agrupar por data
  const daysByDate = days.reduce((acc, day) => {
    if (!acc[day.date]) {
      acc[day.date] = [];
    }
    acc[day.date].push(day);
    return acc;
  }, {} as Record<string, ScheduleDay[]>);

  const dates = Object.keys(daysByDate).sort();

  // Organizar em semanas
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  dates.forEach((date, index) => {
    currentWeek.push(date);
    if (currentWeek.length === 7 || index === dates.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      weekday: date.toLocaleDateString('pt-PT', { weekday: 'short' }),
    };
  };

  return (
    <div className="space-y-6">
      {weeks.map((week, weekIndex) => (
        <Card key={weekIndex}>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {week.map(date => {
                const dayShifts = daysByDate[date];
                const { day, weekday } = formatDateHeader(date);

                return (
                  <div key={date} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-2 text-center border-b">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {weekday}
                      </p>
                      <p className="text-lg font-bold">{day}</p>
                    </div>
                    <div className="p-2 space-y-2 min-h-[120px]">
                      {dayShifts.map(shift => {
                        const workerIds = new Set(shift.assignments.map(a => a.workerId));
                        return (
                          <div key={shift.shift} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${shiftColors[shift.shift]}`}
                              />
                              <span className="text-xs font-medium">
                                {shiftLabels[shift.shift]}
                              </span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {workerIds.size}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
