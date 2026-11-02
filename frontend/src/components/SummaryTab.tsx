import { Empty } from 'antd'
import { useMemo } from 'react'
import { formatRatio } from '../lib/format'
import { buildSummary } from '../lib/summary'
import { formatHour } from '../lib/time'
import type { Schedule } from '../types'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
      <div className="text-neutral-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-neutral-900">{value}</div>
      {hint && <div className="text-xs text-neutral-400">{hint}</div>}
    </div>
  )
}

export function SummaryTab({ schedule }: { schedule: Schedule }) {
  const summary = useMemo(() => buildSummary(schedule), [schedule])
  const { totals } = summary

  if (summary.hours.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Nothing to summarise yet. Upload demand data on the Demand data tab, then schedule some staff."
      />
    )
  }

  const surplus = totals.totalStaffHours - totals.requiredStaffHours

  return (
    <section>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total staff hours" value={String(totals.totalStaffHours)} />
        <Stat label="Total transactions" value={totals.totalTransactions.toLocaleString()} />
        <Stat label="Transactions per staff hour" value={formatRatio(totals.overallRatio)} hint="Overall: total transactions ÷ total staff hours" />
        <Stat label="Average transactions per staff hour" value={formatRatio(totals.averageCellRatio)} hint="Mean of each hour's ratio, hours with staff only" />
      </div>
      <p className="mb-3 text-neutral-500">
        At 1 staff per {schedule.nPerStaff} transactions the busiest hours call for {totals.requiredStaffHours} staff-hours in total.{' '}
        {totals.totalStaffHours === 0
          ? 'Nobody is scheduled yet.'
          : surplus >= 0
            ? `${totals.totalStaffHours} are scheduled, ${surplus} more than that. Shifts are fixed blocks, so some quiet hours carry extra people.`
            : `${totals.totalStaffHours} are scheduled, ${-surplus} fewer than that.`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">Hour</th>
              {schedule.dayLabels.map((label) => (
                <th key={label} className="min-w-[88px] border border-neutral-200 bg-neutral-50 px-2 py-1.5 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.hours.map((hour) => (
              <tr key={hour}>
                <th className="sticky left-0 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">{formatHour(hour)}</th>
                {schedule.dayLabels.map((_, day) => {
                  const cell = summary.cells[`${day}-${hour}`]
                  if (!cell) return <td key={day} className="border border-neutral-200 bg-neutral-50" />
                  const short = cell.staffHours < cell.required
                  const extra = cell.staffHours - cell.required
                  return (
                    <td
                      key={day}
                      title={`Needs ${cell.required}, scheduled ${cell.staffHours}`}
                      className={`border px-2 py-1 ${short ? 'border-amber-300 bg-amber-50' : 'border-neutral-200'}`}
                    >
                      <div className="font-medium text-neutral-900">{cell.transactions} txn</div>
                      <div className={short ? 'text-amber-700' : 'text-neutral-600'}>
                        {cell.staffHours} staff
                        {extra > 0 && <span className="text-sky-600"> +{extra}</span>}
                        {short && <span> (need {cell.required})</span>}
                      </div>
                      <div className="text-neutral-500">{formatRatio(cell.ratio)} /h</div>
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <th className="sticky left-0 border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-left font-semibold">Day total</th>
              {summary.dayTotals.map((day, i) => (
                <td key={i} className="border border-neutral-300 bg-neutral-100 px-2 py-1 font-medium">
                  <div>{day.transactions.toLocaleString()} txn</div>
                  <div>{day.staffHours} staff</div>
                  <div>{formatRatio(day.ratio)} /h</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Each cell: transactions, staff on shift (<span className="text-sky-600">+n</span> = more than the model asks for), and
        transactions per staff hour. Amber means fewer staff than the model asks for; "–" means nobody is scheduled.
      </p>
    </section>
  )
}
