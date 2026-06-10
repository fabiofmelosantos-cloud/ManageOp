"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Factory } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [role, setRole] = useState<"coordinator" | "manager" | "rh">("coordinator")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!name || name.trim().length === 0) {
      setError("O nome é obrigatório")
      setIsLoading(false)
      return
    }

    if (!employeeId || employeeId.trim().length === 0) {
      setError("O número de colaborador é obrigatório")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name,
          employeeId,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar conta")
      }

      router.push("/auth/register-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ManageOp</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão de Produção</p>
          </div>

          <Card className="border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
              <CardDescription>Registe-se para aceder ao sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="João Silva"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Número de Colaborador</Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Ex: 12345"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este número será usado como utilizador e senha para login
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coordinator">Coordenador</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                      <SelectItem value="rh">RH (Recursos Humanos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "A criar conta..." : "Criar Conta"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Ao criar uma conta, concorda com os nossos Termos e Política de Privacidade
          </p>
        </div>
      </div>
    </div>
  )
}
