import type {
  Worker,
  ProductionLine,
  ShiftType,
  ScheduleDay,
  ShiftAssignment,
  ScheduleGenerationConfig,
  SchedulePattern,
  ScheduleConflict,
  ScheduleValidationResult,
  WeeklyProductionPlan,
  Specialty,
} from './types';

interface WorkerState {
  worker: Worker;
  workDaysCount: number;
  lastShiftDate: string | null;
  cycleDay: number;
  currentShift: ShiftType | null; // turno atual do trabalhador
  weeksInCurrentShift: number; // semanas no turno atual
  shiftsWorkedToday: Set<string>; // turnos trabalhados no dia atual (para evitar múltiplos turnos)
}

function getWorkDaysInPattern(pattern: SchedulePattern): number {
  if (pattern === '5x2-fixed') return 5;
  return pattern === '5x2' ? 5 : 4;
}

function getRestDaysInPattern(pattern: SchedulePattern): number {
  return 2;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Domingo = 0, Sábado = 6
}

function shouldWorkerWork(workerState: WorkerState, currentDate: Date): boolean {
  if (workerState.worker.schedulePattern === '5x2-fixed') {
    return !isWeekend(currentDate);
  }
  
  const workDays = getWorkDaysInPattern(workerState.worker.schedulePattern);
  const restDays = getRestDaysInPattern(workerState.worker.schedulePattern);
  const cycleDuration = workDays + restDays;
  
  const dayInCycle = workerState.cycleDay % cycleDuration;
  return dayInCycle < workDays;
}

function getNextShift(currentShift: ShiftType): ShiftType {
  const shiftRotation: ShiftType[] = ['morning', 'afternoon', 'night'];
  const currentIndex = shiftRotation.indexOf(currentShift);
  return shiftRotation[(currentIndex + 1) % shiftRotation.length];
}

function canWorkerDoShift(worker: Worker, shift: ShiftType, workerState: WorkerState): boolean {
  // Se o trabalhador não é rotativo, verifica se pode fazer esse turno
  if (!worker.availableShifts.includes('rotativo')) {
    return worker.availableShifts.includes(shift);
  }
  
  // Para trabalhadores rotativos, mantém no turno atual
  return workerState.currentShift === shift;
}

function hasRequiredSpecialties(worker: Worker, requiredSpecialties: string[]): boolean {
  if (requiredSpecialties.length === 0) return true;
  return requiredSpecialties.some(specialty => worker.specialties.includes(specialty));
}

function updateWorkerShiftRotation(state: WorkerState, currentDate: Date): void {
  const worker = state.worker;
  
  // Apenas para trabalhadores rotativos
  if (!worker.availableShifts.includes('rotativo')) return;
  
  // Verifica se completou uma semana (7 dias)
  const dayOfWeek = currentDate.getDay();
  if (dayOfWeek === 0) { // Domingo - fim da semana
    state.weeksInCurrentShift++;
    
    if (state.weeksInCurrentShift >= 2) {
      state.currentShift = getNextShift(state.currentShift!);
      state.weeksInCurrentShift = 0;
    }
  }
}

