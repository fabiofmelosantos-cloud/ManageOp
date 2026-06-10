"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Shield,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clipboard,
  Sparkles,
} from "lucide-react"
import type { SafetyQualityRecord, CostDeliveryRecord, WorkforceRecord, ShiftType, StoppageRecord } from "@/lib/types"

export interface OperationalFormData {
  // Safety & Quality
  safetyIncidents: number
  nearMisses: number
  qualityIssues: string
  complaints: string
  deviations: string
  safetyObservations: string
  // Cost & Delivery
  stoppages: StoppageRecord[]
  breakages: string
  materialShortage: string
  logisticsIssues: string
  linesBelowTarget: string
  costObservations: string
  // Workforce
  missingOperators: number
  positionChanges: string
  reinforcements: string
  absences: string
  workforceObservations: string
  // Generated
  generatedSummary: string
  sapSummary: string
}

export const initialOperationalFormData: OperationalFormData = {
  safetyIncidents: 0,
  nearMisses: 0,
  qualityIssues: "",
  complaints: "",
  deviations: "",
  safetyObservations: "",
  stoppages: [],
  breakages: "",
  materialShortage: "",
  logisticsIssues: "",
  linesBelowTarget: "",
  costObservations: "",
  missingOperators: 0,
  positionChanges: "",
  reinforcements: "",
  absences: "",
  workforceObservations: "",
  generatedSummary: "",
  sapSummary: "",
}

interface OperationalSummaryFormProps {
  date: string
  shift: ShiftType
  formData: OperationalFormData
  onFormDataChange: (data: OperationalFormData) => void
  onUpdate?: (data: {
    safetyQuality: SafetyQualityRecord
    costDelivery: CostDeliveryRecord
    workforce: WorkforceRecord
    generatedSummary: string
    sapSummary: string
  }) => void
}

