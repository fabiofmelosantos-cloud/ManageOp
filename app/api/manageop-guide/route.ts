import { readFile } from "node:fs/promises"
import { join } from "node:path"

export async function GET() {
  const file = await readFile(join(process.cwd(), "docs", "ManageOp-fundamento-e-guia-de-utilizacao.docx"))

  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="ManageOp-fundamento-e-guia-de-utilizacao.docx"',
      "Cache-Control": "public, max-age=3600",
    },
  })
}
