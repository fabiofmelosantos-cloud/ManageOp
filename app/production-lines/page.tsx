'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { ProductionLineForm } from '@/components/production-lines/production-line-form';
import { ProductionLineList } from '@/components/production-lines/production-line-list';
import { ProductionPlanImporter } from '@/components/production-lines/production-plan-importer';
import type { ProductionPlanImport } from '@/lib/excel-utils';
import {
  getProductionLines,
  addProductionLine,
  updateProductionLine,
  deleteProductionLine,
  getProducts,
  addProduct,
  getSpecialties,
  addSpecialty,
  loadProductionLines,
  loadProducts,
  loadSpecialties,
} from '@/lib/storage';
import type { ProductionLine, Product, Specialty } from '@/lib/types';

export default function ProductionLinesPage() {
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductionLine | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadProductionLines(),
          loadProducts(),
          loadSpecialties(),
        ]);
        setLines(getProductionLines());
        setProducts(getProducts());
        setSpecialties(getSpecialties());
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddLine = async (data: Omit<ProductionLine, 'id' | 'createdAt'>) => {
    const newLine = await addProductionLine(data);
    setLines(prev => [...prev, newLine]);
    setIsDialogOpen(false);
  };

  const handleUpdateLine = async (data: Omit<ProductionLine, 'id' | 'createdAt'>) => {
    if (editingLine) {
      const updated = await updateProductionLine(editingLine.id, data);
      if (updated) {
        setLines(prev => prev.map(l => (l.id === updated.id ? updated : l)));
      }
      setIsDialogOpen(false);
      setEditingLine(undefined);
    }
  };

  const handleDeleteLine = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta linha de produção?')) {
      await deleteProductionLine(id);
      setLines(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleEditLine = (line: ProductionLine) => {
    setEditingLine(line);
    setIsDialogOpen(true);
  };

  const handleAddProduct = async (name: string, description?: string) => {
    const newProduct = await addProduct({ name, description });
    setProducts(prev => [...prev, newProduct]);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleImportPlan = async (plans: ProductionPlanImport[]) => {
    for (const plan of plans) {
      let product = products.find(p => p.name.toLowerCase() === plan.productName.toLowerCase());
      if (!product) {
        product = await addProduct({ name: plan.productName });
        setProducts(prev => [...prev, product!]);
      }

      const specialtyIds: string[] = [];
      for (const specName of plan.specialties) {
        let specialty = specialties.find(s => s.name.toLowerCase() === specName.toLowerCase());
        if (!specialty) {
          specialty = await addSpecialty({ name: specName });
          setSpecialties(prev => [...prev, specialty!]);
        }
        specialtyIds.push(specialty.id);
      }

      let line = lines.find(l => l.name.toLowerCase() === plan.lineName.toLowerCase());
      
      const productRequirement = {
        productId: product.id,
        workersNeeded: plan.workersNeeded,
        requiredSpecialties: specialtyIds,
      };

      if (line) {
        const existingReq = line.productRequirements.find(
          r => r.productId === product.id
        );
        
        if (!existingReq) {
          const updated = await updateProductionLine(line.id, {
            ...line,
            productRequirements: [...line.productRequirements, productRequirement],
          });
          if (updated) {
            setLines(prev => prev.map(l => (l.id === updated.id ? updated : l)));
          }
        }
      } else {
        const newLine = await addProductionLine({
          name: plan.lineName,
          productRequirements: [productRequirement],
        });
        setLines(prev => [...prev, newLine]);
      }
    }
    
    await Promise.all([loadProductionLines(), loadProducts(), loadSpecialties()]);
    setLines(getProductionLines());
    setProducts(getProducts());
    setSpecialties(getSpecialties());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">A carregar...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 space-y-4 sm:space-y-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Linhas de Produção</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Gerir linhas de produção, produtos e requisitos
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <ProductionPlanImporter onImport={handleImportPlan} />
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              size="lg"
              className="w-full sm:w-auto min-h-[44px] text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Linha
            </Button>
          </div>
        </div>

        <ProductionLineList
          lines={lines}
          onEdit={handleEditLine}
          onDelete={handleDeleteLine}
        />

        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            if (!open) setEditingLine(undefined);
          }}
        >
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLine ? 'Editar' : 'Adicionar'} Linha de Produção
              </DialogTitle>
              <DialogDescription>
                Configure a linha de produção, produtos fabricados e os requisitos de cada produto.
              </DialogDescription>
            </DialogHeader>
            <ProductionLineForm
              line={editingLine}
              products={products}
              specialties={specialties}
              onSubmit={editingLine ? handleUpdateLine : handleAddLine}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingLine(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
