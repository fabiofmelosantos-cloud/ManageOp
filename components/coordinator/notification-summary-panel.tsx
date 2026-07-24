"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ClipboardList,
  Users,
  Clock,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
} from "lucide-react"
import type { LineStatusEntry, NotificationSummary, ShiftType } from "@/lib/types"

interface ExtraPosition {
  id: string
  code: string
  name: string
  checked: boolean
  hours: number
}

interface NotificationSummaryPanelProps {
  lineStatuses: LineStatusEntry[]
  selectedDate: string
  selectedShift: ShiftType
  coordinatorName: string
  onSummaryUpdate?: (summary: NotificationSummary) => void
}

const DEFAULT_EXTRA_POSITIONS: ExtraPosition[] = [
  { id: "silos", code: "01", name: "Silos", checked: false, hours: 8 },
  { id: "pisao", code: "036", name: "Pisao", checked: false, hours: 8 },
  { id: "residuos", code: "036", name: "Residuos Exteriores", checked: false, hours: 8 },
  { id: "coordenador", code: "02", name: "Coordenador", checked: false, hours: 8 },
  { id: "armazem", code: "01", name: "Armazem", checked: false, hours: 8 },
  { id: "limpeza", code: "013", name: "Limpeza Periodica", checked: false, hours: 8 },
]

