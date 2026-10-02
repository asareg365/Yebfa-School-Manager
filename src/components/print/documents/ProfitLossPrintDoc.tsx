"use client";

import React from "react";
import { PrintDocumentLayout } from "../PrintDocumentLayout";
import { PrintHeader, SchoolSettingsData } from "../PrintHeader";
import { PrintFooter } from "../PrintFooter";
import { PrintSignatureBlock } from "../PrintSignatureBlock";

export interface ProfitLossReportData {
  institution?: SchoolSettingsData | null;
  periodLabel: string;
  academicYear?: string;
  term?: string;
  generatedDate: string;
  generatedBy?: string;
  reportCode?: string;
  incomeItems: Array<{
    id?: string;
    category: string;
    description: string;
    amount: number;
    date?: string;
    reference?: string;
  }>;
  expenseItems: Array<{
    id?: string;
    category: string;
    description: string;
    amount: number;
    date?: string;
    type?: string; // 'Operations' | 'Payroll'
  }>;
  totalIncome: number;
  operationalExpenses: number;
  payrollExpenses: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
}

interface ProfitLossPrintDocProps {
  data: ProfitLossReportData;
}

export const ProfitLossPrintDoc: React.FC<ProfitLossPrintDocProps> = ({ data }) => {
  const {
    institution,
    periodLabel,
    academicYear,
    term,
    generatedDate,
    generatedBy,
    reportCode,
    incomeItems = [],
    expenseItems = [],
    totalIncome,
    totalExpenses,
    operationalExpenses,
    payrollExpenses,
    netProfit,
    margin,
  } = data;

  const netLabel =
    netProfit > 0
      ? "NET PROFIT"
      : netProfit < 0
      ? "NET LOSS"
      : "BREAK-EVEN / NET RESULT";

  const netStatusClass =
    netProfit > 0
      ? "bg-emerald-50 text-emerald-950 border-emerald-700"
      : netProfit < 0
      ? "bg-rose-50 text-rose-950 border-rose-700"
      : "bg-slate-50 text-slate-900 border-slate-700";

  return (
    <PrintDocumentLayout orientation="portrait" documentTitle={`Profit_Loss_Report_${periodLabel}`}>
      <div className="p-4 sm:p-6 bg-white text-black font-sans leading-normal">
        {/* Official Header */}
        <PrintHeader
          institution={institution}
          title="PROFIT & LOSS REPORT"
          subtitle="Comprehensive Statement of Financial Performance"
          periodLabel={periodLabel}
          academicYear={academicYear}
          term={term}
          generatedDate={generatedDate}
        />

        {/* Executive Summary Cards (Print Friendly) */}
        <div className="grid grid-cols-3 gap-3 my-6 break-inside-avoid">
          <div className="border border-slate-800 p-3 bg-slate-50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Total Revenue / Income
            </span>
            <span className="text-lg font-black text-black">
              GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-600 block mt-0.5">
              Tuition Collections & Intake
            </span>
          </div>

          <div className="border border-slate-800 p-3 bg-slate-50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Total Operating Expenses
            </span>
            <span className="text-lg font-black text-black">
              GH₵ {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-600 block mt-0.5">
              Overheads & Faculty Payroll
            </span>
          </div>

          <div className={`border-2 p-3 ${netStatusClass}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              {netLabel}
            </span>
            <span className="text-lg font-black">
              GH₵ {Math.abs(netProfit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {netProfit < 0 ? " (DR)" : ""}
            </span>
            <span className="text-[9px] font-bold block mt-0.5">
              Margin: {margin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 1. INCOME / REVENUE SECTION */}
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-black">
              1. Income / Revenue Breakdown
            </h3>
            <span className="text-[10px] text-slate-600 italic font-medium">
              Currency: Ghana Cedi (GHS)
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-100">
                <th className="py-2 px-2 font-bold w-12 text-slate-800">#</th>
                <th className="py-2 px-2 font-bold w-28 text-slate-800">Category</th>
                <th className="py-2 px-2 font-bold text-slate-800">Description / Reference</th>
                <th className="py-2 px-2 font-bold w-24 text-slate-800">Date</th>
                <th className="py-2 px-2 font-bold w-32 text-right text-slate-800">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {incomeItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 px-2 text-center text-slate-500 italic">
                    No income transactions recorded for the reporting period.
                  </td>
                </tr>
              ) : (
                incomeItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-600 text-[11px]">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-semibold text-[11px]">{item.category}</td>
                    <td className="py-1.5 px-2 text-[11px]">
                      {item.description}
                      {item.reference ? (
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          [{item.reference}]
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 text-[10px] font-mono whitespace-nowrap">
                      {item.date ? item.date.substring(0, 10) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-medium text-[11px]">
                      {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold bg-slate-100">
                <td colSpan={4} className="py-2 px-2 text-right uppercase tracking-wider text-black">
                  Total Income / Revenue
                </td>
                <td className="py-2 px-2 text-right font-mono font-black text-black">
                  GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 2. EXPENSES SECTION */}
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-black">
              2. Expenditure Breakdown (Operations & Payroll)
            </h3>
            <span className="text-[10px] text-slate-600 italic font-medium">
              Currency: Ghana Cedi (GHS)
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-100">
                <th className="py-2 px-2 font-bold w-12 text-slate-800">#</th>
                <th className="py-2 px-2 font-bold w-28 text-slate-800">Category</th>
                <th className="py-2 px-2 font-bold text-slate-800">Description</th>
                <th className="py-2 px-2 font-bold w-24 text-slate-800">Date</th>
                <th className="py-2 px-2 font-bold w-32 text-right text-slate-800">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {expenseItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 px-2 text-center text-slate-500 italic">
                    No expenditure vouchers or payroll records for the reporting period.
                  </td>
                </tr>
              ) : (
                expenseItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-600 text-[11px]">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-semibold text-[11px]">{item.category}</td>
                    <td className="py-1.5 px-2 text-[11px]">{item.description}</td>
                    <td className="py-1.5 px-2 text-slate-600 text-[10px] font-mono whitespace-nowrap">
                      {item.date ? item.date.substring(0, 10) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-medium text-[11px]">
                      {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-400 font-semibold bg-slate-50 text-[11px]">
                <td colSpan={4} className="py-1 px-2 text-right text-slate-700">
                  Subtotal: Operational Expenses / Vouchers
                </td>
                <td className="py-1 px-2 text-right font-mono text-slate-800">
                  GH₵ {operationalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-b border-slate-400 font-semibold bg-slate-50 text-[11px]">
                <td colSpan={4} className="py-1 px-2 text-right text-slate-700">
                  Subtotal: Faculty & Staff Payroll Disbursements
                </td>
                <td className="py-1 px-2 text-right font-mono text-slate-800">
                  GH₵ {payrollExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-t-2 border-black font-bold bg-slate-100">
                <td colSpan={4} className="py-2 px-2 text-right uppercase tracking-wider text-black">
                  Total Operating Expenses
                </td>
                <td className="py-2 px-2 text-right font-mono font-black text-black">
                  GH₵ {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 3. CONSOLIDATED FINANCIAL SUMMARY */}
        <div className="mt-8 p-4 border-2 border-black bg-slate-50 break-inside-avoid">
          <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-400 pb-2 mb-3 text-black">
            3. Consolidated Financial Summary
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-slate-800">Total Income / Revenue</span>
              <span className="font-mono font-bold">
                GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-300">
              <span className="font-semibold text-slate-800">Less: Total Operating Expenses</span>
              <span className="font-mono font-bold text-slate-900">
                (GH₵ {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t-2 border-black font-black text-sm">
              <span className="uppercase tracking-wider">{netLabel}</span>
              <span className="font-mono">
                {netProfit < 0 ? "-" : ""}GH₵ {Math.abs(netProfit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-300 text-[11px] text-slate-700">
              <span>Operating Profit Margin</span>
              <span className="font-mono font-bold">{margin.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Certification Signature Block */}
        <PrintSignatureBlock />

        {/* Official Footer */}
        <PrintFooter
          institution={institution}
          generatedDate={generatedDate}
          generatedBy={generatedBy}
          reportCode={reportCode}
        />
      </div>
    </PrintDocumentLayout>
  );
};
