'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Worker, Specialty, ShiftType, SchedulePattern } from '@/lib/types';

interface ImportResult {
  success: Worker[];
  skipped: { row: number; reason: string; data: any }[];
  errors: { row: number; error: string; data: any }[];
}

interface WorkerImporterProps {
  specialties: Specialty[];
  existingWorkers: Worker[];
  onImport: (workers: Omit<Worker, 'id' | 'createdAt'>[]) => void;
}

export function WorkerImporter({ specialties, existingWorkers, onImport }: WorkerImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateShiftType = (shift: string): ShiftType | null => {
    const normalized = shift.toLowerCase().trim();
    if (normalized === 'morning' || normalized === 'manhã' || normalized === 'manha') return 'morning';
    if (normalized === 'afternoon' || normalized === 'tarde') return 'afternoon';
    if (normalized === 'night' || normalized === 'noite') return 'night';
    return null;
  };

  const validateSchedulePattern = (pattern: string): SchedulePattern | null => {
    const normalized = pattern.toLowerCase().trim();
    if (normalized === '5x2' || normalized === '5x2-rotativo') return '5x2';
    if (normalized === '4x2' || normalized === '4x2-rotativo') return '4x2';
    if (normalized === '5x2-fixed' || normalized === '5x2-fixo' || normalized === 'seg-sex') return '5x2-fixed';
    return null;
  };

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detectar delimitador automaticamente
    const delimiter = detectDelimiter(text);
    console.log('[v0] Delimitador detectado:', delimiter);

    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      const row: any = { _rowNumber: i + 1 };
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const processImport = (rows: any[]): ImportResult => {
    const result: ImportResult = {
      success: [],
      skipped: [],
      errors: [],
    };

    rows.forEach(row => {
      try {
        const name = row.nome || row.name || row.trabalhador || row.operador || '';
        const employeeId = row.matricula || row.id || row.employee_id || row.employeeid || '';
        
        // Validação de campos obrigatórios
        if (!name || !employeeId) {
          result.errors.push({
            row: row._rowNumber,
            error: 'Nome e matrícula são obrigatórios',
            data: row,
          });
          return;
        }

        // Verificar se já existe trabalhador com mesma matrícula
        const existingWorker = existingWorkers.find(
          w => w.employeeId.toLowerCase() === employeeId.toLowerCase()
        );

        if (existingWorker) {
          result.skipped.push({
            row: row._rowNumber,
            reason: `Trabalhador com matrícula ${employeeId} já existe`,
            data: row,
          });
          return;
        }

        const specialtiesInput = row.especialidades || row.specialties || row.especialidade || '';
        const specialtyNames = specialtiesInput
          .split(/[;|]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s);

        const workerSpecialties: string[] = [];
        specialtyNames.forEach((name: string) => {
          const specialty = specialties.find(
            s => s.name.toLowerCase() === name.toLowerCase()
          );
          if (specialty) {
            workerSpecialties.push(specialty.id);
          }
        });

        const shiftsInput = row.turnos || row.shifts || row.turno || row.shift || '';
        const shiftNames = shiftsInput
          .split(/[;|]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s);

        const availableShifts: ShiftType[] = [];
        shiftNames.forEach((shiftName: string) => {
          const shift = validateShiftType(shiftName);
          if (shift && !availableShifts.includes(shift)) {
            availableShifts.push(shift);
          }
        });

        // Se não especificou turnos, assume todos
        if (availableShifts.length === 0) {
          availableShifts.push('morning', 'afternoon', 'night');
        }

        // Parse padrão de escala
        const patternInput = row.escala || row.pattern || row.padrao || '5x2';
        const schedulePattern = validateSchedulePattern(patternInput) || '5x2';

        // Criar novo trabalhador
        const newWorker: Omit<Worker, 'id' | 'createdAt'> = {
          name,
          employeeId,
          specialties: workerSpecialties,
          availableShifts,
          schedulePattern,
          email: row.email || undefined,
          phone: row.telefone || row.phone || row.telemovel || row.contacto || undefined,
        };

        result.success.push(newWorker as Worker);
      } catch (error) {
        result.errors.push({
          row: row._rowNumber,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          data: row,
        });
      }
    });

    return result;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const result = processImport(rows);
      setImportResult(result);
    } catch (error) {
      alert('Erro ao processar arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.success.length > 0) {
      onImport(importResult.success);
      setIsOpen(false);
      setImportResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'nome;matricula;email;telefone;especialidades;turnos;escala',
      'João Silva;12345;joao@email.com;123456789;Operador|Manutenção;manhã|tarde;5x2',
      'Maria Santos;67890;maria@email.com;987654321;Supervisor;manhã|tarde|noite;5x2-fixo',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_trabalhadores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Importar Trabalhadores
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Trabalhadores</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV com os dados dos trabalhadores
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {isProcessing ? 'Processando...' : 'Arraste um arquivo CSV aqui'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">ou</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Formato do arquivo CSV:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Colunas obrigatórias: nome, matricula</li>
                  <li>Colunas opcionais: email, telefone, especialidades, turnos, escala</li>
                  <li>Aceita vírgula (,), ponto e vírgula (;), tab ou pipe (|) como separador</li>
                  <li>Especialidades e turnos separados por ponto e vírgula ou pipe (;|)</li>
                  <li>Turnos: manhã/morning, tarde/afternoon, noite/night</li>
                  <li>Escala: 5x2, 4x2, 5x2-fixo/seg-sex</li>
                  <li>Trabalhadores com matrícula duplicada serão ignorados</li>
                </ul>
                <Button variant="link" onClick={downloadTemplate} className="p-0 h-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar arquivo modelo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {importResult.success.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.success.length} trabalhadores</strong> prontos para importar
                  </AlertDescription>
                </Alert>
              )}

              {importResult.skipped.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.skipped.length} trabalhadores</strong> ignorados (já existem)
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Ver detalhes</summary>
                      <ul className="text-xs mt-2 space-y-1">
                        {importResult.skipped.map((item, idx) => (
                          <li key={idx}>
                            Linha {item.row}: {item.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.errors.length} erros</strong> encontrados
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Ver detalhes</summary>
                      <ul className="text-xs mt-2 space-y-1">
                        {importResult.errors.map((item, idx) => (
                          <li key={idx}>
                            Linha {item.row}: {item.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.success.length > 0 && (
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-2">Trabalhadores a serem importados:</h4>
                  <ul className="text-sm space-y-1">
                    {importResult.success.map((worker, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>
                          {worker.name} ({worker.employeeId}) - {worker.schedulePattern}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importResult ? (
              <>
                <Button variant="outline" onClick={() => setImportResult(null)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={importResult.success.length === 0}
                >
                  Importar {importResult.success.length} Trabalhadores
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
