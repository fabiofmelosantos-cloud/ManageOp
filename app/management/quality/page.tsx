import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function QualityPage() {
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
            <p className="text-sm text-muted-foreground">Controlo de qualidade da produção.</p>
          </div>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Controlo de qualidade da linha</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            As verificações de qualidade da linha Honetop são respondidas hora a hora no quadro de escalas, através do
            envelope de alerta no canto superior direito do quadro.
          </p>
          <p>
            Cada hora exige as respostas OK/NOK às perguntas de controlo (zona limpa, teste de arranque, selamento e
            lote validados; teste organolético às 09:00). Uma resposta NOK bloqueia o arranque da linha.
          </p>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/schedules">Ir para o quadro de escalas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