export function OperationalSummaryForm({ date, shift, formData, onFormDataChange, onUpdate }: OperationalSummaryFormProps) {
  const [activeSection, setActiveSection] = useState<string>("safety")
  
  // Local aliases for easier reading - all controlled by parent
  const {
    safetyIncidents,
    nearMisses,
    qualityIssues,
    complaints,
    deviations,
    safetyObservations,
    stoppages,
    breakages,
    materialShortage,
    logisticsIssues,
    linesBelowTarget,
    costObservations,
    missingOperators,
    positionChanges,
    reinforcements,
    absences,
    workforceObservations,
    generatedSummary,
    sapSummary,
  } = formData

  // Helper to update a single field
  const updateField = <K extends keyof OperationalFormData>(field: K, value: OperationalFormData[K]) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  const getShiftLabel = () => {
    switch (shift) {
      case "morning":
        return "Manha (08:00-16:00)"
      case "afternoon":
        return "Tarde (16:00-00:00)"
      case "night":
        return "Noite (00:00-08:00)"
    }
  }

  const generateSummary = () => {
    const parts: string[] = []
    const sapParts: string[] = []

    // Safety & Quality Section
    const safetyParts: string[] = []
    if (safetyIncidents > 0) {
      safetyParts.push(`Registadas ${safetyIncidents} incidencia(s) de seguranca.`)
      sapParts.push(`SEG: ${safetyIncidents} inc`)
    }
    if (nearMisses > 0) {
      safetyParts.push(`Reportados ${nearMisses} quase acidente(s).`)
      sapParts.push(`QA: ${nearMisses}`)
    }
    if (qualityIssues) {
      safetyParts.push(`Problemas de qualidade: ${qualityIssues}.`)
      sapParts.push(`QUAL: ${qualityIssues.substring(0, 50)}`)
    }
    if (complaints) {
      safetyParts.push(`Reclamacoes: ${complaints}.`)
    }
    if (deviations) {
      safetyParts.push(`Desvios identificados: ${deviations}.`)
    }
    if (safetyObservations) {
      safetyParts.push(`Obs: ${safetyObservations}`)
    }
    if (safetyParts.length > 0) {
      parts.push(`SEGURANCA/QUALIDADE:\n${safetyParts.join(" ")}`)
    } else {
      parts.push(`SEGURANCA/QUALIDADE:\nSem incidencias.`)
    }

    // Cost & Delivery Section
    const costParts: string[] = []
    if (stoppages.length > 0) {
      const totalMinutes = stoppages.reduce((sum, s) => sum + s.duration, 0)
      costParts.push(`Total de ${stoppages.length} paragem(ns) com duracao de ${totalMinutes} minutos.`)
      sapParts.push(`PARAG: ${totalMinutes}min`)
    }
    if (breakages) {
      costParts.push(`Quebras registadas: ${breakages}.`)
      sapParts.push(`QUEBR: ${breakages.substring(0, 30)}`)
    }
    if (materialShortage) {
      costParts.push(`Falta de material: ${materialShortage}.`)
      sapParts.push(`MAT: falta`)
    }
    if (logisticsIssues) {
      costParts.push(`Problemas logisticos: ${logisticsIssues}.`)
    }
    if (linesBelowTarget) {
      costParts.push(`Linhas abaixo do objetivo: ${linesBelowTarget}.`)
      sapParts.push(`LINHAS: ${linesBelowTarget}`)
    }
    if (costObservations) {
      costParts.push(`Obs: ${costObservations}`)
    }
    if (costParts.length > 0) {
      parts.push(`CUSTO/ENTREGA:\n${costParts.join(" ")}`)
    } else {
      parts.push(`CUSTO/ENTREGA:\nSem incidencias.`)
    }

    // Workforce Section
    const workforceParts: string[] = []
    if (missingOperators > 0) {
      workforceParts.push(`Registada falta de ${missingOperators} operador(es).`)
      sapParts.push(`MOD: -${missingOperators}`)
    }
    if (positionChanges) {
      workforceParts.push(`Trocas de posto: ${positionChanges}.`)
    }
    if (reinforcements) {
      workforceParts.push(`Reforcos solicitados: ${reinforcements}.`)
    }
    if (absences) {
      workforceParts.push(`Ausencias: ${absences}.`)
    }
    if (workforceObservations) {
      workforceParts.push(`Obs: ${workforceObservations}`)
    }
    if (workforceParts.length > 0) {
      parts.push(`MOD:\n${workforceParts.join(" ")}`)
    } else {
      parts.push(`MOD:\nSem incidencias.`)
    }

    const summary = `Turno ${getShiftLabel()} - ${new Date(date).toLocaleDateString("pt-PT")}:\n\n${parts.join("\n\n")}`

    const sap = sapParts.length > 0 ? sapParts.join(" | ") : "OK - Sem incidencias"

    // Update parent state with generated summaries (but don't clear form data!)
    onFormDataChange({
      ...formData,
      generatedSummary: summary,
      sapSummary: sap,
    })

    // Notify parent with structured data
    if (onUpdate) {
      onUpdate({
        safetyQuality: {
          id: `sq_${Date.now()}`,
          date,
          shift,
          safetyIncidents,
          nearMisses,
          qualityIssues,
          complaints,
          deviations,
          observations: safetyObservations,
        },
        costDelivery: {
          id: `cd_${Date.now()}`,
          date,
          shift,
          stoppages,
          breakages,
          materialShortage,
          logisticsIssues,
          linesBelowTarget: linesBelowTarget.split(",").map((s) => s.trim()).filter(Boolean),
          observations: costObservations,
        },
        workforce: {
          id: `wf_${Date.now()}`,
          date,
          shift,
          missingOperators,
          positionChanges,
          reinforcements,
          absences: absences.split(",").map((a) => ({
            workerId: "",
            workerName: a.trim(),
            reason: "",
            notified: false,
          })),
          observations: workforceObservations,
        },
        generatedSummary: summary,
        sapSummary: sap,
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const addStoppage = () => {
    const newStoppage: StoppageRecord = {
      id: `stop_${Date.now()}`,
      lineId: "",
      lineName: "",
      startTime: new Date().toISOString(),
      duration: 0,
      reason: "",
      category: "other",
    }
    updateField("stoppages", [...stoppages, newStoppage])
  }

  const updateStoppage = (id: string, updates: Partial<StoppageRecord>) => {
    updateField("stoppages", stoppages.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const removeStoppage = (id: string) => {
    updateField("stoppages", stoppages.filter((s) => s.id !== id))
  }

  const getSectionStatus = (section: string) => {
    switch (section) {
      case "safety":
        return safetyIncidents > 0 || nearMisses > 0 || qualityIssues || complaints || deviations
      case "cost":
        return stoppages.length > 0 || breakages || materialShortage || logisticsIssues || linesBelowTarget
      case "workforce":
        return missingOperators > 0 || positionChanges || reinforcements || absences
      default:
        return false
    }
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-5 w-5 text-orange-600" />
          Resumo Operacional do Turno
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {getShiftLabel()} - {new Date(date).toLocaleDateString("pt-PT")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion
          type="single"
          collapsible
          value={activeSection}
          onValueChange={setActiveSection}
          className="space-y-2"
        >
          {/* Safety & Quality */}
          <AccordionItem value="safety" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Seguranca / Qualidade</p>
                  <p className="text-xs text-muted-foreground">Incidencias, quase acidentes, qualidade</p>
                </div>
                {getSectionStatus("safety") && (
                  <Badge variant="destructive" className="ml-auto mr-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atencao
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Incidencias de Seguranca</Label>
                  <Input
                    type="number"
                    min={0}
                    value={safetyIncidents}
                    onChange={(e) => updateField("safetyIncidents", Number(e.target.value))}
                    className="min-h-[48px] text-lg font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quase Acidentes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={nearMisses}
                    onChange={(e) => updateField("nearMisses", Number(e.target.value))}
                    className="min-h-[48px] text-lg font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Problemas de Qualidade</Label>
                <Textarea
                  value={qualityIssues}
                  onChange={(e) => updateField("qualityIssues", e.target.value)}
                  placeholder="Descrever problemas de qualidade..."
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reclamacoes</Label>
                <Textarea
                  value={complaints}
                  onChange={(e) => updateField("complaints", e.target.value)}
                  placeholder="Reclamacoes recebidas..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Desvios</Label>
                <Textarea
                  value={deviations}
                  onChange={(e) => updateField("deviations", e.target.value)}
                  placeholder="Desvios aos procedimentos..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observacoes</Label>
                <Textarea
                  value={safetyObservations}
                  onChange={(e) => updateField("safetyObservations", e.target.value)}
                  placeholder="Observacoes adicionais de seguranca/qualidade..."
                  className="min-h-[60px]"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Cost & Delivery */}
          <AccordionItem value="cost" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Custo / Entrega</p>
                  <p className="text-xs text-muted-foreground">Paragens, quebras, material, logistica</p>
                </div>
                {getSectionStatus("cost") && (
                  <Badge variant="destructive" className="ml-auto mr-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atencao
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Paragens</Label>
                  <Button variant="outline" size="sm" onClick={addStoppage} className="min-h-[36px]">
                    + Adicionar
                  </Button>
                </div>
                {stoppages.map((stoppage) => (
                  <div key={stoppage.id} className="p-3 border rounded-lg space-y-2 bg-muted/50">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Linha"
                        value={stoppage.lineName}
                        onChange={(e) => updateStoppage(stoppage.id, { lineName: e.target.value })}
                        className="min-h-[44px]"
                      />
                      <Input
                        type="number"
                        placeholder="Duracao (min)"
                        value={stoppage.duration || ""}
                        onChange={(e) => updateStoppage(stoppage.id, { duration: Number(e.target.value) })}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Motivo da paragem"
                        value={stoppage.reason}
                        onChange={(e) => updateStoppage(stoppage.id, { reason: e.target.value })}
                        className="min-h-[44px] flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStoppage(stoppage.id)}
                        className="text-red-600 min-h-[44px] min-w-[44px]"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quebras</Label>
                <Textarea
                  value={breakages}
                  onChange={(e) => updateField("breakages", e.target.value)}
                  placeholder="Quebras de producao registadas..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Falta de Material</Label>
                <Textarea
                  value={materialShortage}
                  onChange={(e) => updateField("materialShortage", e.target.value)}
                  placeholder="Materiais em falta..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Problemas Logisticos</Label>
                <Textarea
                  value={logisticsIssues}
                  onChange={(e) => updateField("logisticsIssues", e.target.value)}
                  placeholder="Problemas logisticos identificados..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Linhas Abaixo do Objetivo</Label>
                <Input
                  value={linesBelowTarget}
                  onChange={(e) => updateField("linesBelowTarget", e.target.value)}
                  placeholder="L1, L2, L3..."
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observacoes</Label>
                <Textarea
                  value={costObservations}
                  onChange={(e) => updateField("costObservations", e.target.value)}
                  placeholder="Observacoes adicionais de custo/entrega..."
                  className="min-h-[60px]"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Workforce */}
          <AccordionItem value="workforce" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">MOD (Mao de Obra)</p>
                  <p className="text-xs text-muted-foreground">Faltas, trocas, reforcos, ausencias</p>
                </div>
                {getSectionStatus("workforce") && (
                  <Badge variant="destructive" className="ml-auto mr-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atencao
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Falta de Operadores</Label>
                <Input
                  type="number"
                  min={0}
                  value={missingOperators}
                  onChange={(e) => updateField("missingOperators", Number(e.target.value))}
                  className="min-h-[48px] text-lg font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Trocas de Posto</Label>
                <Textarea
                  value={positionChanges}
                  onChange={(e) => updateField("positionChanges", e.target.value)}
                  placeholder="Descrever trocas de posto realizadas..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reforcos</Label>
                <Textarea
                  value={reinforcements}
                  onChange={(e) => updateField("reinforcements", e.target.value)}
                  placeholder="Reforcos solicitados/recebidos..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ausencias</Label>
                <Textarea
                  value={absences}
                  onChange={(e) => updateField("absences", e.target.value)}
                  placeholder="Nomes separados por virgula..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observacoes</Label>
                <Textarea
                  value={workforceObservations}
                  onChange={(e) => updateField("workforceObservations", e.target.value)}
                  placeholder="Observacoes adicionais de mao de obra..."
                  className="min-h-[60px]"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Generate Summary Button */}
        <Button onClick={generateSummary} className="w-full min-h-[52px] text-base" size="lg">
          <Sparkles className="h-5 w-5 mr-2" />
          Gerar Resumo Automatico
        </Button>

        {/* Generated Summaries */}
        {generatedSummary && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Resumo Operacional</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedSummary)}
                  className="min-h-[36px]"
                >
                  <Clipboard className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-line text-sm">{generatedSummary}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Texto Pronto para SAP
                </Label>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(sapSummary)} className="min-h-[36px]">
                  <Clipboard className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm font-mono">
                {sapSummary}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
