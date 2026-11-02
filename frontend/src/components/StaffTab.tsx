import { Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Table } from 'antd'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { type StaffInput, useScheduleStore } from '../store/useScheduleStore'
import type { Schedule, Staff } from '../types'

const NAME_MAX_LENGTH = 60
const MAX_HOURS_PER_WEEK = 168

function StaffForm({ initial, onSubmit }: { initial: StaffInput | null; onSubmit: (v: StaffInput) => void }) {
  return (
    <Form<StaffInput>
      id="staff-form"
      layout="vertical"
      initialValues={initial ?? undefined}
      onFinish={onSubmit}
      requiredMark={false}
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[
          { required: true, whitespace: true, message: 'Enter the staff member\'s name' },
          { max: NAME_MAX_LENGTH, message: `Keep the name under ${NAME_MAX_LENGTH} characters` },
        ]}
      >
        <Input autoFocus autoComplete="off" />
      </Form.Item>
      <Form.Item
        label="Maximum hours per week"
        name="maxWeeklyHours"
        extra="From their contract. The auto-schedule never goes over this."
        rules={[{ required: true, message: 'Enter their weekly hour limit, for example 40' }]}
      >
        <InputNumber min={1} max={MAX_HOURS_PER_WEEK} precision={0} className="w-full" />
      </Form.Item>
    </Form>
  )
}

export function StaffTab({ schedule }: { schedule: Schedule }) {
  const { addStaff, updateStaff, removeStaff } = useScheduleStore.getState()
  // null = closed, 'new' = adding, otherwise the staff member being edited
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)

  const assignmentCount = (staffId: string) => schedule.assignments.filter((a) => a.staffId === staffId).length

  const submit = (values: StaffInput) => {
    if (editing === 'new') addStaff(schedule.id, values)
    else if (editing) updateStaff(schedule.id, editing.id, values)
    setEditing(null)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-neutral-500">Who can work this week, and the most hours each person may be scheduled.</p>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setEditing('new')}>
          Add staff
        </Button>
      </div>

      <Table<Staff>
        rowKey="id"
        dataSource={schedule.staff}
        pagination={false}
        size="middle"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No staff yet. Add the people you can schedule, with their weekly hour limits."
            />
          ),
        }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Max hours / week', dataIndex: 'maxWeeklyHours', width: 160, align: 'right' },
          {
            title: '',
            width: 96,
            align: 'right',
            render: (_, row) => {
              const count = assignmentCount(row.id)
              return (
                <div className="flex justify-end gap-1">
                  <Button type="text" aria-label={`Edit ${row.name}`} icon={<Pencil size={14} />} onClick={() => setEditing(row)} />
                  <Popconfirm
                    title={`Remove ${row.name}?`}
                    description={count > 0 ? `Their ${count} assigned shift(s) are removed from the roster too.` : undefined}
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeStaff(schedule.id, row.id)}
                  >
                    <Button type="text" aria-label={`Remove ${row.name}`} icon={<Trash2 size={14} />} />
                  </Popconfirm>
                </div>
              )
            },
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Add staff member' : 'Edit staff member'}
        okText={editing === 'new' ? 'Add' : 'Save'}
        okButtonProps={{ htmlType: 'submit', form: 'staff-form' }}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <StaffForm
          key={editing === null || editing === 'new' ? 'new' : editing.id}
          initial={editing === null || editing === 'new' ? null : editing}
          onSubmit={submit}
        />
      </Modal>
    </section>
  )
}
