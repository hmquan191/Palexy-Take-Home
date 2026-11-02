import { Alert, Button, Empty, Form, Modal, Popconfirm, Select, Table } from 'antd'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { shiftHours, shiftLabel, shiftsOverlap, sortShifts, toMinutes } from '../lib/shifts'
import { type ShiftInput, useScheduleStore } from '../store/useScheduleStore'
import type { Schedule, Shift } from '../types'

const hourOption = (h: number) => {
  const value = `${String(h).padStart(2, '0')}:00`
  return { value, label: value }
}
const START_OPTIONS = Array.from({ length: 24 }, (_, h) => hourOption(h))
const END_OPTIONS = Array.from({ length: 24 }, (_, h) => hourOption(h + 1))

function ShiftForm({ initial, onSubmit }: { initial: ShiftInput | null; onSubmit: (v: ShiftInput) => void }) {
  return (
    <Form<ShiftInput>
      id="shift-form"
      layout="vertical"
      initialValues={initial ?? { start: '09:00', end: '17:00' }}
      onFinish={onSubmit}
      requiredMark={false}
    >
      <div className="grid grid-cols-2 gap-3">
        <Form.Item label="Start" name="start" rules={[{ required: true, message: 'Pick a start time' }]}>
          <Select options={START_OPTIONS} showSearch />
        </Form.Item>
        <Form.Item
          label="End"
          name="end"
          dependencies={['start']}
          rules={[
            { required: true, message: 'Pick an end time' },
            ({ getFieldValue }) => ({
              validator: (_, end: string | undefined) =>
                !end || toMinutes(end) > toMinutes(getFieldValue('start'))
                  ? Promise.resolve()
                  : Promise.reject(new Error('End must be after the start (shifts cannot cross midnight)')),
            }),
          ]}
        >
          <Select options={END_OPTIONS} showSearch />
        </Form.Item>
      </div>
      <p className="text-neutral-500">Shifts start and end on the hour. Changes apply to every day of the week.</p>
    </Form>
  )
}

export function ShiftsTab({ schedule }: { schedule: Schedule }) {
  const { addShift, updateShift, removeShift } = useScheduleStore.getState()
  const [editing, setEditing] = useState<Shift | 'new' | null>(null)
  const shifts = sortShifts(schedule.shifts)
  const overlapping = shifts.some((a, i) => shifts.slice(i + 1).some((b) => shiftsOverlap(a, b)))
  const usage = (id: string) => schedule.assignments.filter((a) => a.shiftId === id).length

  const submit = (values: ShiftInput) => {
    if (editing === 'new') addShift(schedule.id, values)
    else if (editing) updateShift(schedule.id, editing.id, values)
    setEditing(null)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-neutral-500">The blocks of time staff can be assigned to. Each is defined by a start and an end.</p>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setEditing('new')}>
          Add shift
        </Button>
      </div>

      {overlapping && (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Some shifts overlap"
          description="Auto-schedule fills every shift separately, so overlapping shifts can end up with more people than the busiest hour needs. You can trim the extra people on the Roster."
        />
      )}

      <Table<Shift>
        rowKey="id"
        dataSource={shifts}
        pagination={false}
        size="middle"
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shifts. Add at least one so staff can be assigned." />,
        }}
        columns={[
          { title: 'Shift', render: (_, row) => shiftLabel(row) },
          { title: 'Length', width: 100, render: (_, row) => `${shiftHours(row)} h` },
          { title: 'Assignments', width: 120, align: 'right', render: (_, row) => usage(row.id) },
          {
            title: '',
            width: 96,
            align: 'right',
            render: (_, row) => {
              const count = usage(row.id)
              return (
                <div className="flex justify-end gap-1">
                  <Button type="text" aria-label={`Edit ${shiftLabel(row)}`} icon={<Pencil size={14} />} onClick={() => setEditing(row)} />
                  <Popconfirm
                    title={`Remove shift ${shiftLabel(row)}?`}
                    description={count > 0 ? `${count} assignment(s) on this shift will be removed from the roster too.` : undefined}
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeShift(schedule.id, row.id)}
                  >
                    <Button type="text" aria-label={`Remove ${shiftLabel(row)}`} icon={<Trash2 size={14} />} />
                  </Popconfirm>
                </div>
              )
            },
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Add shift' : 'Edit shift'}
        okText={editing === 'new' ? 'Add' : 'Save'}
        okButtonProps={{ htmlType: 'submit', form: 'shift-form' }}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <ShiftForm
          key={editing === null || editing === 'new' ? 'new' : editing.id}
          initial={editing === null || editing === 'new' ? null : editing}
          onSubmit={submit}
        />
      </Modal>
    </section>
  )
}
