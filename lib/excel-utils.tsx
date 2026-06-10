import type { Schedule, Worker, ProductionLine, Product, Specialty } from "./types"

export function exportScheduleToExcel(
  schedule: Schedule,
  workers: Worker[],
  productionLines: ProductionLine[],
  products: Product[],
  specialties: Specialty[],
) {
  // Organizar dados por data e turno
  const scheduleGrid = schedule.days.reduce(
    (acc, day) => {
      const dateKey = day.date
      if (!acc[dateKey]) acc[dateKey] = {}
      acc[dateKey][day.shift] = day.assignments
      return acc
    },
    {} as Record<string, Record<string, (typeof schedule.days)[0]["assignments"]>>,
  )

  const sortedDates = Object.keys(scheduleGrid).sort()

  // Obter todos os postos únicos de todas as linhas
  const allPositions = new Set<string>()
  schedule.days.forEach((day) => {
    day.assignments.forEach((assignment) => {
      if (assignment.positionName) {
        allPositions.add(assignment.positionName)
      }
    })
  })

  const positionsList = Array.from(allPositions).sort()

  // Gerar HTML com estilo idêntico ao Excel
  let htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A3 landscape; margin: 5mm; }
        body { 
          font-family: 'Calibri', Arial, sans-serif; 
          margin: 0; 
          padding: 0;
          font-size: 10pt;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 2px 4px;
          text-align: center;
          vertical-align: middle;
          font-size: 9pt;
        }
        
        /* Cabeçalho roxo escuro */
        .header-row th {
          background-color: #5B2C6F;
          color: white;
          font-weight: bold;
          padding: 4px;
          font-size: 9pt;
        }
        
        /* Cabeçalho de datas */
        .date-header {
          background-color: #5B2C6F;
          color: white;
          font-weight: bold;
          font-size: 8pt;
        }
        
        /* Coluna de postos */
        .position-cell {
          background-color: #D9D9D9;
          font-weight: bold;
          text-align: left;
          padding-left: 8px;
          font-size: 9pt;
          width: 150px;
        }
        
        /* Células de turnos - cabeçalho */
        .shift-header {
          background-color: #5B2C6F;
          color: white;
          font-weight: bold;
          font-size: 8pt;
          width: 30px;
        }
        
        /* Células de dados vazias */
        .empty-cell {
          background-color: white;
        }
        
        /* Cores das células com operadores */
        .worker-cell {
          font-size: 8pt;
          padding: 1px;
          color: #000;
        }
        
        /* Cores conforme imagem */
        .color-green { background-color: #C6EFCE; }
        .color-blue { background-color: #BDD7EE; }
        .color-pink { background-color: #F4B5D4; }
        .color-orange { background-color: #FFC7CE; }
        .color-yellow { background-color: #FFEB9C; }
        .color-purple { background-color: #E4DFEC; }
        .color-red { background-color: #FF0000; color: white; }
        
        /* Linha de totais */
        .total-row {
          background-color: #5B2C6F;
          color: white;
          font-weight: bold;
          font-size: 9pt;
        }
        
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr class="header-row">
            <th rowspan="2" style="width: 150px;">Postos de Trabalho</th>
  `

  // Cabeçalhos de datas
  sortedDates.forEach((dateStr) => {
    const date = new Date(dateStr)
    const dayName = date.toLocaleDateString("pt-PT", { weekday: "long" })
    const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    const formattedDate = date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })

    htmlContent += `
      <th colspan="3" class="date-header">
        ${dayNameCapitalized}<br/>${formattedDate}
      </th>
    `
  })

  htmlContent += `
          </tr>
          <tr class="header-row">
  `

  // Cabeçalhos de turnos (T1, T2, T3)
  sortedDates.forEach(() => {
    htmlContent += `
      <th class="shift-header">T1</th>
      <th class="shift-header">T2</th>
      <th class="shift-header">T3</th>
    `
  })

  htmlContent += `
          </tr>
        </thead>
        <tbody>
  `

  // Função para obter cor baseada no nome do operador (consistente)
  const getWorkerColor = (workerName: string): string => {
    const colors = ["color-green", "color-blue", "color-pink", "color-orange", "color-yellow", "color-purple"]
    const hash = workerName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Linhas de postos
  positionsList.forEach((positionName) => {
    htmlContent += `<tr>`
    htmlContent += `<td class="position-cell">${positionName}</td>`

    sortedDates.forEach((dateStr) => {
      const shifts: Array<"morning" | "afternoon" | "night"> = ["morning", "afternoon", "night"]

      shifts.forEach((shift) => {
        const dayShifts = scheduleGrid[dateStr] || {}
        const assignments = (dayShifts[shift] || []).filter((a) => a.positionName === positionName)

        if (assignments.length > 0) {
          const worker = workers.find((w) => w.id === assignments[0].workerId)
          const workerName = worker?.name || ""
          const colorClass = getWorkerColor(workerName)

          htmlContent += `<td class="worker-cell ${colorClass}">${workerName}</td>`
        } else {
          htmlContent += `<td class="empty-cell"></td>`
        }
      })
    })

    htmlContent += `</tr>`
  })

  // Linha de totais (opcional - conforme imagem tem números no fundo)
  htmlContent += `
          <tr class="total-row">
            <td>TOTAL</td>
  `

  sortedDates.forEach((dateStr) => {
    const shifts: Array<"morning" | "afternoon" | "night"> = ["morning", "afternoon", "night"]

    shifts.forEach((shift) => {
      const dayShifts = scheduleGrid[dateStr] || {}
      const assignments = dayShifts[shift] || []
      const total = assignments.length

      htmlContent += `<td>${total}</td>`
    })
  })

  htmlContent += `
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `

  // Criar e fazer download
  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `escala_${schedule.name.replace(/\s+/g, "_")}.xls`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export interface ProductionPlanImport {
  lineName: string
  productName: string
  workersNeeded: number
  specialties: string[]
}

export function parseProductionPlanCSV(csvText: string): ProductionPlanImport[] {
  const lines = csvText.split("\n").filter((line) => line.trim())

  // Remover BOM se existir
  if (lines[0].charCodeAt(0) === 0xfeff) {
    lines[0] = lines[0].substring(1)
  }

  // Validar cabeçalho esperado
  const header = lines[0].toLowerCase()
  if (!header.includes("linha") || !header.includes("produto")) {
    throw new Error("Formato de CSV inválido. Cabeçalho esperado: Linha,Produto,Trabalhadores,Especialidades")
  }

  const results: ProductionPlanImport[] = []

  // Processar linhas de dados (ignorar cabeçalho)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(",").map((p) => p.trim())

    if (parts.length < 3) continue

    const lineName = parts[0]
    const productName = parts[1]
    const workersNeeded = Number.parseInt(parts[2], 10)
    const specialties = parts.slice(3).filter((s) => s)

    if (lineName && productName && !isNaN(workersNeeded)) {
      results.push({
        lineName,
        productName,
        workersNeeded,
        specialties,
      })
    }
  }

  return results
}

export function exportProductionPlanTemplate() {
  const csvRows: string[] = []

  // Cabeçalho
  csvRows.push("Linha,Produto,Trabalhadores,Especialidade1,Especialidade2,Especialidade3")

  // Exemplo
  csvRows.push("Linha 1,Produto A,5,Operador,Técnico,")
  csvRows.push("Linha 2,Produto B,3,Operador,,")

  // Criar blob e fazer download
  const csvContent = csvRows.join("\n")
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "template_plano_producao.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
