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

export type Schedule = {
  id: string
  name: string
  createdAt: string
  nPerStaff: number
  dayLabels: string[]
  staff: Staff[]
  shifts: Shift[]
  transactions: Record<string, number> // key `${dayIndex}-${hour}`
  assignments: Assignment[]
}
