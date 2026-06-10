"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileType,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Users,
  Gauge,
  LayoutGrid,
  Clock,
  Building2,
  BarChart3,
} from "lucide-react"
import type {
  ManualAdherenceEntry,
  SafetyQualityRecord,
  CostDeliveryRecord,
  WorkforceRecord,
  WorkforceDistribution,
  LineStatusEntry,
  ShiftType,
} from "@/lib/types"

interface FinalReportGeneratorProps {
  date: string
  shift: ShiftType
  coordinatorName: string
  adherenceData: {
    entries: ManualAdherenceEntry[]
    overallAdherence: number
  }
  safetyQuality?: SafetyQualityRecord
  costDelivery?: CostDeliveryRecord
  workforce?: WorkforceRecord
  workforceDistribution: WorkforceDistribution[]
  lineStatuses: LineStatusEntry[]
  operationalSummary: string
  sapSummary: string
}

export function FinalReportGenerator({
  date,
  shift,
  coordinatorName,
  adherenceData,
  safetyQuality,
  costDelivery,
  workforce,
  workforceDistribution,
  lineStatuses,
  operationalSummary,
  sapSummary,
}: FinalReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

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

  const generateTextReport = () => {
    const lines: string[] = []
    const separator = "=".repeat(60)

    lines.push(separator)
    lines.push("RELATORIO DE TURNO")
    lines.push(separator)
    lines.push("")
    lines.push(`Data: ${new Date(date).toLocaleDateString("pt-PT")}`)
    lines.push(`Turno: ${getShiftLabel()}`)
    lines.push(`Coordenador: ${coordinatorName}`)
    lines.push(`Gerado em: ${new Date().toLocaleString("pt-PT")}`)
    lines.push("")

    // Adherence
    lines.push(separator)
    lines.push("ADERENCIA")
    lines.push(separator)
    lines.push(`Aderencia Global: ${adherenceData.overallAdherence.toFixed(1)}%`)
    lines.push("")
    if (adherenceData.entries.length > 0) {
      lines.push("Por Linha:")
      adherenceData.entries.forEach((e) => {
        const percentage = e.targetKg > 0 ? ((e.producedKg / e.targetKg) * 100).toFixed(1) : "0"
        lines.push(`  - ${e.lineName}: ${e.producedKg}/${e.targetKg} kg (${percentage}%)`)
      })
    }
    lines.push("")

    // Lines Status
    lines.push(separator)
    lines.push("ESTADO DAS LINHAS")
    lines.push(separator)
    const statusCounts = {
      running: lineStatuses.filter((l) => l.status === "running").length,
      stopped: lineStatuses.filter((l) => l.status === "stopped").length,
      cleaning: lineStatuses.filter((l) => l.status === "cleaning").length,
      incident: lineStatuses.filter((l) => l.status === "incident").length,
      maintenance: lineStatuses.filter((l) => l.status === "maintenance").length,
    }
    lines.push(`Em Producao: ${statusCounts.running}`)
    lines.push(`Paradas: ${statusCounts.stopped}`)
    lines.push(`Em Limpeza: ${statusCounts.cleaning}`)
    lines.push(`Com Incidencia: ${statusCounts.incident}`)
    lines.push(`Em Manutencao: ${statusCounts.maintenance}`)
    lines.push("")

    // Safety & Quality
    if (safetyQuality) {
      lines.push(separator)
      lines.push("SEGURANCA / QUALIDADE")
      lines.push(separator)
      lines.push(`Incidencias de Seguranca: ${safetyQuality.safetyIncidents}`)
      lines.push(`Quase Acidentes: ${safetyQuality.nearMisses}`)
      if (safetyQuality.qualityIssues) lines.push(`Qualidade: ${safetyQuality.qualityIssues}`)
      if (safetyQuality.complaints) lines.push(`Reclamacoes: ${safetyQuality.complaints}`)
      if (safetyQuality.deviations) lines.push(`Desvios: ${safetyQuality.deviations}`)
      if (safetyQuality.observations) lines.push(`Observacoes: ${safetyQuality.observations}`)
      lines.push("")
    }

    // Cost & Delivery
    if (costDelivery) {
      lines.push(separator)
      lines.push("CUSTO / ENTREGA")
      lines.push(separator)
      if (costDelivery.stoppages.length > 0) {
        const totalMinutes = costDelivery.stoppages.reduce((sum, s) => sum + s.duration, 0)
        lines.push(`Paragens: ${costDelivery.stoppages.length} (${totalMinutes} min total)`)
        costDelivery.stoppages.forEach((s) => {
          lines.push(`  - ${s.lineName}: ${s.duration}min - ${s.reason}`)
        })
      }
      if (costDelivery.breakages) lines.push(`Quebras: ${costDelivery.breakages}`)
      if (costDelivery.materialShortage) lines.push(`Falta Material: ${costDelivery.materialShortage}`)
      if (costDelivery.logisticsIssues) lines.push(`Logistica: ${costDelivery.logisticsIssues}`)
      if (costDelivery.linesBelowTarget.length > 0) {
        lines.push(`Linhas Abaixo Objetivo: ${costDelivery.linesBelowTarget.join(", ")}`)
      }
      lines.push("")
    }

    // Workforce
    if (workforce) {
      lines.push(separator)
      lines.push("MAO DE OBRA (MOD)")
      lines.push(separator)
      lines.push(`Falta Operadores: ${workforce.missingOperators}`)
      if (workforce.positionChanges) lines.push(`Trocas Posto: ${workforce.positionChanges}`)
      if (workforce.reinforcements) lines.push(`Reforcos: ${workforce.reinforcements}`)
      if (workforce.absences.length > 0) {
        lines.push(`Ausencias: ${workforce.absences.map((a) => a.workerName).join(", ")}`)
      }
      lines.push("")
    }

    // Workforce Distribution
    if (workforceDistribution.length > 0) {
      lines.push(separator)
      lines.push("DISTRIBUICAO HORAS HOMEM")
      lines.push(separator)
      const byCode: Record<string, { hours: number; count: number }> = {}
      workforceDistribution.forEach((d) => {
        if (!byCode[d.laborCode]) byCode[d.laborCode] = { hours: 0, count: 0 }
        byCode[d.laborCode].hours += d.hoursAssigned
        byCode[d.laborCode].count++
      })
      Object.entries(byCode).forEach(([code, data]) => {
        lines.push(`  Codigo ${code}: ${data.hours}h (${data.count} pessoas)`)
      })
      lines.push("")
    }

    // SAP Summary
    lines.push(separator)
    lines.push("RESUMO SAP")
    lines.push(separator)
    lines.push(sapSummary || "Sem dados")
    lines.push("")

    // Operational Summary
    if (operationalSummary) {
      lines.push(separator)
      lines.push("RESUMO OPERACIONAL")
      lines.push(separator)
      lines.push(operationalSummary)
    }

    lines.push("")
    lines.push(separator)
    lines.push("FIM DO RELATORIO")
    lines.push(separator)

    return lines.join("\n")
  }

  const downloadTextReport = () => {
    const content = generateTextReport()
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `relatorio_turno_${date}_${shift}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadExcelReport = () => {
    // Generate comprehensive CSV format with all data
    const rows: string[][] = []
    
    // Header
    rows.push(["RELATORIO COMPLETO DE TURNO"])
    rows.push([])
    rows.push(["INFORMACAO GERAL"])
    rows.push(["Data", new Date(date).toLocaleDateString("pt-PT")])
    rows.push(["Turno", getShiftLabel()])
    rows.push(["Coordenador", coordinatorName])
    rows.push(["Gerado em", new Date().toLocaleString("pt-PT")])
    rows.push([])
    
    // Production Statistics - Adherence
    rows.push(["====================================="])
    rows.push(["ESTATISTICAS DE PRODUCAO"])
    rows.push(["====================================="])
    rows.push(["Aderencia Global", `${adherenceData.overallAdherence.toFixed(1)}%`])
    rows.push([])
    
    if (adherenceData.entries.length > 0) {
      rows.push(["DETALHE POR LINHA"])
      rows.push(["Linha", "Produto", "Produzido (kg)", "Objetivo (kg)", "Restante (kg)", "Aderencia (%)", "Estado", "Hora Estimada Fim"])
      adherenceData.entries.forEach((e) => {
        const percentage = e.targetKg > 0 ? ((e.producedKg / e.targetKg) * 100).toFixed(1) : "0"
        rows.push([
          e.lineName,
          e.productName || "-",
          e.producedKg.toString(),
          e.targetKg.toString(),
          e.remainingKg.toString(),
          percentage,
          e.status === "on-track" ? "No Objetivo" : e.status === "at-risk" ? "Em Risco" : "Atrasado",
          e.estimatedEndTime || "-"
        ])
      })
      rows.push([])
      
      // Production Summary
      const totalProduced = adherenceData.entries.reduce((sum, e) => sum + e.producedKg, 0)
      const totalTarget = adherenceData.entries.reduce((sum, e) => sum + e.targetKg, 0)
      const totalRemaining = adherenceData.entries.reduce((sum, e) => sum + e.remainingKg, 0)
      rows.push(["TOTAIS DE PRODUCAO"])
      rows.push(["Total Produzido (kg)", totalProduced.toString()])
      rows.push(["Total Objetivo (kg)", totalTarget.toString()])
      rows.push(["Total Restante (kg)", totalRemaining.toString()])
      rows.push([])
    }

    // Lines Status
    rows.push(["====================================="])
    rows.push(["ESTADO DAS LINHAS"])
    rows.push(["====================================="])
    const statusCounts = {
      running: lineStatuses.filter((l) => l.status === "running").length,
      stopped: lineStatuses.filter((l) => l.status === "stopped").length,
      cleaning: lineStatuses.filter((l) => l.status === "cleaning").length,
      incident: lineStatuses.filter((l) => l.status === "incident").length,
      maintenance: lineStatuses.filter((l) => l.status === "maintenance").length,
    }
    rows.push(["Resumo Estado"])
    rows.push(["Em Producao", statusCounts.running.toString()])
    rows.push(["Paradas", statusCounts.stopped.toString()])
    rows.push(["Em Limpeza", statusCounts.cleaning.toString()])
    rows.push(["Com Incidencia", statusCounts.incident.toString()])
    rows.push(["Em Manutencao", statusCounts.maintenance.toString()])
    rows.push([])
    rows.push(["DETALHE POR LINHA"])
    rows.push(["Linha", "Estado", "Horas Producao", "Horas Limpeza", "Horas Parado", "Motivo Paragem", "Incidencia"])
    lineStatuses.forEach((ls) => {
      rows.push([
        ls.lineName,
        ls.status === "running" ? "Em Producao" : ls.status === "stopped" ? "Parada" : ls.status === "cleaning" ? "Limpeza" : ls.status === "incident" ? "Incidencia" : "Manutencao",
        ls.productionHours.toString(),
        ls.cleaningHours.toString(),
        ls.stoppedHours.toString(),
        ls.stoppageReason || "-",
        ls.incidentDescription || "-",
      ])
    })
    rows.push([])

    // Safety & Quality - Incidents
    rows.push(["====================================="])
    rows.push(["SEGURANCA / QUALIDADE"])
    rows.push(["====================================="])
    if (safetyQuality) {
      rows.push(["Incidencias de Seguranca", safetyQuality.safetyIncidents.toString()])
      rows.push(["Quase Acidentes", safetyQuality.nearMisses.toString()])
      rows.push(["Problemas de Qualidade", safetyQuality.qualityIssues || "Nenhum"])
      rows.push(["Reclamacoes", safetyQuality.complaints || "Nenhuma"])
      rows.push(["Desvios", safetyQuality.deviations || "Nenhum"])
      rows.push(["Observacoes Seguranca/Qualidade", safetyQuality.observations || "-"])
    } else {
      rows.push(["Sem incidencias registadas"])
    }
    rows.push([])

    // Cost & Delivery - Stoppages
    rows.push(["====================================="])
    rows.push(["CUSTO / ENTREGA"])
    rows.push(["====================================="])
    if (costDelivery) {
      if (costDelivery.stoppages && costDelivery.stoppages.length > 0) {
        const totalMinutes = costDelivery.stoppages.reduce((sum, s) => sum + s.duration, 0)
        rows.push(["Total Paragens", costDelivery.stoppages.length.toString()])
        rows.push(["Tempo Total Paragem (min)", totalMinutes.toString()])
        rows.push([])
        rows.push(["DETALHE PARAGENS"])
        rows.push(["Linha", "Duracao (min)", "Categoria", "Motivo"])
        costDelivery.stoppages.forEach((s) => {
          rows.push([
            s.lineName,
            s.duration.toString(),
            s.category === "mechanical" ? "Mecanica" : s.category === "electrical" ? "Eletrica" : s.category === "material" ? "Material" : s.category === "quality" ? "Qualidade" : "Outro",
            s.reason
          ])
        })
        rows.push([])
      }
      rows.push(["Quebras", costDelivery.breakages || "Nenhuma"])
      rows.push(["Falta de Material", costDelivery.materialShortage || "Nenhuma"])
      rows.push(["Problemas Logisticos", costDelivery.logisticsIssues || "Nenhum"])
      rows.push(["Linhas Abaixo Objetivo", costDelivery.linesBelowTarget?.join(", ") || "Nenhuma"])
      rows.push(["Observacoes Custo/Entrega", costDelivery.observations || "-"])
    } else {
      rows.push(["Sem incidencias registadas"])
    }
    rows.push([])

    // Workforce - Absences
    rows.push(["====================================="])
    rows.push(["MAO DE OBRA (MOD)"])
    rows.push(["====================================="])
    if (workforce) {
      rows.push(["Falta de Operadores", workforce.missingOperators.toString()])
      rows.push(["Trocas de Posto", workforce.positionChanges || "Nenhuma"])
      rows.push(["Reforcos", workforce.reinforcements || "Nenhum"])
      rows.push(["Observacoes MOD", workforce.observations || "-"])
      rows.push([])
      if (workforce.absences && workforce.absences.length > 0) {
        rows.push(["AUSENCIAS DETALHADAS"])
        rows.push(["Nome", "Motivo", "Notificado"])
        workforce.absences.forEach((a) => {
          rows.push([a.workerName, a.reason || "-", a.notified ? "Sim" : "Nao"])
        })
        rows.push([])
      }
    } else {
      rows.push(["Sem incidencias registadas"])
    }

    // Workforce Distribution
    if (workforceDistribution.length > 0) {
      rows.push(["====================================="])
      rows.push(["DISTRIBUICAO HORAS HOMEM"])
      rows.push(["====================================="])
      rows.push(["Nome", "Linha", "Codigo MOD", "Nome Codigo", "Horas", "Observacoes"])
      workforceDistribution.forEach((d) => {
        rows.push([
          d.workerName,
          d.lineName || "-",
          d.laborCode,
          d.laborCodeName || "-",
          d.hoursAssigned.toString(),
          d.observations || "-"
        ])
      })
      rows.push([])
      
      // Summary by labor code
      const byCode: Record<string, { hours: number; count: number; name: string }> = {}
      workforceDistribution.forEach((d) => {
        if (!byCode[d.laborCode]) byCode[d.laborCode] = { hours: 0, count: 0, name: d.laborCodeName || "" }
        byCode[d.laborCode].hours += d.hoursAssigned
        byCode[d.laborCode].count++
      })
      rows.push(["RESUMO POR CODIGO MOD"])
      rows.push(["Codigo", "Descricao", "Total Horas", "Num. Pessoas"])
      Object.entries(byCode).forEach(([code, data]) => {
        rows.push([code, data.name, data.hours.toString(), data.count.toString()])
      })
      rows.push([])
    }

    // SAP Summary
    rows.push(["====================================="])
    rows.push(["RESUMO SAP"])
    rows.push(["====================================="])
    rows.push([sapSummary || "Sem dados"])
    rows.push([])

    // Operational Summary with all comments
    rows.push(["====================================="])
    rows.push(["RESUMO OPERACIONAL COMPLETO"])
    rows.push(["====================================="])
    rows.push([operationalSummary || "Sem resumo gerado"])

    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(";")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `relatorio_producao_${date}_${shift}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const content = generateTextReport()
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatorio de Turno - ${date}</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const hasIssues =
    (safetyQuality?.safetyIncidents || 0) > 0 ||
    (safetyQuality?.nearMisses || 0) > 0 ||
    (costDelivery?.stoppages?.length || 0) > 0 ||
    (workforce?.missingOperators || 0) > 0

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-5 w-5 text-emerald-600" />
          Relatorio Final de Turno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Preview Summary */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Data do Relatorio</p>
              <p className="font-semibold">{new Date(date).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <Badge variant={hasIssues ? "destructive" : "default"} className="text-sm">
              {hasIssues ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Com Incidencias
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Turno Normal
                </>
              )}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Gauge className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aderencia</p>
                <p className="font-bold">{adherenceData.overallAdherence.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <LayoutGrid className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Linhas</p>
                <p className="font-bold">{lineStatuses.filter((l) => l.status === "running").length}/{lineStatuses.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MOD</p>
                <p className="font-bold">{workforceDistribution.length}p</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Turno</p>
                <p className="font-bold text-sm">{shift === "morning" ? "Manha" : shift === "afternoon" ? "Tarde" : "Noite"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAP Ready Summary */}
        {sapSummary && (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">Pronto para SAP</span>
            </div>
            <p className="text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded">{sapSummary}</p>
          </div>
        )}

        {/* Export Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            onClick={downloadTextReport}
            variant="outline"
            className="min-h-[56px] flex-col gap-1"
          >
            <FileType className="h-5 w-5" />
            <span className="text-xs">Texto (.txt)</span>
          </Button>
          <Button
            onClick={downloadExcelReport}
            variant="outline"
            className="min-h-[56px] flex-col gap-1 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
          >
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <span className="text-xs">Excel Completo</span>
          </Button>
          <Button
            onClick={printReport}
            variant="outline"
            className="min-h-[56px] flex-col gap-1"
          >
            <Printer className="h-5 w-5" />
            <span className="text-xs">Imprimir</span>
          </Button>
          <Button
            onClick={downloadExcelReport}
            variant="outline"
            className="min-h-[56px] flex-col gap-1 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
          >
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-xs">Estatisticas</span>
          </Button>
        </div>

        {/* Main Generate Button */}
        <Button
          onClick={downloadTextReport}
          className="w-full min-h-[56px] text-lg bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          <Download className="h-5 w-5 mr-2" />
          Gerar Relatorio Completo
        </Button>
      </CardContent>
    </Card>
  )
}
