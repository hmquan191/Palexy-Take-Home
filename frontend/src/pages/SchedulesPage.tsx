import { Alert, App, Button, Empty, Form, Input, Popconfirm, Table } from 'antd'
import { CalendarDays, FlaskConical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { consumeStorageReset, useScheduleStore } from '../store/useScheduleStore'
import type { Schedule } from '../types'

const NAME_MAX_LENGTH = 60

export function SchedulesPage() {
  const schedules = useScheduleStore((s) => s.schedules)
  const createSchedule = useScheduleStore((s) => s.createSchedule)
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule)
  const createSampleSchedule = useScheduleStore((s) => s.createSampleSchedule)
  const { message } = App.useApp()
  const [form] = Form.useForm<{ name: string }>()
  const [showResetNotice, setShowResetNotice] = useState(consumeStorageReset)

  const onCreate = ({ name }: { name: string }) => {
    if (!createSchedule(name)) return
    form.resetFields()
    message.success(`Schedule "${name.trim()}" created. Open it from the list when you are ready.`)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center gap-2">
        <CalendarDays size={18} className="text-neutral-500" aria-hidden />
        <h1 className="text-xl font-semibold text-neutral-900">Schedules</h1>
      </header>

      {showResetNotice && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          closable={{ onClose: () => setShowResetNotice(false) }}
          title="Saved data could not be read"
          description="Your browser's saved schedules were unreadable, so the app started empty. Create a new schedule and re-import your data to continue."
        />
      )}

      <Form form={form} layout="inline" onFinish={onCreate} className="mb-6">
        <Form.Item
          name="name"
          className="flex-1"
          rules={[
            { required: true, whitespace: true, message: 'Give the schedule a name, e.g. "Store A, week 1"' },
            { max: NAME_MAX_LENGTH, message: `Keep the name under ${NAME_MAX_LENGTH} characters` },
          ]}
        >
          <Input placeholder="Schedule name, e.g. Store A, week 1" autoComplete="off" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Create schedule
        </Button>
      </Form>

      <div className="mb-3 flex justify-end">
        <Button
          icon={<FlaskConical size={14} />}
          onClick={() => {
            createSampleSchedule()
            message.success('Sample week added with 10 staff and the provided transaction report. Open it and click Auto-schedule.')
          }}
        >
          Load sample week
        </Button>
      </div>

      <Table<Schedule>
        rowKey="id"
        dataSource={schedules}
        pagination={false}
        size="middle"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No schedules yet. Name one above, or load the sample week to try the whole flow."
            />
          ),
        }}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: (name: string, row) => <Link to={`/schedules/${row.id}`}>{name}</Link>,
          },
          {
            title: 'Staff',
            width: 80,
            render: (_, row) => row.staff.length,
          },
          {
            title: 'Created',
            dataIndex: 'createdAt',
            width: 140,
            render: (iso: string) => new Date(iso).toLocaleDateString(),
          },
          {
            title: '',
            width: 56,
            align: 'right',
            render: (_, row) => (
              <Popconfirm
                title={`Delete "${row.name}"?`}
                description="Its staff, shifts, demand data and roster are removed. This cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteSchedule(row.id)}
              >
                <Button type="text" aria-label={`Delete ${row.name}`} icon={<Trash2 size={14} />} />
              </Popconfirm>
            ),
          },
        ]}
      />
    </main>
  )
}
