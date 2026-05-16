import ExcelJS from "exceljs"
import type { AnalyticsFilters, ReportType } from "@/lib/validations/analytics"
import {
  getDashboardAnalytics,
  getInventoryReport,
  getProfitReport,
  getSalesReport,
} from "@/lib/analytics/queries"

const CURRENCY_FMT = "₹#,##0.00"

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let max = 10
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length
      if (len > max) max = Math.min(len + 2, 48)
    })
    col.width = max
  })
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true }
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5F0" },
  }
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  filters: AnalyticsFilters,
  dashboard: Awaited<ReturnType<typeof getDashboardAnalytics>>
) {
  const sheet = workbook.addWorksheet("Summary")
  sheet.addRow(["QuickBill Report Summary"])
  sheet.getRow(1).font = { bold: true, size: 14 }
  sheet.addRow(["Period", `${filters.dateFrom} → ${filters.dateTo}`])
  if (filters.category) sheet.addRow(["Category", filters.category])
  if (filters.cashierId) sheet.addRow(["Cashier filter", filters.cashierId])
  sheet.addRow([])
  sheet.addRow(["Metric", "Value"])
  styleHeader(sheet.getRow(sheet.rowCount))

  const rows: [string, string | number][] = [
    ["Today's orders", dashboard.today.orders],
    ["Today's revenue", dashboard.today.revenue],
    ["Period orders", dashboard.period.orders],
    ["Period revenue", dashboard.period.revenue],
    ["Period profit (est.)", dashboard.period.profit],
    ["Inventory cost value", dashboard.inventory.costValue],
    ["Inventory retail value", dashboard.inventory.retailValue],
  ]

  for (const [label, value] of rows) {
    const row = sheet.addRow([label, value])
    if (
      typeof value === "number" &&
      (label.toLowerCase().includes("revenue") ||
        label.includes("profit") ||
        label.includes("value"))
    ) {
      row.getCell(2).numFmt = CURRENCY_FMT
    }
  }

  autoWidth(sheet)
}

export async function buildReportWorkbook(
  type: ReportType,
  filters: AnalyticsFilters
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "QuickBill"
  workbook.created = new Date()

  const dashboard = await getDashboardAnalytics(filters)

  if (type === "sales" || type === "profit") {
    const sales = await getSalesReport(filters)
    const sheet = workbook.addWorksheet("Sales")
    sheet.addRow([
      "Order #",
      "Date",
      "Customer",
      "Cashier",
      "Payment",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
    ])
    styleHeader(sheet.getRow(1))

    let sumSub = 0
    let sumDisc = 0
    let sumTax = 0
    let sumTotal = 0

    for (const o of sales) {
      const row = sheet.addRow([
        o.orderNumber,
        o.date,
        o.customer,
        o.cashier,
        o.payment,
        o.subtotal,
        o.discount,
        o.tax,
        o.total,
      ])
      row.getCell(2).numFmt = "dd mmm yyyy hh:mm"
      ;[6, 7, 8, 9].forEach((c) => {
        row.getCell(c).numFmt = CURRENCY_FMT
      })
      sumSub += o.subtotal
      sumDisc += o.discount
      sumTax += o.tax
      sumTotal += o.total
    }

    const totalRow = sheet.addRow([
      "TOTALS",
      "",
      "",
      "",
      "",
      sumSub,
      sumDisc,
      sumTax,
      sumTotal,
    ])
    totalRow.font = { bold: true }
    ;[6, 7, 8, 9].forEach((c) => {
      totalRow.getCell(c).numFmt = CURRENCY_FMT
    })
    autoWidth(sheet)
  }

  if (type === "inventory") {
    const rows = await getInventoryReport(filters)
    const sheet = workbook.addWorksheet("Inventory")
    sheet.addRow([
      "SKU",
      "Name",
      "Category",
      "Stock",
      "Low threshold",
      "Cost price",
      "Sell price",
      "Cost value",
      "Retail value",
      "Status",
    ])
    styleHeader(sheet.getRow(1))

    let sumCost = 0
    let sumRetail = 0

    for (const p of rows) {
      const row = sheet.addRow([
        p.sku,
        p.name,
        p.category,
        p.stock,
        p.lowThreshold,
        p.costPrice,
        p.sellPrice,
        p.costValue,
        p.retailValue,
        p.status,
      ])
      ;[6, 7, 8, 9].forEach((c) => {
        row.getCell(c).numFmt = CURRENCY_FMT
      })
      sumCost += p.costValue
      sumRetail += p.retailValue
    }

    const totalRow = sheet.addRow([
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      "",
      sumCost,
      sumRetail,
      "",
    ])
    totalRow.font = { bold: true }
    totalRow.getCell(8).numFmt = CURRENCY_FMT
    totalRow.getCell(9).numFmt = CURRENCY_FMT
    autoWidth(sheet)
  }

  if (type === "profit") {
    const rows = await getProfitReport(filters)
    const sheet = workbook.addWorksheet("Profit")
    sheet.addRow([
      "Order #",
      "Date",
      "Cashier",
      "SKU",
      "Product",
      "Category",
      "Qty",
      "Revenue",
      "Cost",
      "Profit",
    ])
    styleHeader(sheet.getRow(1))

    let sumRev = 0
    let sumCost = 0
    let sumProfit = 0

    for (const r of rows) {
      const row = sheet.addRow([
        r.orderNumber,
        r.date,
        r.cashier,
        r.sku,
        r.name,
        r.category,
        r.quantity,
        r.revenue,
        r.cost,
        r.profit,
      ])
      row.getCell(2).numFmt = "dd mmm yyyy hh:mm"
      ;[8, 9, 10].forEach((c) => {
        row.getCell(c).numFmt = CURRENCY_FMT
      })
      sumRev += r.revenue
      sumCost += r.cost
      sumProfit += r.profit
    }

    const totalRow = sheet.addRow([
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      "",
      sumRev,
      sumCost,
      sumProfit,
    ])
    totalRow.font = { bold: true }
    ;[8, 9, 10].forEach((c) => {
      totalRow.getCell(c).numFmt = CURRENCY_FMT
    })
    autoWidth(sheet)
  }

  addSummarySheet(workbook, filters, dashboard)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
