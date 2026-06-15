function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
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
    // sep= directive: tells Excel which separator to use
    `sep=${sep}`,
    headers.map(escapeCell).join(sep),
    ...rows.map((row) => row.map(escapeCell).join(sep)),
  ]
  // Explicit BOM (﻿) ensures Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
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
