"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  QC_HOURS,
  QC_ROOMS,
  type QcConfig,
  type QcQuestion,
  type QcRoom,
  emptyQcConfig,
  loadQcConfig,
  saveQcConfig,
} from "@/lib/quality"

export function QualityConfigPanel() {
  const [room, setRoom] = useState<QcRoom>("honetop")
  const [config, setConfig] = useState<QcConfig>(emptyQcConfig)
  const [label, setLabel] = useState("")
  const [hour, setHour] = useState("all")
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    void loadQcConfig().then((data) => {
      setConfig(data)
      setLoaded(true)
    })
  }, [])

  const questions = config[room] ?? []

  async function persist(next: QcConfig) {
    setConfig(next)
    await saveQcConfig(next)
  }

  async function addQuestion() {
    if (!label.trim()) {
      setMessage("Escreva o texto da pergunta.")
      return
    }
    const question: QcQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim(),
      hour,
    }
    await persist({ ...config, [room]: [...questions, question] })
    setLabel("")
    setHour("all")
    setMessage("Pergunta adicionada.")
  }

  async function removeQuestion(id: string) {
    await persist({ ...config, [room]: questions.filter((question) => question.id !== id) })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Perguntas de controlo de qualidade</CardTitle>
          <CardDescription>
            Escolha a sala e crie as perguntas que o operador terá de responder hora a hora. Use &quot;Todas as
            horas&quot; para uma pergunta recorrente ou selecione uma hora específica.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qc-room">Sala</Label>
            <select
              id="qc-room"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={room}
              onChange={(event) => setRoom(event.target.value as QcRoom)}
            >
              {QC_ROOMS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qc-label">Pergunta</Label>
            <Input
              id="qc-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: Zona de produção limpa e sem objetos estranhos?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qc-hour">Aplicar em</Label>
            <select
              id="qc-hour"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={hour}
              onChange={(event) => setHour(event.target.value)}
            >
              <option value="all">Todas as horas</option>
              {QC_HOURS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Button onClick={() => void addQuestion()}>
            <Plus className="size-4" />
            Adicionar pergunta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perguntas configuradas · {QC_ROOMS.find((option) => option.id === room)?.label}</CardTitle>
          <CardDescription>{questions.length} pergunta(s) para esta sala.</CardDescription>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <p className="py-8 text-center text-sm text-muted-foreground">A carregar...</p>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não há perguntas para esta sala.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {questions.map((question) => (
                <div key={question.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{question.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {question.hour === "all" ? "Todas as horas" : `Apenas às ${question.hour}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar pergunta"
                    className="text-destructive"
                    onClick={() => void removeQuestion(question.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
