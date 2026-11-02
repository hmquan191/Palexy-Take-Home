import { parseHourLabel } from './time'

export type CsvError = {
  /** 1-based line in the file, null when the problem is the file as a whole. */
  row: number | null
  column: string | null
  message: string
}

export type ParsedDemand = {
  dayLabels: string[]
  /** key `${dayIndex}-${hour}`; hours missing from the file have no key (store closed). */
  transactions: Record<string, number>
  hours: number[]
  weekLabel: string | null
}

export type ParseResult = { ok: true; data: ParsedDemand } | { ok: false; error: CsvError }

type CsvRecord = { cells: string[]; line: number }

const MAX_DAYS = 7

function tokenize(input: string): CsvRecord[] {
  const text = input.replace(/^﻿/, '')
  const records: CsvRecord[] = []
  let cells: string[] = []
  let cell = ''
  let inQuotes = false
  let line = 1
  let recordLine = 1

  const endCell = () => {
    cells.push(cell)
    cell = ''
  }
  const endRecord = () => {
    endCell()
    records.push({ cells, line: recordLine })
    cells = []
    recordLine = line
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        if (ch === '\n') line++
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      endCell()
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      line++
      endRecord()
    } else {
      cell += ch
    }
  }
  if (cell !== '' || cells.length > 0) endRecord()
  return records
}

function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return `column ${name}`
}

const isBlank = (cells: string[]) => cells.every((c) => c.trim() === '')
const fail = (row: number | null, column: string | null, message: string): ParseResult => ({
  ok: false,
  error: { row, column, message },
})

/**
 * Parses a weekly transaction report: optional title row(s), a header row of day labels
 * (first cell is ignored), then one row per hour ("7am", "1pm", "13:00"; any order).
 * Rejects the whole file on the first problem so nothing is imported half-way.
 */
export function parseTransactionCsv(text: string): ParseResult {
  const rows = tokenize(text).filter((r) => !isBlank(r.cells))
  if (rows.length === 0) {
    return fail(null, null, 'The file is empty. Export the weekly transaction report as CSV and upload it again.')
  }

  let weekLabel: string | null = null
  let i = 0
  while (i < rows.length && rows[i].cells[0].trim() !== '' && isBlank(rows[i].cells.slice(1))) {
    weekLabel ??= rows[i].cells[0].trim()
    i++
  }
  if (i >= rows.length) {
    return fail(null, null, 'No header row found. Expected a row listing the days (for example "Mon, Tue, ...") above the hourly rows.')
  }

  const header = rows[i++]
  const dayCells = header.cells.slice(1)
  while (dayCells.length > 0 && dayCells[dayCells.length - 1].trim() === '') dayCells.pop()
  const dayLabels = dayCells.map((c) => c.trim())
  const emptyAt = dayLabels.indexOf('')
  if (emptyAt !== -1) {
    return fail(header.line, columnName(emptyAt + 1), 'A day column has no label. Name every day column in the header row.')
  }
  if (dayLabels.length === 0) {
    return fail(header.line, null, 'The header row has no day columns. Put one day per column after the first (hour) column.')
  }
  if (dayLabels.length > MAX_DAYS) {
    return fail(header.line, null, `Found ${dayLabels.length} day columns but a schedule covers one week (at most ${MAX_DAYS}). Remove the extra columns.`)
  }
  const duplicate = dayLabels.find((label, idx) => dayLabels.indexOf(label) !== idx)
  if (duplicate) {
    return fail(header.line, null, `The day "${duplicate}" appears twice in the header row. Each day column needs a unique label.`)
  }

  const dataRows = rows.slice(i)
  if (dataRows.length === 0) {
    return fail(header.line, null, 'No hourly rows found under the header. Add one row per hour, for example "7am,22,13,...".')
  }

  const transactions: Record<string, number> = {}
  const seen = new Map<number, number>()
  for (const row of dataRows) {
    const hourText = row.cells[0].trim()
    const hour = parseHourLabel(hourText)
    if (hour === null) {
      return fail(row.line, 'column A', `"${hourText}" is not a recognised hour. Use labels like 7am, 1pm or 13:00.`)
    }
    const firstLine = seen.get(hour)
    if (firstLine !== undefined) {
      return fail(row.line, 'column A', `The hour "${hourText}" is already on line ${firstLine}. Each hour may appear once.`)
    }
    seen.set(hour, row.line)

    const values = row.cells.slice(1)
    while (values.length > dayLabels.length && values[values.length - 1].trim() === '') values.pop()
    if (values.length !== dayLabels.length) {
      return fail(row.line, null, `This row has ${values.length} values but the header lists ${dayLabels.length} days. Every hour needs one count per day.`)
    }
    for (let d = 0; d < values.length; d++) {
      const value = values[d].trim()
      if (!/^\d+$/.test(value)) {
        return fail(row.line, `${dayLabels[d]} (${columnName(d + 1)})`, `"${value}" is not a whole number of transactions. Use 0 or a positive integer.`)
      }
      transactions[`${d}-${hour}`] = Number(value)
    }
  }

  return {
    ok: true,
    data: { dayLabels, transactions, hours: [...seen.keys()].sort((a, b) => a - b), weekLabel },
  }
}
