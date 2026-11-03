import { Alert, App, Button, Empty, InputNumber, Table, Upload } from 'antd'
import { FileUp } from 'lucide-react'
import { type ClipboardEvent, type KeyboardEvent, useState } from 'react'
import { type CsvError, parseTransactionCsv } from '../lib/parseTransactionCsv'
import { formatHour } from '../lib/time'
import { MAX_TRANSACTIONS_PER_HOUR, useScheduleStore } from '../store/useScheduleStore'
import type { Schedule } from '../types'

const MAX_FILE_BYTES = 1024 * 1024

type Row = { key: string; label: string; counts: number[]; total: number }

const BLOCKED_KEYS = new Set(['-', '+', '.', ',', 'e', 'E'])
const RULE = `Use a whole number from 0 to ${MAX_TRANSACTIONS_PER_HOUR.toLocaleString()}.`

/** One editable demand cell. Saves on Enter or when you click away; typing a minus, decimal point or letters is refused. */
function CountCell({ value, label, onCommit }: { value: number; label: string; onCommit: (count: number) => boolean }) {
  const { message } = App.useApp()
  const [draft, setDraft] = useState<number | null>(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }

  const warn = (text: string) => message.warning({ key: 'demand-cell', content: text })
  const commit = () => {
    if (draft === value) return
    if (draft === null || !onCommit(draft)) {
      warn(`${label}: that is not a valid count. ${RULE} Kept ${value}.`)
      setDraft(value)
    }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.has(e.key)) {
      e.preventDefault()
      warn(`Transactions cannot be negative or fractional. ${RULE}`)
    }
  }
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d+$/.test(e.clipboardData.getData('text').trim())) {
      e.preventDefault()
      warn(`Only digits can be pasted here. ${RULE}`)
    }
  }

  return (
    <InputNumber
      size="small"
      aria-label={`Transactions, ${label}`}
      className="w-20 [&_input]:text-right"
      min={0}
      max={MAX_TRANSACTIONS_PER_HOUR}
      precision={0}
      controls={false}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onPressEnter={commit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  )
}

function describeError(e: CsvError): string {
  const where = [e.row !== null && `Line ${e.row}`, e.column].filter(Boolean).join(', ')
  return where ? `${where}: ${e.message}` : e.message
}

export function DemandTab({ schedule }: { schedule: Schedule }) {
  const { message } = App.useApp()
  const [error, setError] = useState<CsvError | null>(null)

  const hours = [...new Set(Object.keys(schedule.transactions).map((k) => Number(k.split('-')[1])))].sort((a, b) => a - b)
  const rows: Row[] = hours.map((hour) => {
    const counts = schedule.dayLabels.map((_, d) => schedule.transactions[`${d}-${hour}`] ?? 0)
    return { key: String(hour), label: formatHour(hour), counts, total: counts.reduce((a, b) => a + b, 0) }
  })
  const dayTotals = schedule.dayLabels.map((_, d) => rows.reduce((sum, r) => sum + r.counts[d], 0))
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0)

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError({ row: null, column: null, message: 'That file is over 1 MB, which is far more than a weekly report. Check you picked the right file.' })
      return
    }
    const result = parseTransactionCsv(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    useScheduleStore.getState().importTransactions(schedule.id, result.data)
    const { dayLabels, hours: h } = result.data
    message.success(`Imported ${dayLabels.length} days x ${h.length} hours from ${file.name}.`)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-neutral-500">
          Transactions per hour for a typical week. Click any number to edit it (Enter or click away to save). Uploading again replaces the data below.
        </p>
        <Upload
          accept=".csv,text/csv"
          showUploadList={false}
          beforeUpload={(file) => {
            void handleFile(file)
            return false
          }}
        >
          <Button type="primary" icon={<FileUp size={14} />}>
            {rows.length ? 'Replace CSV' : 'Upload CSV'}
          </Button>
        </Upload>
      </div>

      {error && (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          closable={{ onClose: () => setError(null) }}
          title="Import failed, nothing was changed"
          description={`${describeError(error)} Fix the file and upload it again.`}
        />
      )}

      {rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No demand data yet. Upload the weekly transaction report (rows are hours like 7am, columns are days)."
        />
      ) : (
        <>
          <p className="mb-2 text-neutral-500">
            {schedule.dayLabels.length} days, {rows.length} hours ({rows[0].label} to {rows[rows.length - 1].label}),{' '}
            {weekTotal.toLocaleString()} transactions. Totals, the summary and the staffing numbers update as you edit; the roster itself only changes
            when you run Auto-schedule again. An hour set to 0 stays open and still needs one person.
          </p>
          <Table<Row>
            rowKey="key"
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Hour', dataIndex: 'label', width: 70, fixed: 'left' },
              ...schedule.dayLabels.map((label, d) => ({
                title: label,
                align: 'right' as const,
                render: (_: unknown, row: Row) => (
                  <CountCell
                    value={row.counts[d]}
                    label={`${row.label} on ${label}`}
                    onCommit={(count) => useScheduleStore.getState().setTransaction(schedule.id, d, Number(row.key), count)}
                  />
                ),
              })),
              { title: 'Total', dataIndex: 'total', align: 'right', className: 'font-medium' },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <span className="font-medium">Total</span>
                </Table.Summary.Cell>
                {dayTotals.map((total, d) => (
                  <Table.Summary.Cell key={d} index={d + 1} align="right">
                    <span className="font-medium">{total.toLocaleString()}</span>
                  </Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={dayTotals.length + 1} align="right">
                  <span className="font-medium">{weekTotal.toLocaleString()}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}
    </section>
  )
}
