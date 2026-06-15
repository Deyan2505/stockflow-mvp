function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  // wrap in quotes if contains separator, quote, or newline
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const sep = ';'
  const lines: string[] = [
    headers.map(escapeCell).join(sep),
    ...rows.map((row) => row.map(escapeCell).join(sep)),
  ]
  // BOM for Excel UTF-8 auto-detection
  const bom = '﻿'
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function csvDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function csvDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function todayStr(): string {
  return new Date().toISOString().substring(0, 10)
}
