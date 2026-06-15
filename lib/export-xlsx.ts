export type XlsxColumn = { header: string; width: number }
export type XlsxCell = string | number | null | undefined

export async function exportToXLSX(
  filename: string,
  sheetName: string,
  columns: XlsxColumn[],
  rows: XlsxCell[][]
): Promise<void> {
  // Dynamic import — only loaded when user clicks the button
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()
  wb.creator = 'StockFlow MVP'
  wb.created = new Date()

  const ws = wb.addWorksheet(sheetName)

  // Column definitions with widths
  ws.columns = columns.map((col, i) => ({
    key: `c${i}`,
    width: col.width,
  }))

  // Header row
  const headerRow = ws.addRow(columns.map((c) => c.header))
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2' }]

  // Auto filter on header row
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  // Data rows
  rows.forEach((rowData, rowIndex) => {
    const row = ws.addRow(rowData.map((cell) => (cell == null ? '' : cell)))
    row.height = 18
    row.alignment = { vertical: 'middle' }
    // Alternate row shading
    if (rowIndex % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      })
    }
  })

  // Write buffer and trigger download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
