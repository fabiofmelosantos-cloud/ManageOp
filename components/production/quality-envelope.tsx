"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type QcAnswer,
  type QcResponse,
  type QcRoom,
  currentHourSlot,
  dayKey,
  loadQcConfig,
  loadQcResponses,
  questionsForHour,
  saveQcResponses,
} from "@/lib/quality"

export function QualityEnvelope({ room }: { room: QcRoom }) {
  const [questions, setQuestions] = useState<{ id: string; label: string; hour: string }[]>([])
  const [responses, setResponses] = useState<QcResponse[]>([])
  const [now, setNow] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [lot, setLot] = useState("")
  const [draft, setDraft] = useState<Record<string, QcAnswer>>({})
  const [message, setMessage] = useState("")
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBeepHourRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    void loadQcConfig().then((config) => {
      if (active) setQuestions(config[room] ?? [])
    })
    void loadQcResponses().then((list) => {
      if (active) setResponses(list)
    })
    return () => {
      active = false
    }
  }, [room])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const today = dayKey(now)
  const hourSlot = currentHourSlot(now)
  const hourQuestions = useMemo(
    () => (hourSlot ? questionsForHour(questions, hourSlot) : []),
    [questions, hourSlot],
  )
  const answeredThisHour = useMemo(
    () => responses.some((r) => r.room === room && r.date === today && r.hour === hourSlot),
    [responses, room, today, hourSlot],
  )
  const pending = hourSlot !== null && hourQuestions.length > 0 && !answeredThisHour

  useEffect(() => {
    if (!pending || !hourSlot) return
    if (lastBeepHourRef.current === hourSlot) return
    lastBeepHourRef.current = hourSlot
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtxRef.current ?? new Ctx()
      audioCtxRef.current = ctx
      const beep = (delay: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.4)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.42)
      }
      beep(0)
      beep(0.55)
    } catch {
      // Ignora falhas de áudio (política de autoplay do navegador)
    }
  }, [pending, hourSlot])

  function openDialog() {
    setDraft({})
    setLot("")
    setMessage("")
    setOpen(true)
  }

  const allAnswered = hourQuestions.length > 0 && hourQuestions.every((q) => draft[q.id])
  const draftHasNok = hourQuestions.some((q) => draft[q.id] === "nok")

  async function submit() {
    if (!hourSlot) return
    if (!lot.trim()) {
      setMessage("Indique o lote em produção.")
      return
    }
    if (!allAnswered) {
      setMessage("Responda a todas as perguntas.")
      return
    }
    const answers = hourQuestions.map((q) => ({ questionId: q.id, label: q.label, answer: draft[q.id] }))
    const record: QcResponse = {
      id: `qc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      room,
      date: today,
      hour: hourSlot,
      lot: lot.trim(),
      answers,
      hasNok: answers.some((a) => a.answer === "nok"),
      respondedAt: new Date().toISOString(),
    }
    const next = [...responses, record]
    setResponses(next)
    await saveQcResponses(next)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant={pending ? "destructive" : "outline"}
        size="icon"
        aria-label={`Controlo de qualidade da sala ${room}`}
        title="Controlo de qualidade"
        onClick={openDialog}
        className={
          pending
            ? "absolute left-3 top-3 z-20 animate-pulse ring-2 ring-red-500"
            : "absolute left-3 top-3 z-20"
        }
      >
        <Mail className="size-4" />
        {pending && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {hourQuestions.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlo de qualidade{hourSlot ? ` · ${hourSlot}` : ""}</DialogTitle>
            <DialogDescription>
              Responda às perguntas definidas pela Qualidade para esta hora. Uma resposta NOK impede o arranque da
              linha.
            </DialogDescription>
          </DialogHeader>
          {!hourSlot ? (
            <p className="text-sm text-muted-foreground">
              Fora do horário de controlo de qualidade (não se aplica às 17:00 nem às 18:00).
            </p>
          ) : hourQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              A Qualidade ainda não configurou perguntas para esta sala nesta hora. Configure em Configurações ›
              Qualidade.
            </p>
          ) : answeredThisHour ? (
            <p className="rounded-md bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-700">
              As perguntas desta hora já foram respondidas.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="qc-lot">Lote em produção</Label>
                <Input id="qc-lot" value={lot} onChange={(event) => setLot(event.target.value)} placeholder="Ex.: L-2026-001" />
              </div>
              {hourQuestions.map((question) => (
                <div key={question.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <span className="text-sm">{question.label}</span>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant={draft[question.id] === "ok" ? "default" : "outline"}
                      onClick={() => setDraft((current) => ({ ...current, [question.id]: "ok" }))}
                    >
                      OK
                    </Button>
                    <Button
                      size="sm"
                      variant={draft[question.id] === "nok" ? "destructive" : "outline"}
                      onClick={() => setDraft((current) => ({ ...current, [question.id]: "nok" }))}
                    >
                      NOK
                    </Button>
                  </div>
                </div>
              ))}
              {draftHasNok && (
                <p className="rounded-md bg-red-600/10 px-3 py-2 text-sm font-semibold text-red-700">
                  Existe uma resposta NOK — a linha não pode arrancar até ser corrigida.
                </p>
              )}
              {message && <p className="text-sm text-destructive">{message}</p>}
              <Button onClick={() => void submit()} disabled={!allAnswered || !lot.trim()}>
                Guardar respostas
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
