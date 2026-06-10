import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Usar Service Role Key para criar utilizador
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const email = "admin@manageop.com"
    const password = "admin123"

    // Criar utilizador no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: "Administrador",
      },
    })

    if (authError) {
      console.error("[v0] Erro ao criar utilizador:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Criar perfil na tabela profiles
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      employee_id: "admin",
      name: "Administrador",
      role: "admin",
    })

    if (profileError) {
      console.error("[v0] Erro ao criar perfil:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Utilizador admin criado com sucesso",
      credentials: {
        email,
        password,
      },
    })
  } catch (error: any) {
    console.error("[v0] Erro geral:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
