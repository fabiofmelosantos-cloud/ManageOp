import { type NextRequest, NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"

interface RegisteredUser {
  id: string
  name: string
  employeeId: string
  role: "coordinator" | "manager" | "rh"
  createdAt: string
  isApproved: boolean
}

async function getUsers(): Promise<RegisteredUser[]> {
  const users = await getData("registered_users")
  return users || []
}

async function saveUsers(users: RegisteredUser[]): Promise<boolean> {
  return await setData("registered_users", users)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "register") {
      const { name, employeeId, role } = body

      if (!name || !employeeId || !role) {
        return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
      }

      const users = await getUsers()

      // Verificar se número de colaborador já existe
      if (users.some((u) => u.employeeId === employeeId)) {
        return NextResponse.json({ error: "Este número de colaborador já está registado" }, { status: 400 })
      }

      const newUser: RegisteredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        employeeId,
        role,
        createdAt: new Date().toISOString(),
        isApproved: true, // Auto-aprovado por agora
      }

      users.push(newUser)
      await saveUsers(users)

      return NextResponse.json({
        success: true,
        message: "Conta criada com sucesso",
        user: {
          id: newUser.id,
          name: newUser.name,
          employeeId: newUser.employeeId,
          role: newUser.role,
        },
      })
    }

    if (action === "login") {
      const { employeeId } = body

      if (!employeeId) {
        return NextResponse.json({ error: "Número de colaborador é obrigatório" }, { status: 400 })
      }

      const users = await getUsers()
      const user = users.find((u) => u.employeeId === employeeId)

      if (!user) {
        return NextResponse.json({ error: "Número de colaborador não encontrado" }, { status: 401 })
      }

      if (!user.isApproved) {
        return NextResponse.json({ error: "A sua conta ainda não foi aprovada" }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          employeeId: user.employeeId,
          role: user.role,
        },
      })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("[Auth API] Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET() {
  // Endpoint para listar utilizadores (apenas para admin)
  const users = await getUsers()

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      employeeId: u.employeeId,
      role: u.role,
      createdAt: u.createdAt,
      isApproved: u.isApproved,
    })),
  })
}
