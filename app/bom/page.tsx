import Link from "next/link"
import { ArrowLeft, Boxes, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BomPage() {
  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar ao dashboard">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Gestão de produção</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">BOM</h1>
          </div>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Boxes aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Bill of Materials</CardTitle>
                <CardDescription>Consulte e organize os materiais necessários para cada produto.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-6 text-center">
              <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Nenhuma BOM criada</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  As estruturas de materiais dos produtos aparecerão aqui quando forem criadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export const metadata = {
  title: "BOM | ManageOp",
  description: "Gestão de Bill of Materials na ManageOp.",
}

