/** One decimal, or an en dash when there is nothing to divide by. */
export const formatRatio = (value: number | null): string => (value === null ? '–' : value.toFixed(1))
