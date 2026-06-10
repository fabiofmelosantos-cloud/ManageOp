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
import { Plus, Loader2 } from 'lucide-react';
import { WorkerForm } from '@/components/workers/worker-form';
import { WorkerList } from '@/components/workers/worker-list';
import { SpecialtyManager } from '@/components/specialties/specialty-manager';
import { WorkerImporter } from '@/components/workers/worker-importer';
import {
  getWorkers,
  addWorker,
  updateWorker,
  deleteWorker,
  getSpecialties,
  addSpecialty,
  deleteSpecialty,
  loadWorkers,
  loadSpecialties,
} from '@/lib/storage';
import type { Worker, Specialty } from '@/lib/types';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await Promise.all([loadWorkers(), loadSpecialties()]);
        setWorkers(getWorkers());
        setSpecialties(getSpecialties());
      } catch (error) {
        console.error('[v0] Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddWorker = async (data: Omit<Worker, 'id' | 'createdAt'>) => {
    try {
      const newWorker = await addWorker(data);
      setWorkers(prev => [...prev, newWorker]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('[v0] Erro ao adicionar trabalhador:', error);
      alert('Erro ao adicionar trabalhador. Por favor, tente novamente.');
    }
  };

  const handleImportWorkers = async (workersData: Omit<Worker, 'id' | 'createdAt'>[]) => {
    try {
      console.log('[v0] Importando', workersData.length, 'trabalhadores...');
      
      let successCount = 0;
      for (let i = 0; i < workersData.length; i++) {
        try {
          await addWorker(workersData[i]);
          successCount++;
          console.log(`[v0] Importado ${successCount}/${workersData.length}`);
        } catch (error) {
          console.error(`[v0] Erro ao importar trabalhador ${i + 1}:`, error);
        }
      }
      
      console.log('[v0] Importação concluída:', successCount, 'de', workersData.length, 'trabalhadores');
      
      // Recarregar lista completa do servidor
      await loadWorkers();
      setWorkers(getWorkers());
      
      if (successCount < workersData.length) {
        alert(`Importados ${successCount} de ${workersData.length} trabalhadores. Alguns falharam.`);
      }
    } catch (error) {
      console.error('[v0] Erro ao importar trabalhadores:', error);
      alert('Erro ao importar trabalhadores. Por favor, tente novamente.');
    }
  };

  const handleUpdateWorker = async (data: Omit<Worker, 'id' | 'createdAt'>) => {
    if (editingWorker) {
      try {
        const updated = await updateWorker(editingWorker.id, data);
        if (updated) {
          setWorkers(prev => prev.map(w => (w.id === updated.id ? updated : w)));
        }
        setIsDialogOpen(false);
        setEditingWorker(undefined);
      } catch (error) {
        console.error('[v0] Erro ao atualizar trabalhador:', error);
        alert('Erro ao atualizar trabalhador. Por favor, tente novamente.');
      }
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este trabalhador?')) {
      try {
        await deleteWorker(id);
        setWorkers(prev => prev.filter(w => w.id !== id));
      } catch (error) {
        console.error('[v0] Erro ao excluir trabalhador:', error);
        alert('Erro ao excluir trabalhador. Por favor, tente novamente.');
      }
    }
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setIsDialogOpen(true);
  };

  const handleAddSpecialty = async (name: string, description?: string) => {
    try {
      const newSpecialty = await addSpecialty({ name, description });
      setSpecialties(prev => [...prev, newSpecialty]);
    } catch (error) {
      console.error('[v0] Erro ao adicionar especialidade:', error);
      alert('Erro ao adicionar especialidade. Por favor, tente novamente.');
    }
  };

  const handleDeleteSpecialty = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta especialidade?')) {
      try {
        await deleteSpecialty(id);
        setSpecialties(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('[v0] Erro ao excluir especialidade:', error);
        alert('Erro ao excluir especialidade. Por favor, tente novamente.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando trabalhadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 space-y-4 sm:space-y-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Gestão de Trabalhadores</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Cadastre e gerir trabalhadores e suas especialidades
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <WorkerImporter
              specialties={specialties}
              existingWorkers={workers}
              onImport={handleImportWorkers}
            />
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              size="lg"
              className="w-full sm:w-auto min-h-[44px] text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Trabalhador
            </Button>
          </div>
        </div>

        <SpecialtyManager
          specialties={specialties}
          onAdd={handleAddSpecialty}
          onDelete={handleDeleteSpecialty}
        />

        <WorkerList
          workers={workers}
          specialties={specialties}
          onEdit={handleEditWorker}
          onDelete={handleDeleteWorker}
        />

        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            if (!open) setEditingWorker(undefined);
          }}
        >
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorker ? 'Editar' : 'Adicionar'} Trabalhador
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do trabalhador, incluindo especialidades e disponibilidade
                de turnos.
              </DialogDescription>
            </DialogHeader>
            <WorkerForm
              worker={editingWorker}
              specialties={specialties}
              onSubmit={editingWorker ? handleUpdateWorker : handleAddWorker}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingWorker(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