export function NotificationSummaryPanel({
  lineStatuses,
  selectedDate,
  selectedShift,
  coordinatorName,
  onSummaryUpdate,
}: NotificationSummaryPanelProps) {
  const [extraPositions, setExtraPositions] = useState<ExtraPosition[]>(DEFAULT_EXTRA_POSITIONS)
  const [copied, setCopied] = useState(false)

  const togglePosition = (id: string) => {
    setExtraPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p))
    )
  }

  const updatePositionHours = (id: string, hours: number) => {
    setExtraPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, hours } : p))
    )
  }

  // Calculate full summary
  const summary = useMemo((): NotificationSummary => {
    const lines = lineStatuses
      .filter((ls) => ls.totalPeople > 0 && ls.productionHours > 0)
      .map((ls) => {
        const productionPeople = ls.totalPeople - ls.qualityWallPeople
        return {
          lineId: ls.lineId,
          lineName: ls.lineName,
          productName: ls.productName || "",
          totalPeople: ls.totalPeople,
          productionPeople,
          qualityWallPeople: ls.qualityWallPeople,
          productionHours: ls.productionHours,
          productionTotalHours: productionPeople * ls.productionHours,
          qualityWallTotalHours: ls.qualityWallPeople * ls.productionHours,
        }
      })

    const activeExtraPositions = extraPositions
      .filter((p) => p.checked)
      .map((p) => ({
        code: p.code,
        name: p.name,
        hours: p.hours,
      }))

    // Calculate grand totals
    const byCode: Record<string, { code: string; name: string; hours: number; people: number }> = {}

    // Add line production hours (assume code 01 for regular production)
    lines.forEach((l) => {
      if (l.productionTotalHours > 0) {
        if (!byCode["PROD"]) byCode["PROD"] = { code: "PROD", name: "Producao Linhas", hours: 0, people: 0 }
        byCode["PROD"].hours += l.productionTotalHours
        byCode["PROD"].people += l.productionPeople
      }
      if (l.qualityWallTotalHours > 0) {
        if (!byCode["041"]) byCode["041"] = { code: "041", name: "Muro Qualidade", hours: 0, people: 0 }
        byCode["041"].hours += l.qualityWallTotalHours
        byCode["041"].people += l.qualityWallPeople
      }
    })

    // Add extra positions
    activeExtraPositions.forEach((p) => {
      if (!byCode[p.code]) byCode[p.code] = { code: p.code, name: p.name, hours: 0, people: 0 }
      byCode[p.code].hours += p.hours
      byCode[p.code].people += 1
    })

    const totalPeople =
      lines.reduce((sum, l) => sum + l.totalPeople, 0) +
      activeExtraPositions.length

    const totalHours =
      lines.reduce((sum, l) => sum + l.productionTotalHours + l.qualityWallTotalHours, 0) +
      activeExtraPositions.reduce((sum, p) => sum + p.hours, 0)

    return {
      lines,
      extraPositions: activeExtraPositions,
      grandTotal: {
        totalPeople,
        totalHours,
        byCode,
      },
    }
  }, [lineStatuses, extraPositions])

  // Notify parent
  useEffect(() => {
    if (onSummaryUpdate) {
      onSummaryUpdate(summary)
    }
  }, [summary, onSummaryUpdate])

  const getShiftLabel = () => {
    switch (selectedShift) {
      case "morning":
        return "Manha (06h-14h)"
      case "afternoon":
        return "Tarde (14h-22h)"
      case "night":
        return "Noite (22h-06h)"
    }
  }

  // Generate text summary for copying
  const generateTextSummary = () => {
    const lines: string[] = []
    lines.push(`RESUMO NOTIFICACAO - ${new Date(selectedDate).toLocaleDateString("pt-PT")} - ${getShiftLabel()}`)
    lines.push(`Coordenador: ${coordinatorName}`)
    lines.push("")
    lines.push("=== LINHAS ===")

    summary.lines.forEach((l) => {
      lines.push(`${l.lineName}: ${l.productName || "N/A"}`)
      lines.push(`  ${l.productionPeople}p x ${l.productionHours}h = ${l.productionTotalHours}h (Producao)`)
      if (l.qualityWallPeople > 0) {
        lines.push(`  ${l.qualityWallPeople}p x ${l.productionHours}h = ${l.qualityWallTotalHours}h (Muro 041)`)
      }
    })

    if (summary.extraPositions.length > 0) {
      lines.push("")
      lines.push("=== POSICOES EXTRA ===")
      summary.extraPositions.forEach((p) => {
        lines.push(`${p.name} (${p.code}): ${p.hours}h`)
      })
    }

    lines.push("")
    lines.push("=== TOTAIS POR CODIGO ===")
    Object.values(summary.grandTotal.byCode).forEach((c) => {
      lines.push(`${c.code} - ${c.name}: ${c.people}p = ${c.hours}h`)
    })

    lines.push("")
    lines.push(`TOTAL GERAL: ${summary.grandTotal.totalPeople} pessoas = ${summary.grandTotal.totalHours}h`)

    return lines.join("\n")
  }

  const copyToClipboard = async () => {
    const text = generateTextSummary()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadExcel = () => {
    const rows: string[][] = []

    rows.push(["RESUMO NOTIFICACAO DE TURNO"])
    rows.push(["Data", new Date(selectedDate).toLocaleDateString("pt-PT")])
    rows.push(["Turno", getShiftLabel()])
    rows.push(["Coordenador", coordinatorName])
    rows.push([])

    rows.push(["DETALHES POR LINHA"])
    rows.push(["Linha", "Produto", "Pessoas Prod", "Pessoas Muro (041)", "Total Pessoas", "Horas Prod", "Horas Producao Total", "Horas Muro Total", "Total Horas"])

    summary.lines.forEach((l) => {
      rows.push([
        l.lineName,
        l.productName || "-",
        l.productionPeople.toString(),
        l.qualityWallPeople.toString(),
        l.totalPeople.toString(),
        l.productionHours.toString(),
        l.productionTotalHours.toString(),
        l.qualityWallTotalHours.toString(),
        (l.productionTotalHours + l.qualityWallTotalHours).toString(),
      ])
    })

    rows.push([])
    rows.push(["POSICOES EXTRA"])
    rows.push(["Codigo", "Nome", "Horas"])
    summary.extraPositions.forEach((p) => {
      rows.push([p.code, p.name, p.hours.toString()])
    })

    rows.push([])
    rows.push(["TOTAIS POR CODIGO"])
    rows.push(["Codigo", "Descricao", "Pessoas", "Horas"])
    Object.values(summary.grandTotal.byCode).forEach((c) => {
      rows.push([c.code, c.name, c.people.toString(), c.hours.toString()])
    })

    rows.push([])
    rows.push(["TOTAL GERAL", "", summary.grandTotal.totalPeople.toString(), summary.grandTotal.totalHours.toString()])

    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(";")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resumo_notificacao_${selectedDate}_${selectedShift}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Resumo de Notificacao
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {summary.grandTotal.totalPeople} pessoas | {summary.grandTotal.totalHours}h
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extra Positions Checkboxes */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <Label className="font-semibold text-sm">Posicoes Extra a Notificar</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {extraPositions.map((position) => (
              <div
                key={position.id}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  position.checked
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => togglePosition(position.id)}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={position.checked}
                    onCheckedChange={() => togglePosition(position.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{position.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {position.code}
                    </Badge>
                  </div>
                </div>
                {position.checked && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={position.hours}
                      onChange={(e) => {
                        e.stopPropagation()
                        updatePositionHours(position.id, Number(e.target.value))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-xs text-muted-foreground">horas</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Lines Summary */}
        {summary.lines.length > 0 && (
          <div className="space-y-3">
            <Label className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Horas por Linha
            </Label>
            <div className="space-y-2">
              {summary.lines.map((line) => (
                <div key={line.lineId} className="p-3 bg-background border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{line.lineName}</span>
                    <span className="text-xs text-muted-foreground">{line.productName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>Producao ({line.productionPeople}p x {line.productionHours}h):</span>
                      <span className="font-bold">{line.productionTotalHours}h</span>
                    </div>
                    {line.qualityWallPeople > 0 && (
                      <div className="flex justify-between p-2 bg-amber-100 dark:bg-amber-950/30 rounded text-amber-700 dark:text-amber-400">
                        <span>Muro 041 ({line.qualityWallPeople}p x {line.productionHours}h):</span>
                        <span className="font-bold">{line.qualityWallTotalHours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra Positions Summary */}
        {summary.extraPositions.length > 0 && (
          <div className="space-y-3">
            <Label className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Posicoes Extra
            </Label>
            <div className="flex flex-wrap gap-2">
              {summary.extraPositions.map((pos, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                  {pos.name} ({pos.code}): {pos.hours}h
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Grand Total by Code */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg">
          <p className="font-semibold mb-3">Totais por Codigo</p>
          <div className="space-y-2">
            {Object.values(summary.grandTotal.byCode).map((code) => (
              <div key={code.code} className="flex justify-between items-center p-2 bg-white/10 rounded">
                <div>
                  <span className="font-mono font-bold">{code.code}</span>
                  <span className="ml-2 text-sm opacity-90">{code.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{code.hours}h</span>
                  <span className="ml-2 text-sm opacity-90">({code.people}p)</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL GERAL:</span>
            <div className="text-right">
              <span className="text-2xl font-bold">{summary.grandTotal.totalHours}h</span>
              <span className="ml-2">({summary.grandTotal.totalPeople} pessoas)</span>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="flex-1 min-h-[48px]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Resumo
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={downloadExcel}
            className="flex-1 min-h-[48px] border-green-300 text-green-700 hover:bg-green-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
