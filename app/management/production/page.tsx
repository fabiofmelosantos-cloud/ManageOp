"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Factory, PackageCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Pallet = { id: string; quantity: number; number: string; lot: string; expiry: string; channel: string; createdAt: string }
type ProductionSummary = {
  producedBags?: number
  rawMaterialKg?: number
  roomEnteredMpKg?: number
  mpSurplusKg?: number
  rawMaterialBags?: number
  productionDurationMs?: number
  operators?: number
  productionManHours?: number
}
type ProductionRecord = {
  productName: string
  productionLot: string
  productionDate: string
  productionExpiry: string
  pallets: Pallet[]
  closedAt?: string
  summary?: ProductionSummary
}

function formatBags(kg: number) {
  const fullBags = Math.floor(kg / 25)
  const restKg = kg - fullBags * 25
  if (fullBags <= 0) return `${restKg.toFixed(2)} kg`
  if (restKg <= 0.01) return `${fullBags} saco${fullBags === 1 ? "" : "s"} de 25 kg`
  return `${fullBags} saco${fullBags === 1 ? "" : "s"} de 25 kg + ${restKg.toFixed(2)} kg`
}

function dayKey(record: ProductionRecord) {
  if (record.productionDate) return record.productionDate
  if (record.closedAt) return record.closedAt.slice(0, 10)
  return "sem-data"
}

function formatDayLabel(key: string) {
  if (key === "sem-data") return "Sem data de produção"
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
}

export default function ProductionBackupPage() {
  const [history, setHistory] = useState<ProductionRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void fetch("/api/data?key=honetop_production_history")
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.data)) setHistory(payload.data)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const groups = useMemo(() => {
    const map = new Map<string, ProductionRecord[]>()
    for (const record of history) {
      const key = dayKey(record)
      const existing = map.get(key)
      if (existing) existing.push(record)
      else map.set(key, [record])
    }
    return Array.from(map.entries())
      .map(([key, records]) => ({
        key,
        records: records.slice().sort((a, b) => (a.closedAt ?? "").localeCompare(b.closedAt ?? "")),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [history])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/management">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Produção</h1>
          <p className="text-sm text-muted-foreground">
            Backup do histórico de produções fechadas, separado por dia de produção.
          </p>
        </div>
      </header>

      {!loaded && <p className="text-sm text-muted-foreground">A carregar histórico...</p>}

      {loaded && groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ainda não existem produções fechadas registadas.
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Factory className="size-4 text-primary" />
                {formatDayLabel(group.key)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {group.records.length} produção{group.records.length === 1 ? "" : "ões"} fechada
                {group.records.length === 1 ? "" : "s"} neste dia
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.records.map((record, index) => {
                const kg =
                  record.summary?.roomEnteredMpKg != null
                    ? Math.max(record.summary.roomEnteredMpKg - (record.summary.mpSurplusKg ?? 0), 0)
                    : (record.summary?.rawMaterialKg ?? 0)
                const totalBags = record.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)
                return (
                  <div key={record.closedAt ?? index} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {record.productName || "Produto sem nome"} · Lote {record.productionLot || "-"}
                      </p>
                      {record.closedAt && (
                        <span className="text-xs text-muted-foreground">
                          Fechado em {new Date(record.closedAt).toLocaleString("pt-PT")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                      <PackageCheck className="size-3.5" />
                      {record.pallets.length} palete{record.pallets.length === 1 ? "" : "s"} · {totalBags} unidades ·
                      MP gasta: {kg.toFixed(2)} kg ({formatBags(kg)})
                    </p>
                    {record.summary?.productionDurationMs ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tempo de produção: {Math.round(record.summary.productionDurationMs / 3600000 * 100) / 100} h ·{" "}
                        {record.summary.operators ?? 0} operador(es) ·{" "}
                        {(record.summary.productionManHours ?? 0).toFixed(2)} horas-homem
                      </p>
                    ) : null}
                    {record.pallets.length > 0 && (
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                        {record.pallets.map((pallet) => (
                          <div key={pallet.id} className="rounded-md bg-muted/50 px-2 py-1 text-xs">
                            Palete {pallet.number} · {pallet.quantity} un · {pallet.channel} · Lote {pallet.lot}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
