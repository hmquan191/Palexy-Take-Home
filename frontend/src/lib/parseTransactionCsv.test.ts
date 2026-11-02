import { describe, expect, it } from 'vitest'
import sampleCsv from '../../../sample_transaction_interview.csv?raw'
import { parseTransactionCsv } from './parseTransactionCsv'
import { formatHour, parseHourLabel } from './time'

function ok(text: string) {
  const result = parseTransactionCsv(text)
  if (!result.ok) throw new Error(`expected ok, got: ${JSON.stringify(result.error)}`)
  return result.data
}

function error(text: string) {
  const result = parseTransactionCsv(text)
  if (result.ok) throw new Error('expected an error')
  return result.error
}

describe('parseTransactionCsv: provided sample file', () => {
  const data = ok(sampleCsv)

  it('reads the week label, 7 days in file order and hours 7am-10pm', () => {
    expect(data.weekLabel).toBe('Aug 07, 2026 - Aug 13, 2026')
    expect(data.dayLabels).toEqual([
      'Fri, 07 Aug',
      'Sat, 08 Aug',
      'Sun, 09 Aug',
      'Mon, 10 Aug',
      'Tue, 11 Aug',
      'Wed, 12 Aug',
      'Thu, 13 Aug',
    ])
    expect(data.hours).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
  })

  it('maps cells to dayIndex-hour keys', () => {
    expect(data.transactions['0-7']).toBe(22) // Fri 7am
    expect(data.transactions['0-13']).toBe(64) // Fri 1pm
    expect(data.transactions['6-22']).toBe(6) // Thu 10pm
    expect(Object.keys(data.transactions)).toHaveLength(7 * 16)
  })

  it('Friday adds up to 452 (283 morning + 169 afternoon)', () => {
    const friday = Object.entries(data.transactions)
      .filter(([key]) => key.startsWith('0-'))
      .reduce((sum, [, count]) => sum + count, 0)
    expect(friday).toBe(452)
  })
})

describe('parseTransactionCsv: tolerated variations', () => {
  const body = '7am,1,2\n8am,3,4\n'

  it('accepts a different or missing week label', () => {
    expect(ok(`Some other label\n,Mon,Tue\n${body}`).weekLabel).toBe('Some other label')
    expect(ok(`,Mon,Tue\n${body}`).weekLabel).toBeNull()
  })

  it('accepts hours in any order and 24h labels', () => {
    const data = ok(',Mon,Tue\n13:00,5,6\n7am,1,2\n12am,0,0\n')
    expect(data.hours).toEqual([0, 7, 13])
    expect(data.transactions['1-13']).toBe(6)
  })

  it('accepts CRLF, blank lines, quoted fields and trailing commas', () => {
    const data = ok('﻿"Week 1"\r\n\r\n,"Mon, 03 Aug","Tue, 04 Aug",\r\n7am,1,2,\r\n8am,3,4,\r\n')
    expect(data.dayLabels).toEqual(['Mon, 03 Aug', 'Tue, 04 Aug'])
    expect(data.transactions['1-8']).toBe(4)
  })

  it('accepts a header whose first cell is a name and a single day', () => {
    expect(ok('Hour,Mon\n7am,5\n').dayLabels).toEqual(['Mon'])
  })

  it('allows gaps in hours (those hours are treated as closed)', () => {
    expect(ok(',Mon\n7am,5\n9am,6\n').hours).toEqual([7, 9])
  })
})

describe('parseTransactionCsv: malformed input is rejected with a location', () => {
  it('empty file', () => {
    expect(error('').message).toMatch(/empty/)
    expect(error('\n\n  \n').message).toMatch(/empty/)
  })

  it('no header or no hourly rows', () => {
    expect(error('Only a title').message).toMatch(/No header/)
    expect(error(',Mon,Tue\n').message).toMatch(/No hourly rows/)
  })

  it('bad hour label points at the row', () => {
    const e = error(',Mon\n7am,1\nlunch,2\n')
    expect(e.row).toBe(3)
    expect(e.column).toBe('column A')
    expect(e.message).toMatch(/lunch/)
  })

  it('non-numeric and negative cells point at the day and row', () => {
    const e = error(',Mon,Tue\n7am,1,abc\n')
    expect(e.row).toBe(2)
    expect(e.column).toBe('Tue (column C)')
    expect(error(',Mon\n7am,-3\n').message).toMatch(/whole number/)
    expect(error(',Mon\n7am,1.5\n').message).toMatch(/whole number/)
    expect(error(',Mon\n7am,\n').message).toMatch(/whole number/)
  })

  it('ragged rows', () => {
    expect(error(',Mon,Tue\n7am,1\n').message).toMatch(/1 values but the header lists 2/)
    expect(error(',Mon\n7am,1,9\n').message).toMatch(/2 values but the header lists 1/)
  })

  it('duplicate hours, duplicate or too many day columns, unlabelled day', () => {
    expect(error(',Mon\n7am,1\n07:00,2\n').message).toMatch(/already on line 2/)
    expect(error(',Mon,Mon\n7am,1,2\n').message).toMatch(/twice/)
    expect(error(',a,b,c,d,e,f,g,h\n7am,1,1,1,1,1,1,1,1\n').message).toMatch(/at most 7/)
    expect(error(',Mon,,Wed\n7am,1,2,3\n').message).toMatch(/no label/)
  })
})

describe('hour labels', () => {
  it('parses am/pm and 24h forms', () => {
    expect(parseHourLabel('7am')).toBe(7)
    expect(parseHourLabel('12pm')).toBe(12)
    expect(parseHourLabel('12am')).toBe(0)
    expect(parseHourLabel('10pm')).toBe(22)
    expect(parseHourLabel('7:00 AM')).toBe(7)
    expect(parseHourLabel('07:00')).toBe(7)
    expect(parseHourLabel('23:00')).toBe(23)
  })

  it('rejects things that are not whole hours', () => {
    for (const bad of ['', 'noon', '13pm', '0am', '24:00', '7:30', '7:30am', '99']) {
      expect(parseHourLabel(bad)).toBeNull()
    }
  })

  it('formats hours back to labels', () => {
    expect([0, 7, 12, 13, 22].map(formatHour)).toEqual(['12am', '7am', '12pm', '1pm', '10pm'])
  })
})
