'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { Specialty } from '@/lib/types';

interface SpecialtyManagerProps {
  specialties: Specialty[];
  onAdd: (name: string, description?: string) => void;
  onDelete: (id: string) => void;
}

export function SpecialtyManager({ specialties, onAdd, onDelete }: SpecialtyManagerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    }
  };

  return (
    <Card className="border-2 hover:border-primary/50 transition-colors">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-500/10">
        <CardTitle className="text-2xl">Postos de Trabalho</CardTitle>
        <CardDescription className="text-base">
          Gerir postos de trabalho dos operadores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specialty-name" className="text-base">Nome do Posto de Trabalho</Label>
              <Input
                id="specialty-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Operador de Máquina CNC"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty-description" className="text-base">Descrição (opcional)</Label>
              <Input
                id="specialty-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Breve descrição"
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Posto de Trabalho
          </Button>
        </form>

        <div className="space-y-3">
          <Label className="text-base">Postos Cadastrados ({specialties.length})</Label>
          {specialties.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">
                Nenhum posto de trabalho cadastrado ainda.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {specialties.map(specialty => (
                <Badge key={specialty.id} variant="secondary" className="px-4 py-2 text-sm">
                  <span>{specialty.name}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(specialty.id)}
                    className="ml-2 hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
