import { Button, Result } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useScheduleStore } from '../store/useScheduleStore'

export function SchedulePage() {
  const { id } = useParams()
  const schedule = useScheduleStore((s) => s.schedules.find((x) => x.id === id))

  if (!schedule) {
    return (
      <Result
        status="404"
        title="Schedule not found"
        subTitle="It may have been deleted, or the link is from another browser. Pick one from your list instead."
        extra={
          <Link to="/">
            <Button type="primary">Back to schedules</Button>
          </Link>
        }
      />
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-neutral-500">
        <ArrowLeft size={14} aria-hidden /> Schedules
      </Link>
      <h1 className="mb-2 text-xl font-semibold text-neutral-900">{schedule.name}</h1>
      <p className="text-neutral-500">
        {schedule.shifts.length} shifts, {schedule.staff.length} staff. Staff, shifts, demand upload and the roster
        arrive in the next tickets.
      </p>
    </main>
  )
}
