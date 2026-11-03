import type { ReactNode } from 'react'
import { maxExample } from '../lib/demand'
import { DAILY_CAP_HOURS, shiftLabel } from '../lib/shifts'
import type { Schedule } from '../types'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 mb-1 text-sm font-semibold text-neutral-900">
        <span className="mr-1.5 text-neutral-400">{n}.</span>
        {title}
      </h3>
      <div className="space-y-2 text-neutral-700">{children}</div>
    </section>
  )
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 list-disc space-y-1 pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** Plain-language explanation of how the roster is computed. The example is taken from the schedule being viewed. */
export function LogicInfo({ schedule }: { schedule: Schedule }) {
  const example = maxExample(schedule)
  const n = schedule.nPerStaff

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid gap-5 md:grid-cols-2">
        <Section n={1} title="From transactions to people">
          <p className="m-0">
            For every hour that has data: <b>people needed = max(1, ceil(transactions / N))</b>, with N = {n} here (editable at the top). At least one person
            while the store is open. An hour with no data is treated as closed and needs nobody.
          </p>
          <p className="m-0 text-neutral-500">Transactions are only a proxy for how busy the store is, and N is an assumption, so the result is an estimate.</p>
        </Section>

        <Section n={2} title="MAX approach: size a shift for its busiest hour">
          <p className="m-0">A shift is a fixed block: whoever is on it works all of it. So a shift needs as many people as its busiest hour needs.</p>
          {example ? (
            <p className="m-0 rounded bg-neutral-50 px-3 py-2">
              Example from this schedule, {example.dayLabel}, {shiftLabel(example.shift)}: hourly needs <b>[{example.needs.join(', ')}]</b>. MAX gives{' '}
              <b>{example.max}</b>. The average would give <b>{example.averageRounded}</b>, which leaves the peak hour{' '}
              {example.max - example.averageRounded} short.
            </p>
          ) : (
            <p className="m-0 rounded bg-neutral-50 px-3 py-2 text-neutral-500">Upload demand data to see a worked example from your own numbers.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Pros</div>
              <List
                items={[
                  'The peak hour is never short-staffed',
                  'Easy to explain and to check by hand',
                  'Deterministic: same input, same roster',
                ]}
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Cons</div>
              <List
                items={[
                  'Quiet hours inside the shift carry extra people (paid idle time)',
                  'Not cost-optimal; it protects coverage, not budget',
                  'Overlapping custom shifts are each sized separately and can overstaff',
                ]}
              />
            </div>
          </div>
          <p className="m-0 text-neutral-500">
            Considered and not chosen: the average (cheaper but short at the peak) and an optimiser for shorter shifts (more complex). Scenario 3 shows what
            shorter shifts would do.
          </p>
        </Section>

        <Section n={3} title="Who is picked first">
          <p className="m-0">
            Each open slot goes to the eligible person who has used the <b>smallest share of their weekly limit</b> so far:
          </p>
          <p className="m-0 rounded bg-neutral-50 px-3 py-2">utilization = hours already assigned / weekly maximum hours</p>
          <List
            items={[
              <>Tie: the person with more hours still free goes first, then name A to Z. Same input always gives the same roster.</>,
              'This is about hours used, not shift length. It keeps part-timers from being starved while full-timers are maxed out.',
              <>
                Only <b>eligible</b> people are considered: not already in this slot, enough weekly hours left for the whole shift, no overlapping shift, and at most{' '}
                {DAILY_CAP_HOURS} hours that day (a longer shift is allowed only as someone&apos;s only shift of the day).
              </>,
            ]}
          />
        </Section>

        <Section n={4} title="Order of filling, and what is kept">
          <List
            items={[
              'Day by day in the file order, shift by shift by start time.',
              'Placements you add or move by hand (blue) are kept, counted against hours and the daily cap, and never replaced by a re-run.',
              'Auto-schedule only replaces its own placements (grey).',
              'If nobody eligible is left, the slot stays open: the draft says which shift on which day is short and by how many. Nobody is pushed past their weekly limit to fill it.',
            ]}
          />
        </Section>

        <Section n={5} title="Reading the numbers">
          <List
            items={[
              <>
                <b>Transactions per staff hour (overall)</b> = total transactions / total staff-hours.
              </>,
              <>
                <b>Average</b> = mean of each hour&apos;s ratio, only hours with staff. It differs from overall because every hour counts equally.
              </>,
              '"–" means nobody is scheduled in that hour. Amber means fewer staff than the demand asks for; "+n" means more.',
              'Staff hours asked for = the sum of the hourly needs; staff hours scheduled minus that is the cost of fixed shifts. A high ratio means each person handles many transactions (risk of queues); a low one means idle time.',
            ]}
          />
        </Section>

        <Section n={6} title="Warnings and known limits">
          <List
            items={[
              'Warnings never block an edit: over the weekly limit, more than 8 hours in a day, overlapping shifts, hours below demand. The drag preview uses the same calculation as the drop.',
              'Greedy, not optimal: a different roster might use fewer hours. When people run out, the earlier days are filled first.',
              'Not modelled: availability or days off, roles, breaks, work that is not transactions, and shifts that cross midnight.',
            ]}
          />
        </Section>
      </div>
    </div>
  )
}
