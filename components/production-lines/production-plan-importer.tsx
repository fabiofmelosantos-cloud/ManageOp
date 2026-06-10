'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  parseProductionPlanCSV,
  exportProductionPlanTemplate,
  type ProductionPlanImport,
} from '@/lib/excel-utils';

interface ProductionPlanImporterProps {
  onImport: (plans: ProductionPlanImport[]) => void;
}

export function ProductionPlanImporter({ onImport }: ProductionPlanImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ProductionPlanImport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const data = parseProductionPlanCSV(text);
        
        if (data.length === 0) {
          setError('Nenhum dado válido encontrado no arquivo.');
          return;
        }
        
        setParsedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar o arquivo');
        setParsedData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsedData.length > 0) {
      onImport(parsedData);
      setIsOpen(false);
      setParsedData([]);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setParsedData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Plano de Produção</DialogTitle>
          <DialogDescription>
            Importe um arquivo CSV com as linhas, produtos e requisitos de produção
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportProductionPlanTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O arquivo CSV deve conter as colunas: Linha, Produto, Trabalhadores,
              Especialidade1, Especialidade2, etc.
            </AlertDescription>
          </Alert>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                file:cursor-pointer cursor-pointer"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {parsedData.length} item(ns) encontrado(s) no arquivo
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                {parsedData.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-md p-3 space-y-2 bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.lineName}</p>
                        <p className="text-sm text-muted-foreground">{item.productName}</p>
                      </div>
                      <Badge variant="secondary">{item.workersNeeded} trabalhadores</Badge>
                    </div>
                    {item.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.specialties.map((spec, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleImport}>Importar Dados</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
