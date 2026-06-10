'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Package } from 'lucide-react';
import type { LineProductionStats } from '@/lib/types';

interface ProductionAnalyticsProps {
  stats: LineProductionStats;
}

export function ProductionAnalytics({ stats }: ProductionAnalyticsProps) {
  const lastSevenDays = stats.dailyProduction.slice(-7);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Produção Semanal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.weeklyTotal.toFixed(0)} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Eficiência Média
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.averageEfficiency >= 90 ? 'text-green-600' : stats.averageEfficiency >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stats.averageEfficiency.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Tempo Parado Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalDowntime} min</p>
            <p className="text-xs text-muted-foreground">
              {(stats.totalDowntime / 60).toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Desperdício Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.totalWaste.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produção Diária (Últimos 7 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lastSevenDays.map((day) => {
              const maxQuantity = Math.max(...lastSevenDays.map(d => d.quantity));
              const barWidth = maxQuantity > 0 ? (day.quantity / maxQuantity) * 100 : 0;

              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {new Date(day.date).toLocaleDateString('pt-PT', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </span>
                    <span className="text-muted-foreground">{day.quantity.toFixed(0)} kg</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all flex items-center justify-end px-2"
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="text-xs font-medium text-primary-foreground">
                        {day.efficiency.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Parado: {day.downtime}min</span>
                    <span className="text-red-600">Desperdício: {day.waste.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Eficiência vs Tempo Parado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around gap-2">
            {lastSevenDays.map((day) => {
              const efficiencyHeight = (day.efficiency / 100) * 100;
              const downtimeHeight = Math.min((day.downtime / 60) * 20, 100); // escala visual

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex gap-1 items-end h-48 w-full">
                    <div
                      className="flex-1 bg-green-500 rounded-t transition-all"
                      style={{ height: `${efficiencyHeight}%` }}
                      title={`Eficiência: ${day.efficiency.toFixed(1)}%`}
                    />
                    <div
                      className="flex-1 bg-red-500 rounded-t transition-all"
                      style={{ height: `${downtimeHeight}%` }}
                      title={`Tempo parado: ${day.downtime}min`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-sm">Eficiência</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-sm">Tempo Parado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
