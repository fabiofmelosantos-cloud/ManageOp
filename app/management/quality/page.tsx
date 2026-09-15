"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QC_ROOMS, type QcResponse, type QcRoom, loadQcResponses } from "@/lib/quality"

type Group = {
  room: QcRoom
  date: string
  lot: string
  responses: QcResponse[]
  hasNok: boolean
}

export default function QualityPage() {
  const [responses, setResponses] = useState<QcResponse[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadQcResponses().then((list) => {
      setResponses(list)
      setLoaded(true)
    })
  }, [])

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const response of responses) {
      const key = `${response.room}__${response.date}__${response.lot}`
      const existing = map.get(key)
      if (existing) {
        existing.responses.push(response)
        existing.hasNok = existing.hasNok || response.hasNok
      } else {
        map.set(key, {
          room: response.room,
          date: response.date,
          lot: response.lot,
          responses: [response],
          hasNok: response.hasNok,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [responses])

  const roomLabel = (room: QcRoom) => QC_ROOMS.find((option) => option.id === room)?.label ?? room

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-2">
          <Link href="/management">
            <ArrowLeft className="size-4" /> Voltar à Gestão
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Qualidade</h1>
            <p className="text-sm text-muted-foreground">
              Respostas do controlo de qualidade das salas de produção, por sala, lote e dia.
            </p>
          </div>
        </div>
      </header>

      {!loaded ? (
        <p className="py-12 text-center text-sm text-muted-foreground">A carregar respostas...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Ainda não há respostas de controlo de qualidade. As perguntas são configuradas em Configurações › Qualidade
            e respondidas nas salas de produção através do envelope.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const sortedResponses = group.responses.slice().sort((a, b) => (a.hour < b.hour ? -1 : 1))
            return (
              <Card
                key={`${group.room}-${group.date}-${group.lot}`}
                className={group.hasNok ? "border-red-500/50" : "border-emerald-500/40"}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {roomLabel(group.room)} · Lote {group.lot}
                    </CardTitle>
                    <span
                      className={
                        group.hasNok
                          ? "rounded-full bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-700"
                          : "rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                      }
                    >
                      {group.hasNok ? "Não conformidade" : "Conforme"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(group.date).toLocaleDateString("pt-PT")} · {group.responses.length} hora(s) respondida(s)
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {sortedResponses.map((response) => (
                    <div key={response.id} className="rounded-lg border p-3">
                      <p className="mb-2 text-sm font-medium">{response.hour}</p>
                      <ul className="flex flex-col gap-1.5">
                        {response.answers.map((answer) => (
                          <li key={answer.questionId} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-muted-foreground">{answer.label}</span>
                            {answer.answer === "ok" ? (
                              <span className="flex shrink-0 items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="size-4" /> OK
                              </span>
                            ) : (
                              <span className="flex shrink-0 items-center gap-1 font-semibold text-red-700">
                                <XCircle className="size-4" /> NOK
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
