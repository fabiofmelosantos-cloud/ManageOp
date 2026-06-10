type TimerCallback = (lineId: string, producedQuantity: number) => void

class ProductionTimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private callbacks: Map<string, TimerCallback> = new Map()
  private storageKey = "production_timers"

  constructor() {
    if (typeof window !== "undefined") {
      this.loadTimersFromStorage()
      this.startGlobalInterval()
    }
  }

  private loadTimersFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const timers = JSON.parse(stored)
        Object.entries(timers).forEach(([key, data]: [string, any]) => {
          if (data.isRunning && !data.isPaused) {
            this.startTimer(key, data.targetQuantity, data.lineCapacity, data.startTime)
          }
        })
      }
    } catch (error) {
      console.error("[v0] Error loading timers:", error)
    }
  }

  private saveTimerToStorage(
    key: string,
    data: {
      targetQuantity: number
      lineCapacity: number
      startTime: string
      isRunning: boolean
      isPaused: boolean
      producedQuantity: number
      pausedAt?: string // Timestamp de quando foi pausado
      totalPausedTime?: number // Tempo total pausado em ms
    },
  ) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const timers = stored ? JSON.parse(stored) : {}
      timers[key] = data
      localStorage.setItem(this.storageKey, JSON.stringify(timers))
    } catch (error) {
      console.error("[v0] Error saving timer:", error)
    }
  }

  private removeTimerFromStorage(key: string) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const timers = JSON.parse(stored)
        delete timers[key]
        localStorage.setItem(this.storageKey, JSON.stringify(timers))
      }
    } catch (error) {
      console.error("[v0] Error removing timer:", error)
    }
  }

  private startGlobalInterval() {
    setInterval(() => {
      try {
        const stored = localStorage.getItem(this.storageKey)
        if (!stored) return

        const timers = JSON.parse(stored)
        const now = new Date()

        Object.entries(timers).forEach(([key, data]: [string, any]) => {
          if (data.isRunning && !data.isPaused && data.startTime) {
            const start = new Date(data.startTime)
            const totalPausedTime = data.totalPausedTime || 0
            const realElapsedTime = now.getTime() - start.getTime() - totalPausedTime
            const hoursElapsed = realElapsedTime / (1000 * 60 * 60)
            const calculated = Math.min(hoursElapsed * data.lineCapacity, data.targetQuantity)

            data.producedQuantity = calculated

            if (calculated >= data.targetQuantity) {
              data.isRunning = false
            }

            this.saveTimerToStorage(key, data)

            const callback = this.callbacks.get(key)
            if (callback) {
              callback(key, calculated)
            }

            window.dispatchEvent(
              new CustomEvent("production-timer-update", {
                detail: { key, producedQuantity: calculated, isRunning: data.isRunning },
              }),
            )
          }
        })
      } catch (error) {
        console.error("[v0] Error in global interval:", error)
      }
    }, 1000)
  }

  startTimer(key: string, targetQuantity: number, lineCapacity: number, startTime: string) {
    console.log(`[v0] Starting timer for ${key}`)
    this.saveTimerToStorage(key, {
      targetQuantity,
      lineCapacity,
      startTime,
      isRunning: true,
      isPaused: false,
      producedQuantity: 0,
      totalPausedTime: 0, // Inicializa tempo pausado
    })
  }

  pauseTimer(key: string) {
    console.log(`[v0] Pausing timer for ${key}`)
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      const timers = JSON.parse(stored)
      if (timers[key]) {
        timers[key].isPaused = true
        timers[key].pausedAt = new Date().toISOString() // Registra quando foi pausado
        localStorage.setItem(this.storageKey, JSON.stringify(timers))
      }
    }
  }

  resumeTimer(key: string) {
    console.log(`[v0] Resuming timer for ${key}`)
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      const timers = JSON.parse(stored)
      if (timers[key] && timers[key].pausedAt) {
        const pausedAt = new Date(timers[key].pausedAt)
        const now = new Date()
        const pauseDuration = now.getTime() - pausedAt.getTime()

        timers[key].totalPausedTime = (timers[key].totalPausedTime || 0) + pauseDuration
        timers[key].isPaused = false
        delete timers[key].pausedAt // Remove o timestamp de pausa

        console.log(`[v0] Timer ${key} was paused for ${(pauseDuration / 1000 / 60).toFixed(2)} minutes`)
        localStorage.setItem(this.storageKey, JSON.stringify(timers))
      }
    }
  }

  stopTimer(key: string) {
    console.log(`[v0] Stopping timer for ${key}`)
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      const timers = JSON.parse(stored)
      if (timers[key]) {
        timers[key].isRunning = false
        timers[key].isPaused = false
        delete timers[key].pausedAt // Remove timestamp de pausa
        localStorage.setItem(this.storageKey, JSON.stringify(timers))
      }
    }
  }

  resetTimer(key: string) {
    console.log(`[v0] Resetting timer for ${key}`)
    this.removeTimerFromStorage(key)
  }

  getTimerData(key: string) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const timers = JSON.parse(stored)
        return timers[key] || null
      }
    } catch (error) {
      console.error("[v0] Error getting timer data:", error)
    }
    return null
  }

  registerCallback(key: string, callback: TimerCallback) {
    this.callbacks.set(key, callback)
  }

  unregisterCallback(key: string) {
    this.callbacks.delete(key)
  }
}

export const productionTimerManager = new ProductionTimerManager()
