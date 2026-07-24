"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import type { ProductionLine, Product, WeeklyProductionPlan, ProductionPlanEntry, ShiftType } from "@/lib/types"

interface WeeklyPlanGridProps {
  plan: WeeklyProductionPlan
  productionLines: ProductionLine[]
  products: Product[]
  onUpdate?: (plan: WeeklyProductionPlan) => void // Tornar onUpdate opcional
  readOnly?: boolean // Adicionar prop readOnly
  shiftFilter?: ShiftType | "all"
  dayFilter?: number | "all"
  onDayClick?: (dayIndex: number) => void
}

export function WeeklyPlanGrid({
  plan,
  productionLines,
  products,
  onUpdate,
  readOnly = false,
  shiftFilter,
  dayFilter,
  onDayClick,
}: WeeklyPlanGridProps) {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())
  const validDays = useMemo(() => plan.days || [], [plan.days])



  const toggleCell = useCallback(
    (lineId: string, dayIndex: number, shift: ShiftType) => {
      if (readOnly) return

      const key = `${lineId}-${dayIndex}-${shift}`
      setExpandedCells((prev) => {
        const newExpanded = new Set(prev)
        if (newExpanded.has(key)) {
          newExpanded.delete(key)
        } else {
          newExpanded.add(key)
        }
        return newExpanded
      })
    },
    [readOnly],
  )

  const getEntry = useCallback(
    (dayIndex: number, shift: ShiftType, lineId: string): ProductionPlanEntry | null => {
      const shiftPlan = validDays[dayIndex]?.shifts.find((s) => s.shift === shift)
      return shiftPlan?.entries.find((e) => e.lineId === lineId) || null
    },
    [validDays],
  )

  // Calcular o total acumulado de produção para um produto numa linha até um determinado dia/turno
  const getAccumulatedTotal = useCallback(
    (lineId: string, productId: string | null, upToDayIndex: number, shift: ShiftType): number => {
      if (!productId) return 0
      
      let total = 0
      const shifts: ShiftType[] = ["morning", "afternoon", "night"]
      const currentShiftIndex = shifts.indexOf(shift)
      
      for (let dayIdx = 0; dayIdx <= upToDayIndex; dayIdx++) {
        const day = validDays[dayIdx]
        if (!day) continue
        
        for (let shiftIdx = 0; shiftIdx < shifts.length; shiftIdx++) {
          // No último dia, só contar até ao turno atual (inclusive)
          if (dayIdx === upToDayIndex && shiftIdx > currentShiftIndex) break
          
          const shiftPlan = day.shifts.find((s) => s.shift === shifts[shiftIdx])
          const entry = shiftPlan?.entries.find((e) => e.lineId === lineId && e.productId === productId)
          if (entry && entry.targetQuantity > 0) {
            total += entry.targetQuantity
          }
        }
      }
      
      return total
    },
    [validDays],
  )

  // Calcular o total da semana para um produto numa linha
  const getWeeklyTotal = useCallback(
    (lineId: string, productId: string | null): number => {
      if (!productId) return 0
      
      let total = 0
      const shifts: ShiftType[] = ["morning", "afternoon", "night"]
      
      for (const day of validDays) {
        for (const shift of shifts) {
          const shiftPlan = day.shifts.find((s) => s.shift === shift)
          const entry = shiftPlan?.entries.find((e) => e.lineId === lineId && e.productId === productId)
          if (entry && entry.targetQuantity > 0) {
            total += entry.targetQuantity
          }
        }
      }
      
      return total
    },
    [validDays],
  )

  const updateEntry = useCallback(
    (dayIndex: number, shift: ShiftType, lineId: string, updates: Partial<ProductionPlanEntry>) => {
      if (readOnly) return

      const newPlan = { ...plan, days: [...validDays] }
      const day = newPlan.days[dayIndex]

      if (!day) return

      let shiftPlan = day.shifts.find((s) => s.shift === shift)
      if (!shiftPlan) {
        shiftPlan = { shift, entries: [] }
        day.shifts.push(shiftPlan)
      }

      const entryIndex = shiftPlan.entries.findIndex((e) => e.lineId === lineId)

      if (entryIndex === -1) {
        shiftPlan.entries.push({
          lineId,
          productId: null,
          targetQuantity: 0,
          lineCapacity: 0,
          expectedPallets: 0,
          requestedKg: 0,
          kgPerHour: 0,
          ...updates,
        })
      } else {
        shiftPlan.entries[entryIndex] = { ...shiftPlan.entries[entryIndex], ...updates }
      }

      if (updates.requestedKg && updates.kgPerHour && dayIndex === 0) {
        autoFillRemainingDays(newPlan, shift, lineId, updates.productId!, updates.requestedKg, updates.kgPerHour)
      }

      if (onUpdate) {
        onUpdate(newPlan)
      }
    },
    [plan, validDays, onUpdate, readOnly],
  )

  const autoFillRemainingDays = (
    plan: WeeklyProductionPlan,
    shift: ShiftType,
    lineId: string,
    productId: string,
    requestedKg: number,
    kgPerHour: number,
  ) => {
    const hoursPerShift = 8 // Assumindo 8 horas por turno
    let remainingKg = requestedKg

    for (let dayIndex = 0; dayIndex < plan.days.length && remainingKg > 0; dayIndex++) {
      const day = plan.days[dayIndex]
      let shiftPlan = day.shifts.find((s) => s.shift === shift)

      if (!shiftPlan) {
        shiftPlan = { shift, entries: [] }
        day.shifts.push(shiftPlan)
      }

      const entryIndex = shiftPlan.entries.findIndex((e) => e.lineId === lineId)
      const dailyProduction = Math.min(kgPerHour * hoursPerShift, remainingKg)
      const expectedPallets = Math.ceil(dailyProduction / 1000) // Assumindo 1 palete = 1000kg

      if (entryIndex === -1) {
        shiftPlan.entries.push({
          lineId,
          productId,
          targetQuantity: dailyProduction,
          lineCapacity: kgPerHour,
          expectedPallets,
          requestedKg: dayIndex === 0 ? requestedKg : 0,
          kgPerHour: dayIndex === 0 ? kgPerHour : 0,
        })
      } else {
        shiftPlan.entries[entryIndex] = {
          ...shiftPlan.entries[entryIndex],
          productId,
          targetQuantity: dailyProduction,
          lineCapacity: kgPerHour,
          expectedPallets,
          requestedKg: dayIndex === 0 ? requestedKg : 0,
          kgPerHour: dayIndex === 0 ? kgPerHour : 0,
        }
      }

      remainingKg -= dailyProduction
    }
  }

  const getEligibleProducts = useCallback(
    (lineId: string): Product[] => {
      const line = productionLines.find((l) => l.id === lineId)
      if (!line) return []

      const eligibleProductIds = new Set(line.requirements.map((r) => r.productId))
      return products.filter((product) => eligibleProductIds.has(product.id))
    },
    [productionLines, products],
  )

  const removeEntry = useCallback(
    (dayIndex: number, shift: ShiftType, lineId: string) => {
      if (readOnly) return

      if (!confirm("Tem certeza que deseja remover a produção desta linha?")) return

      const newPlan = { ...plan, days: [...validDays] }
      const day = newPlan.days[dayIndex]

      if (!day) return

      const shiftPlan = day.shifts.find((s) => s.shift === shift)
      if (shiftPlan) {
        shiftPlan.entries = shiftPlan.entries.filter((e) => e.lineId !== lineId)
      }

      if (onUpdate) {
        onUpdate(newPlan)
      }
    },
    [plan, validDays, onUpdate, readOnly],
  )

  const visibleShifts = useMemo(() => ["morning", "afternoon", "night"] as ShiftType[], [])

  const shiftsToShow: ShiftType[] =
    shiftFilter && shiftFilter !== "all" ? [shiftFilter] : (["morning", "afternoon", "night"] as ShiftType[])

  const displayDays =
    dayFilter === "all" || dayFilter === undefined ? validDays : [validDays[dayFilter]].filter(Boolean)

  const WEEKDAYS = ["Dia 1", "Dia 2", "Dia 3", "Dia 4", "Dia 5", "Dia 6", "Dia 7"]

  const SHIFT_NAMES: Record<ShiftType, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    night: "Noite",
  }

  const getActiveLinesForDays = (days: typeof displayDays, shift: ShiftType) => {
    // Em modo edição, mostrar todas as linhas passadas (já filtradas pelo pai)
    if (!readOnly) {
      return productionLines
    }
    // Em modo visualização (readOnly), mostrar apenas linhas com produção configurada
    return productionLines.filter((line) => {
      return days.some((day) => {
        const actualDayIndex = validDays.indexOf(day)
        const entry = getEntry(actualDayIndex, shift, line.id)
        return entry && entry.productId && entry.targetQuantity > 0
      })
    })
  }

  if (validDays.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Este plano não possui dias configurados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="min-w-[800px]">
        {/* Desktop: Week header com dias clicáveis */}
        <div className="hidden sm:grid sm:grid-cols-[200px_repeat(7,1fr)] gap-2 mb-4">
          <div className="font-semibold p-3 bg-muted rounded-lg">Linha</div>
          {validDays.map((day, idx) => {
            const dayDate = new Date(day.date)
            const dayName = dayDate.toLocaleDateString("pt-PT", { weekday: "long" })
            const isSelected = dayFilter === idx
            return (
              <button
                key={day.date}
                onClick={() => onDayClick?.(idx)}
                className={`font-semibold p-3 rounded-lg text-center transition-all touch-manipulation ${
                  isSelected
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : "bg-muted hover:bg-muted/80 active:scale-95"
                } ${onDayClick ? "cursor-pointer" : "cursor-default"}`}
                disabled={!onDayClick}
              >
                <div className="text-sm capitalize">{dayName}</div>
                <div className="text-xs opacity-75 mt-1">
                  {dayDate.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                </div>
              </button>
            )
          })}
        </div>

        {/* Mobile: Day selector quando não está filtrado por dia */}
        {dayFilter === "all" && displayDays.length > 1 && (
          <div className="sm:hidden mb-4 overflow-x-auto -mx-3 px-3">
            <div className="flex gap-2 min-w-max">
              {validDays.map((day, idx) => {
                const dayDate = new Date(day.date)
                const dayName = dayDate.toLocaleDateString("pt-PT", { weekday: "short" })
                return (
                  <button
                    key={day.date}
                    onClick={() => onDayClick?.(idx)}
                    className="flex-shrink-0 p-2 rounded-lg text-center bg-muted hover:bg-muted/80 active:scale-95 transition-all touch-manipulation min-w-[60px]"
                  >
                    <div className="text-xs font-semibold capitalize">{dayName}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      {dayDate.toLocaleDateString("pt-PT", { day: "2-digit" })}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {shiftsToShow.map((shift) => {
          const activeLines = getActiveLinesForDays(displayDays, shift)

          // Em modo readOnly, esconder turnos sem produção
          if (readOnly && activeLines.length === 0) {
            return null
          }

          return (
            <div key={shift} className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">{SHIFT_NAMES[shift]}</h3>
              
              {/* Mensagem quando não há linhas de produção configuradas */}
              {!readOnly && activeLines.length === 0 && (
                <div className="text-center p-6 bg-muted/50 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Não há linhas de produção configuradas.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione linhas de produção nas Configurações para poder planear a produção.
                  </p>
                </div>
              )}

              {activeLines.length > 0 && (
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="inline-block min-w-full align-middle">
                  {/* Desktop Grid View */}
                  <div className="hidden sm:grid sm:grid-cols-[200px_repeat(7,1fr)_100px] gap-2">
                    {/* Header - apenas se visualizando semana completa */}
                    {dayFilter === "all" && (
                      <>
                        <div className="font-semibold p-3 bg-muted rounded-lg">Linha</div>
                        {displayDays.map((day, idx) => (
                          <div key={day.date} className="font-semibold p-3 bg-muted rounded-lg text-center">
                            <div className="text-sm">{WEEKDAYS[validDays.indexOf(day)]}</div>
                          </div>
                        ))}
                        <div className="font-semibold p-3 bg-primary/20 rounded-lg text-center">
                          <div className="text-sm">Total</div>
                        </div>
                      </>
                    )}

                    {activeLines.map((line) => (
                      <>
                        <div className="font-medium p-3 bg-muted/50 rounded-lg flex items-center" key={line.id}>
                          {line.name}
                        </div>
                        {displayDays.map((day, dayIdx) => {
                          const actualDayIndex = validDays.indexOf(day)
                          const entry = getEntry(actualDayIndex, shift, line.id)
                          const cellKey = `${line.id}-${actualDayIndex}-${shift}`
                          const isExpanded = expandedCells.has(cellKey)
                          const eligibleProducts = getEligibleProducts(line.id)

                          return (
                            <Card key={cellKey} className="p-2 hover:shadow-md transition-shadow">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium truncate flex-1">
                                    {entry?.productId
                                      ? products.find((p) => p.id === entry.productId)?.name || "-"
                                      : "-"}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleCell(line.id, actualDayIndex, shift)}
                                    className="h-6 w-6 p-0"
                                    disabled={readOnly}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>

                                {entry && entry.targetQuantity > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    <div>{entry.targetQuantity} kg</div>
                                    {entry.expectedPallets > 0 && (
                                      <div className="opacity-75">{entry.expectedPallets} pal.</div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Total Acumulado */}
                                {entry?.productId && (
                                  <div className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1">
                                    <span className="opacity-70">Acum: </span>
                                    <span className="font-semibold">
                                      {getAccumulatedTotal(line.id, entry.productId, actualDayIndex, shift).toLocaleString("pt-PT")} kg
                                    </span>
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="space-y-3 pt-2 border-t">
                                    {entry && entry.productId && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full h-7 text-xs"
                                        onClick={() => removeEntry(actualDayIndex, shift, line.id)}
                                        disabled={readOnly}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Remover Produção
                                      </Button>
                                    )}

                                    <div className="space-y-2">
                                      <Label className="text-xs">Produto</Label>
                                      {eligibleProducts.length === 0 ? (
                                        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                                          Nenhum produto configurado
                                        </div>
                                      ) : (
                                        <Select
                                          value={entry?.productId || ""}
                                          onValueChange={(value) =>
                                            updateEntry(actualDayIndex, shift, line.id, { productId: value })
                                          }
                                          disabled={readOnly}
                                        >
                                          <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Selecionar" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {eligibleProducts.map((product) => (
                                              <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Total a Produzir (kg)</Label>
                                      <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        placeholder="Ex: 5000"
                                        value={entry?.targetQuantity || ""}
                                        onChange={(e) =>
                                          updateEntry(actualDayIndex, shift, line.id, {
                                            targetQuantity: Number(e.target.value),
                                          })
                                        }
                                        disabled={readOnly}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-2">
                                        <Label className="text-xs">RPM</Label>
                                        <Input
                                          type="number"
                                          className="h-8 text-xs"
                                          placeholder="Ex: 120"
                                          value={entry?.rpm || ""}
                                          onChange={(e) =>
                                            updateEntry(actualDayIndex, shift, line.id, {
                                              rpm: Number(e.target.value),
                                            })
                                          }
                                          disabled={readOnly}
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-xs">kg/h</Label>
                                        <Input
                                          type="number"
                                          className="h-8 text-xs"
                                          placeholder="Ex: 500"
                                          value={entry?.kgPerHour || ""}
                                          onChange={(e) =>
                                            updateEntry(actualDayIndex, shift, line.id, {
                                              kgPerHour: Number(e.target.value),
                                            })
                                          }
                                          disabled={readOnly}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Previsão Paletes</Label>
                                      <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        placeholder="Ex: 10"
                                        value={entry?.expectedPallets || ""}
                                        onChange={(e) =>
                                          updateEntry(actualDayIndex, shift, line.id, {
                                            expectedPallets: Number(e.target.value),
                                          })
                                        }
                                        disabled={readOnly}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          )
                        })}
                        
                        {/* Coluna de Total Semanal */}
                        {dayFilter === "all" && (
                          <div className="bg-primary/10 rounded-lg p-2 flex flex-col justify-center items-center">
                            {(() => {
                              // Calcular todos os produtos desta linha neste turno
                              const productTotals = new Map<string, { name: string; total: number }>()
                              
                              for (const day of validDays) {
                                const shiftPlan = day.shifts.find((s) => s.shift === shift)
                                const entry = shiftPlan?.entries.find((e) => e.lineId === line.id)
                                if (entry?.productId && entry.targetQuantity > 0) {
                                  const product = products.find((p) => p.id === entry.productId)
                                  const existing = productTotals.get(entry.productId)
                                  if (existing) {
                                    existing.total += entry.targetQuantity
                                  } else {
                                    productTotals.set(entry.productId, {
                                      name: product?.name || "Produto",
                                      total: entry.targetQuantity,
                                    })
                                  }
                                }
                              }
                              
                              if (productTotals.size === 0) {
                                return <span className="text-xs text-muted-foreground">-</span>
                              }
                              
                              return (
                                <div className="space-y-1 w-full">
                                  {Array.from(productTotals.entries()).map(([productId, data]) => (
                                    <div key={productId} className="text-center">
                                      <div className="text-[10px] text-muted-foreground truncate">{data.name}</div>
                                      <div className="text-xs font-bold text-primary">
                                        {data.total.toLocaleString("pt-PT")} kg
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </>
                    ))}
                  </div>

                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-4">
                    {displayDays.map((day, dayIdx) => {
                      const actualDayIndex = validDays.indexOf(day)
                      const dayDate = new Date(day.date)

                      const linesForThisDay = activeLines.filter((line) => {
                        const entry = getEntry(actualDayIndex, shift, line.id)
                        return entry && entry.productId && entry.targetQuantity > 0
                      })

                      if (linesForThisDay.length === 0) {
                        return null
                      }

                      return (
                        <div key={day.date} className="space-y-3">
                          <div className="sticky top-0 z-10 bg-background">
                            <div className="font-semibold text-base bg-primary text-primary-foreground p-3 rounded-lg shadow-sm">
                              <div className="capitalize">
                                {dayDate.toLocaleDateString("pt-PT", { weekday: "long" })}
                              </div>
                              <div className="text-sm opacity-90 mt-0.5">
                                {dayDate.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {linesForThisDay.map((line) => {
                              const entry = getEntry(actualDayIndex, shift, line.id)
                              const cellKey = `${line.id}-${actualDayIndex}-${shift}`
                              const isExpanded = expandedCells.has(cellKey)
                              const eligibleProducts = getEligibleProducts(line.id)
                              const product = entry?.productId ? products.find((p) => p.id === entry.productId) : null

                              return (
                                <Card key={line.id} className="p-3 bg-card">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-muted-foreground mb-1">Linha de Produção</div>
                                        <div className="font-semibold text-base">{line.name}</div>
                                        <div className="text-sm text-foreground mt-2">
                                          <span className="text-muted-foreground">Produto: </span>
                                          <span className="font-medium">{product?.name || "-"}</span>
                                        </div>
                                        {entry && entry.targetQuantity > 0 && (
                                          <div className="text-sm mt-1 space-y-0.5">
                                            <div>
                                              <span className="text-muted-foreground">Total: </span>
                                              <span className="font-semibold text-primary">
                                                {entry.targetQuantity} kg
                                              </span>
                                            </div>
                                            {(entry.rpm || entry.kgPerHour) && (
                                              <div className="text-xs text-muted-foreground">
                                                {entry.rpm && <span>{entry.rpm} RPM</span>}
                                                {entry.rpm && entry.kgPerHour && <span> | </span>}
                                                {entry.kgPerHour && <span>{entry.kgPerHour} kg/h</span>}
                                              </div>
                                            )}
                                            {entry.expectedPallets > 0 && (
                                              <div className="text-xs text-muted-foreground">
                                                {entry.expectedPallets} paletes previstas
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Total Acumulado Mobile */}
                                        {entry?.productId && (
                                          <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md mt-2 inline-block">
                                            <span className="opacity-70">Acumulado: </span>
                                            <span className="font-semibold">
                                              {getAccumulatedTotal(line.id, entry.productId, actualDayIndex, shift).toLocaleString("pt-PT")} kg
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {!readOnly && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleCell(line.id, actualDayIndex, shift)}
                                          className="h-8 w-8 p-0 flex-shrink-0"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </Button>
                                      )}
                                    </div>

                                    {isExpanded && !readOnly && (
                                      <div className="space-y-3 pt-2 border-t">
                                        {entry && entry.productId && (
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full h-9 text-xs"
                                            onClick={() => removeEntry(actualDayIndex, shift, line.id)}
                                            disabled={readOnly}
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Remover Produção
                                          </Button>
                                        )}

                                        <div className="space-y-2">
                                          <Label className="text-xs">Produto</Label>
                                          {eligibleProducts.length === 0 ? (
                                            <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                                              Nenhum produto configurado
                                            </div>
                                          ) : (
                                            <Select
                                              value={entry?.productId || ""}
                                              onValueChange={(value) =>
                                                updateEntry(actualDayIndex, shift, line.id, { productId: value })
                                              }
                                              disabled={readOnly}
                                            >
                                              <SelectTrigger className="h-10 text-sm">
                                                <SelectValue placeholder="Selecionar" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {eligibleProducts.map((product) => (
                                                  <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>

                                        <div className="space-y-2">
                                          <Label className="text-xs">Total a Produzir (kg)</Label>
                                          <Input
                                            type="number"
                                            className="h-10 text-sm"
                                            placeholder="Ex: 5000"
                                            value={entry?.targetQuantity || ""}
                                            onChange={(e) =>
                                              updateEntry(actualDayIndex, shift, line.id, {
                                                targetQuantity: Number(e.target.value),
                                              })
                                            }
                                            disabled={readOnly}
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label className="text-xs">RPM</Label>
                                            <Input
                                              type="number"
                                              className="h-10 text-sm"
                                              placeholder="Ex: 120"
                                              value={entry?.rpm || ""}
                                              onChange={(e) =>
                                                updateEntry(actualDayIndex, shift, line.id, {
                                                  rpm: Number(e.target.value),
                                                })
                                              }
                                              disabled={readOnly}
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-xs">kg/h</Label>
                                            <Input
                                              type="number"
                                              className="h-10 text-sm"
                                              placeholder="Ex: 500"
                                              value={entry?.kgPerHour || ""}
                                              onChange={(e) =>
                                                updateEntry(actualDayIndex, shift, line.id, {
                                                  kgPerHour: Number(e.target.value),
                                                })
                                              }
                                              disabled={readOnly}
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <Label className="text-xs">Paletes</Label>
                                          <Input
                                            type="number"
                                            className="h-10 text-sm"
                                            value={entry?.expectedPallets || ""}
                                            onChange={(e) =>
                                              updateEntry(actualDayIndex, shift, line.id, {
                                                expectedPallets: Number(e.target.value),
                                              })
                                            }
                                            disabled={readOnly}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
