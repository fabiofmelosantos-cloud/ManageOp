import { ShiftOneBoard } from "@/components/schedule/shift-one-board"

export default function SchedulesViewPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-3 py-4 sm:px-4 sm:py-8">
        <header className="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 p-4 sm:rounded-2xl sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-5xl">Horários</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-lg">Gere o horário do Turno 1 com rotação justa das horas de almoço.</p>
        </header>
        <ShiftOneBoard />
      </div>
    </main>
  )
}
