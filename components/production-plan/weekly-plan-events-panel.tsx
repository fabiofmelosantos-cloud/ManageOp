"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Calendar, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface DailyEvent {
  id: string
  date: string
  eventType: "audit" | "visit" | "maintenance" | "other"
  title: string
  description?: string
  startTime?: string
  endTime?: string
}

interface WeeklyPlanEventsPanelProps {
  events: DailyEvent[]
  startDate: string
  onAddEvent: (event: Omit<DailyEvent, "id">) => void
  onRemoveEvent: (eventId: string) => void
  readOnly?: boolean
}

const EVENT_TYPES = {
  audit: { label: "Auditoria", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
  visit: { label: "Visita", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  maintenance: {
    label: "Manutenção",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
  other: { label: "Outro", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
}

export function WeeklyPlanEventsPanel({
  events,
  startDate,
  onAddEvent,
  onRemoveEvent,
  readOnly,
}: WeeklyPlanEventsPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newEvent, setNewEvent] = useState<Omit<DailyEvent, "id">>({
    date: startDate,
    eventType: "audit",
    title: "",
    description: "",
    startTime: "",
    endTime: "",
  })

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) return

    onAddEvent(newEvent)
    setNewEvent({
      date: startDate,
      eventType: "audit",
      title: "",
      description: "",
      startTime: "",
      endTime: "",
    })
    setIsAdding(false)
  }

  // Agrupar eventos por data
  const eventsByDate = events.reduce(
    (acc, event) => {
      if (!acc[event.date]) {
        acc[event.date] = []
      }
      acc[event.date].push(event)
      return acc
    },
    {} as Record<string, DailyEvent[]>,
  )

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Eventos Especiais
          </CardTitle>
          {!readOnly && (
            <Button onClick={() => setIsAdding(true)} size="sm" disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Evento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && !readOnly && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select
                    value={newEvent.eventType}
                    onValueChange={(value) => setNewEvent({ ...newEvent, eventType: value as DailyEvent["eventType"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título do Evento</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ex: Auditoria ISO 9001"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Detalhes adicionais sobre o evento..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início (opcional)</Label>
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim (opcional)</Label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={!newEvent.title.trim()}>
                  Guardar Evento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(eventsByDate).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento especial registado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(eventsByDate)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, dateEvents]) => (
                <div key={date} className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-PT", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </h4>
                  <div className="space-y-2">
                    {dateEvents.map((event) => (
                      <Card key={event.id} className="relative">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={EVENT_TYPES[event.eventType].color}>
                                  {EVENT_TYPES[event.eventType].label}
                                </Badge>
                                <h5 className="font-semibold">{event.title}</h5>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              )}
                              {(event.startTime || event.endTime) && (
                                <p className="text-xs text-muted-foreground">
                                  {event.startTime && `${event.startTime}`}
                                  {event.startTime && event.endTime && " - "}
                                  {event.endTime && `${event.endTime}`}
                                </p>
                              )}
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveEvent(event.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
