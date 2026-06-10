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
import type { Product } from '@/lib/types';

interface ProductManagerProps {
  products: Product[];
  onAdd: (name: string, description?: string) => void;
  onDelete: (id: string) => void;
}

export function ProductManager({ products, onAdd, onDelete }: ProductManagerProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <CardDescription>
          Gerir produtos fabricados nas linhas de produção
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do Produto</Label>
              <Input
                id="product-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Componente A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Descrição (opcional)</Label>
              <Input
                id="product-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Breve descrição"
              />
            </div>
          </div>
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </form>

        <div className="space-y-2">
          <Label>Produtos Cadastrados ({products.length})</Label>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum produto cadastrado ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {products.map(product => (
                <Badge key={product.id} variant="secondary" className="px-3 py-2">
                  <span>{product.name}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(product.id)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
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
