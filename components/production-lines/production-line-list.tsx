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
import { Pencil, Trash2, Package } from 'lucide-react';
import type { ProductionLine } from '@/lib/types';

interface ProductionLineListProps {
  lines: ProductionLine[];
  onEdit: (line: ProductionLine) => void;
  onDelete: (lineId: string) => void;
}

export function ProductionLineList({
  lines,
  onEdit,
  onDelete,
}: ProductionLineListProps) {

  if (lines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhuma linha de produção cadastrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {lines.map(line => (
          <Card key={line.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-xl">{line.name}</CardTitle>
                  {line.description && (
                    <CardDescription className="text-sm">{line.description}</CardDescription>
                  )}
                </div>
                <Badge variant={line.isActive ? 'default' : 'secondary'}>
                  {line.isActive ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(line)} className="flex-1">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(line.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