export function generateSchedule(
  config: ScheduleGenerationConfig,
  workers: Worker[],
  productionLines: ProductionLine[],
  productionPlan?: WeeklyProductionPlan,
  specialties?: Specialty[]
): ScheduleDay[] {
  console.log('[v0] Iniciando geração de escala');
  console.log('[v0] Trabalhadores disponíveis:', workers.length);
  console.log('[v0] Linhas de produção:', productionLines.length);
  console.log('[v0] Plano de produção:', productionPlan ? 'Sim' : 'Não');
  console.log('[v0] Especialidades disponíveis:', specialties?.length || 0);
  
  workers.forEach(w => {
    console.log(`[v0] Trabalhador ${w.name}:`, {
      specialties: w.specialties,
      shifts: w.availableShifts,
      pattern: w.schedulePattern
    });
  });
  
  const days: ScheduleDay[] = [];
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const workerStates: Map<string, WorkerState> = new Map();
  workers.forEach(worker => {
    // Determinar turno inicial para rotativos
    let initialShift: ShiftType = 'morning';
    if (worker.availableShifts.includes('rotativo')) {
      initialShift = 'morning'; // Começa sempre na manhã
    } else {
      initialShift = worker.availableShifts[0] || 'morning';
    }
    
    workerStates.set(worker.id, {
      worker,
      workDaysCount: 0,
      lastShiftDate: null,
      cycleDay: 0,
      currentShift: initialShift,
      weeksInCurrentShift: 0,
      shiftsWorkedToday: new Set(),
    });
  });

  // Gerar cada dia da escala
  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    const dateString = currentDate.toISOString().split('T')[0];

    workerStates.forEach(state => {
      updateWorkerShiftRotation(state, currentDate);
      state.shiftsWorkedToday = new Set();
    });

    for (const shift of config.shifts) {
      const assignments: ShiftAssignment[] = [];

      let activeLinesForShift: ProductionLine[] = productionLines.filter(line => line.isActive);
      
      if (productionPlan) {
        const dayPlan = productionPlan.days.find(d => d.date === dateString);
        if (dayPlan) {
          const shiftPlan = dayPlan.shifts.find(s => s.shift === shift);
          if (shiftPlan && shiftPlan.entries.length > 0) {
            const activePlanLineIds = new Set(
              shiftPlan.entries.filter(e => e.productId).map(e => e.lineId)
            );
            activeLinesForShift = activeLinesForShift.filter(line => 
              activePlanLineIds.has(line.id)
            );
          }
        }
      }

      // Para cada linha de produção ativa
      for (const line of activeLinesForShift) {
        let lineRequirements = line.requirements;
        
        if (productionPlan) {
          const dayPlan = productionPlan.days.find(d => d.date === dateString);
          if (dayPlan) {
            const shiftPlan = dayPlan.shifts.find(s => s.shift === shift);
            if (shiftPlan) {
              const lineEntry = shiftPlan.entries.find(e => e.lineId === line.id);
              if (lineEntry && lineEntry.productId) {
                lineRequirements = line.requirements.filter(
                  req => req.productId === lineEntry.productId
                );
              }
            }
          }
        }
        
        console.log(`[v0] Linha ${line.name}, Turno ${shift}:`, {
          requirements: lineRequirements.length,
          specialties: lineRequirements.flatMap(r => r.requiredSpecialties.map(s => s.specialtyId))
        });
        
        // Para cada produto na linha
        for (const requirement of lineRequirements) {
          const specialtiesNeeded = requirement.requiredSpecialties;
          
          for (const specReq of specialtiesNeeded) {
            const specialtyName = specialties?.find(s => s.id === specReq.specialtyId)?.name || 'Desconhecida';
            
            const configuredPositions = specReq.positions || [];
            const positionsToAllocate = configuredPositions.length > 0 
              ? [...configuredPositions].sort((a, b) => a.order - b.order) // Criar cópia e ordenar por order
              : Array.from({ length: specReq.quantity }, (_, i) => ({
                  order: i + 1,
                  name: specialtyName
                }));
            
            console.log(`[v0] Especialidade ${specialtyName} (ID: ${specReq.specialtyId}), Postos ordenados:`, positionsToAllocate.map(p => `${p.order}. ${p.name}`));
            
            // Alocar trabalhadores para cada posto
            for (const position of positionsToAllocate) {
              const availableWorkers: Worker[] = [];

              workerStates.forEach(state => {
                const { worker } = state;
                
                // 1. Verifica se deve trabalhar hoje (padrão de escala)
                if (!shouldWorkerWork(state, currentDate)) return;
                
                // 2. Verifica se já trabalhou hoje (evitar duplo turno)
                if (state.shiftsWorkedToday.has(dateString)) return;
                
                // 3. Verifica se pode fazer este turno (com lógica de rotação)
                if (!canWorkerDoShift(worker, shift, state)) return;
                
                // 4. Verifica se tem a especialidade necessária
                if (!worker.specialties.includes(specReq.specialtyId)) return;
                
                // 5. Verifica se já foi alocado neste turno
                const alreadyAssigned = assignments.some(a => a.workerId === worker.id);
                if (alreadyAssigned) return;
                
                availableWorkers.push(worker);
              });

              if (availableWorkers.length > 0) {
                const worker = availableWorkers[0];
                
                assignments.push({
                  workerId: worker.id,
                  productionLineId: line.id,
                  productId: requirement.productId,
                  position: position.order,
                  positionName: position.name, // Nome do posto configurado (ex: "Amassador")
                });

                // Atualizar estado do trabalhador
                const state = workerStates.get(worker.id)!;
                state.workDaysCount++;
                state.lastShiftDate = dateString;
                state.shiftsWorkedToday.add(dateString);
                
                console.log(`[v0] ✓ Alocado: ${worker.name} → ${line.name} → ${position.name}`);
              } else {
                console.log(`[v0] ✗ Linha ${line.name}, Posto "${position.name}": Nenhum trabalhador disponível com especialidade ${specialtyName} (ID: ${specReq.specialtyId})`);
              }
            }
          }
        }
      }
      
      days.push({
        date: dateString,
        shift,
        assignments,
      });
    }

    // Incrementar o dia no ciclo de cada trabalhador
    workerStates.forEach(state => {
      state.cycleDay++;
    });
  }

  const totalAllocations = days.reduce((sum, d) => sum + d.assignments.length, 0);
  console.log('[v0] Geração concluída. Total de alocações:', totalAllocations);
  
  if (totalAllocations === 0) {
    console.log('[v0] ATENÇÃO: Nenhuma alocação foi criada! Verifique se:');
    console.log('[v0] 1. Os trabalhadores têm especialidades cadastradas');
    console.log('[v0] 2. As especialidades dos trabalhadores correspondem às requeridas pelas linhas');
    console.log('[v0] 3. Os trabalhadores podem fazer os turnos solicitados');
  }
  
  return days;
}

