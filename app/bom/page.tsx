import Link from "next/link"
import { ArrowLeft, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StockManagement } from "@/components/bom/stock-management"

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
            <StockManagement />
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

