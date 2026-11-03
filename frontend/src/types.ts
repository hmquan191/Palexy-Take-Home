export type Staff = {
  id: string
  name: string
  maxWeeklyHours: number
}

export type Shift = {
  id: string
  start: string // "HH:mm"
  end: string // "HH:mm"
}

export type Assignment = {
  id: string
  staffId: string
  shiftId: string
  dayIndex: number
  source: 'auto' | 'manual'
}

export type ScenarioId = 'baseline' | 'short-staffed' | 'short-shifts'

export type Schedule = {
  id: string
  name: string
  createdAt: string
  /** set when a demo scenario was applied to this schedule */
  scenario?: ScenarioId
  nPerStaff: number
  dayLabels: string[]
  staff: Staff[]
  shifts: Shift[]
  transactions: Record<string, number> // key `${dayIndex}-${hour}`
  assignments: Assignment[]
}
