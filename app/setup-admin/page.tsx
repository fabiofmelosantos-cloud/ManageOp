"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"

export default function SetupAdminPage() {
  const [email, setEmail] = useState("admin@manageop.com")
  const [password, setPassword] = useState("admin123")
  const [name, setName] = useState("Administrador")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const createAdmin = async () => {
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const supabase = createBrowserClient()

      // Criar utilizador no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "admin",
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Criar perfil na tabela profiles
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          name,
          role: "admin",
          employee_id: "ADMIN001",
        })

        if (profileError) throw profileError

        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || "Erro ao criar administrador")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-slate-800/50 border-slate-700">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin Criado com Sucesso!</h2>
            <p className="text-slate-400">Pode agora fazer login com as credenciais:</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg text-left space-y-2">
            <p className="text-sm text-slate-400">Email:</p>
            <p className="text-white font-mono">{email}</p>
            <p className="text-sm text-slate-400 mt-4">Password:</p>
            <p className="text-white font-mono">{password}</p>
          </div>
          <Button asChild className="w-full">
            <a href="/auth/login">
              Ir para Login <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 border-slate-700">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Criar Administrador</h1>
          <p className="text-slate-400">Configure o primeiro utilizador administrador do sistema</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">
              Nome
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white"
              placeholder="Nome do administrador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white"
              placeholder="admin@manageop.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <Button onClick={createAdmin} disabled={loading} className="w-full" size="lg">
            {loading ? "Criando..." : "Criar Administrador"}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Esta página está disponível apenas para configuração inicial.
          <br />
          Após criar o admin, aceda através da página de login.
        </p>
      </Card>
    </div>
  )
}
