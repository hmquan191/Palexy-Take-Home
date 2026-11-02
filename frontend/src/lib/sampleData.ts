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
