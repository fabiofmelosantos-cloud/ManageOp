export type QcRoom = "honetop" | "barritas"
export type QcAnswer = "ok" | "nok"

export const QC_ROOMS: { id: QcRoom; label: string }[] = [
  { id: "honetop", label: "Honetop" },
  { id: "barritas", label: "Barritas" },
]

// Horas de produção onde o controlo de qualidade é exigido (exclui 17:00 e 18:00)
export const QC_HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]

// Uma pergunta configurada pela Qualidade. `hour` é "all" (todas as horas) ou uma hora específica.
export type QcQuestion = {
  id: string
  label: string
  hour: string
}

export type QcConfig = Record<QcRoom, QcQuestion[]>

export type QcAnswerEntry = { questionId: string; label: string; answer: QcAnswer }

export type QcResponse = {
  id: string
  room: QcRoom
  date: string // YYYY-MM-DD
  hour: string // HH:00
  lot: string
  answers: QcAnswerEntry[]
  hasNok: boolean
  respondedAt: string
}

const CONFIG_KEY = "quality_questions"
const RESPONSES_KEY = "quality_responses"

export const emptyQcConfig: QcConfig = { honetop: [], barritas: [] }

async function readKey<T>(key: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`/api/data?key=${encodeURIComponent(key)}`)
    if (!response.ok) return fallback
    const { data } = await response.json()
    return (data ?? fallback) as T
  } catch {
    return fallback
  }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

export async function loadQcConfig(): Promise<QcConfig> {
  const config = await readKey<QcConfig>(CONFIG_KEY, emptyQcConfig)
  return { honetop: config.honetop ?? [], barritas: config.barritas ?? [] }
}

export async function saveQcConfig(config: QcConfig): Promise<void> {
  await writeKey(CONFIG_KEY, config)
}

export async function loadQcResponses(): Promise<QcResponse[]> {
  return readKey<QcResponse[]>(RESPONSES_KEY, [])
}

export async function saveQcResponses(responses: QcResponse[]): Promise<void> {
  await writeKey(RESPONSES_KEY, responses)
}

export function questionsForHour(questions: QcQuestion[], hour: string): QcQuestion[] {
  return questions.filter((question) => question.hour === "all" || question.hour === hour)
}

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function currentHourSlot(date = new Date()): string | null {
  const slot = `${String(date.getHours()).padStart(2, "0")}:00`
  return QC_HOURS.includes(slot) ? slot : null
}
