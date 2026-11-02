import sampleCsv from '../data/sample_transactions.csv?raw'

export const SAMPLE_CSV = sampleCsv

// 376 contract hours in total against 352 needed at N=15: enough to cover the week with a little slack.
export const SAMPLE_STAFF = [
  { name: 'Nguyễn An', maxWeeklyHours: 40 },
  { name: 'Trần Bình', maxWeeklyHours: 40 },
  { name: 'Lê Chi', maxWeeklyHours: 40 },
  { name: 'Phạm Dũng', maxWeeklyHours: 40 },
  { name: 'Hoàng Em', maxWeeklyHours: 40 },
  { name: 'Vũ Phúc', maxWeeklyHours: 40 },
  { name: 'Đặng Giang', maxWeeklyHours: 40 },
  { name: 'Bùi Hoa', maxWeeklyHours: 40 },
  { name: 'Đỗ Khoa', maxWeeklyHours: 32 },
  { name: 'Ngô Lan', maxWeeklyHours: 24 },
]

export const SAMPLE_STAFF_POOL = [
  'An', 'Bình', 'Công', 'Đức', 'Thọ',
  'Chi', 'Dũng', 'Hà', 'Hải', 'Hoa',
  'Huy', 'Khoa', 'Lan', 'Linh', 'Minh',
  'Nam', 'Phúc', 'Quân', 'Trang', 'Yến',
]
export const SAMPLE_STAFF_HOURS = 40
export const SAMPLE_STAFF_BATCH = 5

/** The next names from the pool that are not already on the team, in pool order. */
export function nextSampleStaff(existingNames: string[], count = SAMPLE_STAFF_BATCH): { name: string; maxWeeklyHours: number }[] {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  return SAMPLE_STAFF_POOL.filter((name) => !taken.has(name.toLowerCase()))
    .slice(0, count)
    .map((name) => ({ name, maxWeeklyHours: SAMPLE_STAFF_HOURS }))
}
