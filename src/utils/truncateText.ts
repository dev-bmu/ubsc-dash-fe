export const truncateText = (label: string, maxLength: number): string => {
  if (label.length <= maxLength) return label
  return label.slice(0, maxLength).trimEnd() + '…'
}
