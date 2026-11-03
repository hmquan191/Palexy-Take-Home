import { Button, InputNumber, Result, Tabs, Tooltip } from 'antd'
import { ArrowLeft, Info } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DemandTab } from '../components/DemandTab'
import { LogicInfo } from '../components/LogicInfo'
import { RosterTab } from '../components/RosterTab'
import { ScenarioBar } from '../components/ScenarioBar'
import { ShiftsTab } from '../components/ShiftsTab'
import { StaffTab } from '../components/StaffTab'
import { StatsStrip } from '../components/StatsStrip'
import { SummaryTab } from '../components/SummaryTab'
import { useScheduleStore } from '../store/useScheduleStore'

const MAX_N = 1000

export function SchedulePage() {
  const { id } = useParams()
  const schedule = useScheduleStore((s) => s.schedules.find((x) => x.id === id))
  const setNPerStaff = useScheduleStore((s) => s.setNPerStaff)
  const [tab, setTab] = useState('roster')
  const [showLogic, setShowLogic] = useState(false)

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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-neutral-500">
        <ArrowLeft size={14} aria-hidden /> Schedules
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-xl font-semibold text-neutral-900">{schedule.name}</h1>
        <Button
          type={showLogic ? 'primary' : 'default'}
          icon={<Info size={14} />}
          aria-expanded={showLogic}
          onClick={() => setShowLogic(!showLogic)}
        >
          How the logic works
        </Button>
      </div>

      {showLogic && <LogicInfo schedule={schedule} />}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <span>One staff member for every</span>
        <InputNumber
          aria-label="Transactions per staff member per hour (N)"
          min={1}
          max={MAX_N}
          precision={0}
          value={schedule.nPerStaff}
          onChange={(n) => n !== null && setNPerStaff(schedule.id, n)}
          className="w-20"
        />
        <span>transactions per hour (at least one while open)</span>
        <Tooltip title="Higher means fewer staff are required per hour. Changing it does not move anyone on the roster; run Auto-schedule again to apply it.">
          <Info size={14} className="text-neutral-400" aria-label="About this setting" />
        </Tooltip>
      </div>

      <ScenarioBar schedule={schedule} onApplied={() => setTab('roster')} />

      <StatsStrip schedule={schedule} />

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'roster', label: 'Roster', children: <RosterTab schedule={schedule} /> },
          { key: 'summary', label: 'Summary', children: <SummaryTab schedule={schedule} /> },
          { key: 'staff', label: `Staff (${schedule.staff.length})`, children: <StaffTab schedule={schedule} /> },
          { key: 'shifts', label: `Shifts (${schedule.shifts.length})`, children: <ShiftsTab schedule={schedule} /> },
          { key: 'demand', label: 'Demand data', children: <DemandTab schedule={schedule} /> },
        ]}
      />
    </main>
  )
}
