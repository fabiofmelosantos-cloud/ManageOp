'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Pencil, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProductionLine, Product, Specialty } from '@/lib/types';

interface ProductionLineListProps {
  lines: ProductionLine[];
  products: Product[];
  specialties: Specialty[];
  onEdit: (line: ProductionLine) => void;
  onDelete: (lineId: string) => void;
}

export function ProductionLineList({
  lines,
  products,
  specialties,
  onEdit,
  onDelete,
}: ProductionLineListProps) {
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Desconhecido';
  };

  const getSpecialtyName = (specialtyId: string) => {
    return specialties.find(s => s.id === specialtyId)?.name || 'Desconhecida';
  };

  const toggleCardExpansion = (lineId: string) => {
    setExpandedCards(prev =>
      prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
    );
  };

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
      {lines.map(line => {
        const isExpanded = expandedCards.includes(line.id);
        
        return (
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
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Produtos ({line.requirements.length})
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleCardExpansion(line.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        <span className="text-xs">Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        <span className="text-xs">Ver Detalhes</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {line.requirements.map((req, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {getProductName(req.productId)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {req.workersNeeded} {req.workersNeeded === 1 ? 'operador' : 'operadores'}
                        </Badge>
                      </div>
                      
                      {isExpanded && req.requiredSpecialties.length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Postos:</p>
                          <div className="space-y-1">
                            {req.requiredSpecialties.map((specialty, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between text-xs bg-background rounded px-2 py-1.5"
                              >
                                <span>{getSpecialtyName(specialty.specialtyId)}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {specialty.quantity}x
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
        );
      })}
    </div>
  );
}