export function getUnallocatedWorkers(
  schedule: ScheduleDay[],
  allWorkers: Worker[]
): Worker[] {
  const allocatedWorkerIds = new Set<string>();
  
  schedule.forEach(day => {
    day.assignments.forEach(assignment => {
      allocatedWorkerIds.add(assignment.workerId);
    });
  });
  
  return allWorkers.filter(worker => !allocatedWorkerIds.has(worker.id));
}

export function detectScheduleConflicts(
  schedule: ScheduleDay[],
  workers: Worker[],
  productionLines: ProductionLine[]
): ScheduleValidationResult {
  const conflicts: ScheduleConflict[] = [];
  const warnings: ScheduleConflict[] = [];

  // Agrupar por data
  const daysByDate = schedule.reduce((acc, day) => {
    if (!acc[day.date]) {
      acc[day.date] = [];
    }
    acc[day.date].push(day);
    return acc;
  }, {} as Record<string, ScheduleDay[]>);

  // Verificar cada dia
  Object.entries(daysByDate).forEach(([date, dayShifts]) => {
    // Verificar múltiplos turnos para o mesmo trabalhador no mesmo dia
    const workersPerDay = new Map<string, ShiftType[]>();
    
    dayShifts.forEach(day => {
      day.assignments.forEach(assignment => {
        const shifts = workersPerDay.get(assignment.workerId) || [];
        shifts.push(day.shift);
        workersPerDay.set(assignment.workerId, shifts);
      });
    });

    workersPerDay.forEach((shifts, workerId) => {
      if (shifts.length > 1) {
        const worker = workers.find(w => w.id === workerId);
        conflicts.push({
          type: 'multiple_shifts_same_day',
          severity: 'error',
          date,
          workerId,
          workerName: worker?.name || 'Desconhecido',
          description: `Trabalhador alocado em ${shifts.length} turnos no mesmo dia`,
        });
      }
    });

    // Verificar posições duplicadas (dois trabalhadores na mesma posição)
    dayShifts.forEach(day => {
      const positionMap = new Map<string, ShiftAssignment[]>();
      
      day.assignments.forEach(assignment => {
        const key = `${assignment.productionLineId}-${assignment.productId}-${assignment.position}`;
        const existing = positionMap.get(key) || [];
        existing.push(assignment);
        positionMap.set(key, existing);
      });

      positionMap.forEach((assignments, key) => {
        if (assignments.length > 1) {
          const line = productionLines.find(l => l.id === assignments[0].productionLineId);
          conflicts.push({
            type: 'duplicate_position',
            severity: 'error',
            date,
            shift: day.shift,
            lineId: assignments[0].productionLineId,
            lineName: line?.name || 'Desconhecida',
            description: `${assignments.length} trabalhadores alocados na mesma posição`,
          });
        }
      });
    });
  });

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings,
  };
}

export function validateScheduleGeneration(
  workers: Worker[],
  productionLines: ProductionLine[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (workers.length === 0) {
    errors.push('Nenhum trabalhador cadastrado');
  }

  if (productionLines.length === 0) {
    errors.push('Nenhuma linha de produção cadastrada');
  }

  const activeLines = productionLines.filter(line => line.isActive);
  if (activeLines.length === 0) {
    errors.push('Nenhuma linha de produção ativa');
  }

  // Verificar se há trabalhadores suficientes para cada turno
  const shifts: ShiftType[] = ['morning', 'afternoon', 'night'];
  shifts.forEach(shift => {
    const workersForShift = workers.filter(w => w.availableShifts.includes(shift));
    if (workersForShift.length === 0) {
      errors.push(`Nenhum trabalhador disponível para o turno ${shift}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
