import { type NextRequest, NextResponse } from "next/server"
import { getData, setData, deleteData, getAllKeys } from "@/lib/neon-client"

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")

  if (!key) {
    // Retorna todas as chaves
    const keys = await getAllKeys()
    return NextResponse.json({ keys })
  }

  const data = await getData(key)
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }

    const success = await setData(key, value)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 })
    }
  } catch (error) {
    console.error("[API] Error saving data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")

  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 })
  }

  const success = await deleteData(key)

  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 })
  }
}
