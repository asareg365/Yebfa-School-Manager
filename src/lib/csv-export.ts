/**
 * @fileOverview Safe CSV Export Utility with Spreadsheet Formula Injection Protection.
 * Protects against CSV injection vulnerabilities when exported files are opened in Excel/Google Sheets.
 */

import { ProfitLossReportData } from "@/components/print/documents/ProfitLossPrintDoc";

/**
 * Sanitizes a string value against spreadsheet formula injection.
 * Formula characters: =, +, -, @, tab (\t), carriage return (\r)
 * When present at the start of a user-entered text field, a leading single quote is prepended.
 */
export function sanitizeSpreadsheetText(value: string): string {
  if (!value) return "";
  const str = String(value);
  const trimmed = str.trimStart();
  const startsWithDangerous = (s: string) =>
    s.startsWith("=") ||
    s.startsWith("+") ||
    s.startsWith("-") ||
    s.startsWith("@") ||
    s.startsWith("\t") ||
    s.startsWith("\r");

  if (startsWithDangerous(str) || startsWithDangerous(trimmed)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Formats and escapes a single cell for RFC 4180 CSV compliance.
 */
export function formatCsvCell(value: any, isNumericAmount: boolean = false): string {
  if (value === null || value === undefined) {
    return '""';
  }

  if (isNumericAmount && typeof value === "number") {
    // Preserve numeric value without formula injection escaping
    return `"${value.toFixed(2)}"`;
  }

  if (isNumericAmount && typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "") {
    return `"${Number(value).toFixed(2)}"`;
  }

  const rawStr = String(value);
  const safeStr = isNumericAmount ? rawStr : sanitizeSpreadsheetText(rawStr);
  // Escape inner double quotes by doubling them
  const escaped = safeStr.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Sanitizes an institution or file name so it cannot contain illegal filesystem characters.
 * Removes characters like / \ : * ? " < > | and replaces whitespace with underscores.
 */
export function sanitizeFilename(name: string): string {
  if (!name) return "Institution";
  return name
    .replace(/[/\\:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "") || "Institution";
}

/**
 * Downloads a CSV string in the browser with UTF-8 BOM.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel respects UTF-8 encoding
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds the standard RFC 4180 CSV content for the Profit & Loss report.
 */
export function generateProfitLossCsvContent(data: ProfitLossReportData): string {
  const lines: string[] = [];

  const schoolName = data.institution?.name || "Institution";
  const motto = data.institution?.motto || "";

  // Header metadata rows
  lines.push([formatCsvCell("INSTITUTION"), formatCsvCell(schoolName)].join(","));
  if (motto) {
    lines.push([formatCsvCell("MOTTO"), formatCsvCell(motto)].join(","));
  }
  lines.push([formatCsvCell("REPORT TITLE"), formatCsvCell("Profit & Loss Report")].join(","));
  lines.push([formatCsvCell("REPORTING PERIOD"), formatCsvCell(data.periodLabel)].join(","));
  if (data.academicYear) {
    lines.push([formatCsvCell("ACADEMIC YEAR"), formatCsvCell(data.academicYear)].join(","));
  }
  if (data.term) {
    lines.push([formatCsvCell("TERM"), formatCsvCell(data.term)].join(","));
  }
  lines.push([formatCsvCell("GENERATED DATE"), formatCsvCell(data.generatedDate)].join(","));
  if (data.generatedBy) {
    lines.push([formatCsvCell("ISSUING OFFICER"), formatCsvCell(data.generatedBy)].join(","));
  }
  lines.push([formatCsvCell("CURRENCY"), formatCsvCell("GHS (Ghana Cedi)")].join(","));
  lines.push(""); // empty row

  // Column headers
  lines.push(
    [
      formatCsvCell("CATEGORY"),
      formatCsvCell("DESCRIPTION"),
      formatCsvCell("TYPE"),
      formatCsvCell("AMOUNT (GHS)"),
    ].join(",")
  );

  // 1. Income Section
  lines.push([formatCsvCell("--- INCOME / REVENUE ---"), formatCsvCell(""), formatCsvCell(""), formatCsvCell("")].join(","));
  if (data.incomeItems.length === 0) {
    lines.push([formatCsvCell("Income"), formatCsvCell("No income records in period"), formatCsvCell("Income"), formatCsvCell(0, true)].join(","));
  } else {
    data.incomeItems.forEach((item) => {
      const desc = item.reference ? `${item.description} [${item.reference}]` : item.description;
      lines.push(
        [
          formatCsvCell(item.category || "Tuition"),
          formatCsvCell(desc),
          formatCsvCell("Income"),
          formatCsvCell(item.amount, true),
        ].join(",")
      );
    });
  }
  lines.push([formatCsvCell("TOTAL INCOME"), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.totalIncome, true)].join(","));
  lines.push(""); // empty row

  // 2. Expenses Section
  lines.push([formatCsvCell("--- EXPENDITURE (OPERATIONS & PAYROLL) ---"), formatCsvCell(""), formatCsvCell(""), formatCsvCell("")].join(","));
  if (data.expenseItems.length === 0) {
    lines.push([formatCsvCell("Expenses"), formatCsvCell("No expense records in period"), formatCsvCell("Expense"), formatCsvCell(0, true)].join(","));
  } else {
    data.expenseItems.forEach((item) => {
      lines.push(
        [
          formatCsvCell(item.category || "Expense"),
          formatCsvCell(item.description),
          formatCsvCell("Expense"),
          formatCsvCell(item.amount, true),
        ].join(",")
      );
    });
  }
  lines.push([formatCsvCell("Subtotal: Operations / Vouchers"), formatCsvCell(""), formatCsvCell("Subtotal"), formatCsvCell(data.operationalExpenses, true)].join(","));
  lines.push([formatCsvCell("Subtotal: Faculty & Staff Payroll"), formatCsvCell(""), formatCsvCell("Subtotal"), formatCsvCell(data.payrollExpenses, true)].join(","));
  lines.push([formatCsvCell("TOTAL EXPENSES"), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.totalExpenses, true)].join(","));
  lines.push(""); // empty row

  // 3. Consolidated Summary
  const netLabel = data.netProfit > 0 ? "Net Profit" : data.netProfit < 0 ? "Net Loss" : "Net Result (Break-even)";
  lines.push([formatCsvCell("--- CONSOLIDATED SUMMARY ---"), formatCsvCell(""), formatCsvCell(""), formatCsvCell("")].join(","));
  lines.push([formatCsvCell("Total Income / Revenue"), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.totalIncome, true)].join(","));
  lines.push([formatCsvCell("Total Operating Expenses"), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.totalExpenses, true)].join(","));
  lines.push([formatCsvCell(netLabel), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.netProfit, true)].join(","));
  lines.push([formatCsvCell("Profit Margin (%)"), formatCsvCell(""), formatCsvCell("Summary"), formatCsvCell(data.margin.toFixed(2))].join(","));

  return lines.join("\r\n");
}
