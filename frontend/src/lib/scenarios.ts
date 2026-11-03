import type { ScenarioId } from '../types'
import { SAMPLE_STAFF, SAMPLE_STAFF_HOURS, SAMPLE_STAFF_POOL } from './sampleData'

export type Scenario = {
  id: ScenarioId
  button: string
  title: string
  idea: string
  setup: string[]
  nPerStaff: number
  shifts: { start: string; end: string }[]
  staff: { name: string; maxWeeklyHours: number }[]
  pros: string[]
  cons: string[]
  tradeoff: string
}

const EIGHT_HOUR_SHIFTS = [
  { start: '07:00', end: '15:00' },
  { start: '15:00', end: '23:00' },
]

/** All three run on the provided sample week; only the team, N or the shifts change. Numbers shown in the UI are computed live. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'baseline',
    button: 'Scenario 1',
    title: 'Baseline: two 8-hour shifts, full team',
    idea: 'The setup the brief starts from. Every shift is sized for its busiest hour (the MAX rule), so the peak is never short.',
    setup: ['10 staff with 24 to 40 contract hours each (376h in total)', 'One staff member per 15 transactions an hour', 'Shifts 07:00-15:00 and 15:00-23:00'],
    nPerStaff: 15,
    shifts: EIGHT_HOUR_SHIFTS,
    staff: SAMPLE_STAFF,
    pros: [
      'Every hour gets at least the staffing the demand asks for, including the peak',
      'A simple roster of two shifts a day that is easy to read and to explain',
      'Nobody goes over their weekly hours',
    ],
    cons: [
      'Shifts are fixed blocks, so quiet hours inside a shift carry extra people (the surplus in the numbers above)',
      'Some contract hours stay unused because 8-hour blocks do not divide every weekly limit',
    ],
    tradeoff: 'Coverage is bought with idle time: the manager pays for surplus hours so the busiest hour is never short.',
  },
  {
    id: 'short-staffed',
    button: 'Scenario 2',
    title: 'Short-staffed: only 5 people',
    idea: 'Same demand, half the team. Shows what the scheduler does when demand is more than the team can cover.',
    setup: ['5 staff at 40h each (200h in total)', 'One staff member per 15 transactions an hour', 'Shifts 07:00-15:00 and 15:00-23:00'],
    nPerStaff: 15,
    shifts: EIGHT_HOUR_SHIFTS,
    staff: SAMPLE_STAFF_POOL.slice(0, 5).map((name) => ({ name, maxWeeklyHours: SAMPLE_STAFF_HOURS })),
    pros: [
      'Fails gracefully: no error, and nobody is scheduled past their limit',
      'Says exactly which shift on which day is short and by how many',
      'The lowest labour cost of the three scenarios',
    ],
    cons: [
      'Peak hours go uncovered, so customers wait longer (see transactions per staff hour)',
      'Everyone works their full contract hours, leaving no slack for sick days',
    ],
    tradeoff: 'Hire more people, raise limits, or accept longer queues at the peak. The tool shows the gap; the manager decides.',
  },
  {
    id: 'short-shifts',
    button: 'Scenario 3',
    title: 'Shorter shifts: four 4-hour blocks',
    idea: 'Same team and demand, but the day is cut into 07-11, 11-15, 15-19 and 19-23, so each block is sized for its own busiest hour.',
    setup: ['10 staff with 24 to 40 contract hours each (376h in total)', 'One staff member per 15 transactions an hour', 'Shifts 07:00-11:00, 11:00-15:00, 15:00-19:00 and 19:00-23:00'],
    nPerStaff: 15,
    shifts: [
      { start: '07:00', end: '11:00' },
      { start: '11:00', end: '15:00' },
      { start: '15:00', end: '19:00' },
      { start: '19:00', end: '23:00' },
    ],
    staff: SAMPLE_STAFF,
    pros: [
      'Less surplus than 8-hour shifts: staffing follows the demand curve more closely',
      'Still fully covered',
      'A person can take one block or two in a day, up to the 8-hour daily cap',
    ],
    cons: [
      'Many more placements to manage and more handovers during the day',
      'Short shifts may be unattractive to staff; that is not modelled here',
      'Auto-schedule fills every block on its own, so adding overlapping blocks would overstaff',
    ],
    tradeoff: 'A finer roster trades simplicity for less idle time. The tool accepts custom shifts but does not search for the best set of shifts.',
  },
]

export const scenarioById = (id: ScenarioId): Scenario => SCENARIOS.find((s) => s.id === id)!
