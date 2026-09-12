import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getData } from "@/lib/neon-client"

const ALLOWED_SHEETS = new Set(["honetop", "barritas"])

export async function GET(request: Request) {
  const requestedDate = new URL(request.url).searchParams.get("date")
  try {
    const settings = await getData("spreadsheet_settings") as { url?: string } | null
    const url = settings?.url ?? ""
    if (!url) return NextResponse.json({ error: "Configure o link da planilha em Configurações." }, { status: 400 })

    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`)
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array", cellDates: true })
    const sheets = workbook.SheetNames.filter((name) => ALLOWED_SHEETS.has(name.trim().toLocaleLowerCase()))
    const summary = sheets.map((sheetName) => {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" })
      const filteredRows = requestedDate ? rows.filter((row) => Object.values(row).some((value) => {
        if (value instanceof Date) return value.toISOString().slice(0, 10) === requestedDate
        return String(value).includes(requestedDate) || String(value).split("T")[0] === requestedDate
      })) : rows
      return {
        sheet: sheetName,
        rows: filteredRows.slice(0, 8).map((row) => Object.fromEntries(Object.entries(row).slice(0, 8))),
        totalRows: filteredRows.length,
      }
    })
    return NextResponse.json({ summary, sheets })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler a planilha." }, { status: 502 })
  }
}
