"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Printer, 
  Download,
  Wallet,
  Receipt,
  Banknote,
  PieChart,
  Loader2,
  ShieldAlert,
  RotateCcw,
  Filter
} from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { printService } from "@/services/print/printService";
import { ProfitLossReportData } from "@/components/print/documents/ProfitLossPrintDoc";
import { generateProfitLossCsvContent, downloadCsv, sanitizeFilename } from "@/lib/csv-export";

export default function ProfitAndLossPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  // Date Filtering State
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // RBAC Resolution
  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isAuthorized = useMemo(() => {
    const role = profile?.role || "";
    return ["super_admin", "school_owner", "administrator", "admin", "accountant", "principal"].includes(role);
  }, [profile]);

  useEffect(() => {
    if (profile) {
      if (profile.role === "super_admin") {
        setInstitutionId(localStorage.getItem("selected_institution_id"));
      } else {
        setInstitutionId(profile.tenantId || null);
      }
    } else {
      const storedId = localStorage.getItem("selected_institution_id");
      if (storedId) setInstitutionId(storedId);
    }
  }, [profile]);

  const instRef = useMemo(() => (institutionId ? doc(db, "institutions", institutionId) : null), [db, institutionId]);
  const { data: institution, loading: instLoading } = useDoc(instRef);

  // Data Queries (Tenant Isolation)
  const txnsQuery = useMemo(
    () => (institutionId ? query(collection(db, "transactions"), where("tenantId", "==", institutionId)) : null),
    [db, institutionId]
  );
  const expensesQuery = useMemo(
    () => (institutionId ? query(collection(db, "expenditure_vouchers"), where("tenantId", "==", institutionId)) : null),
    [db, institutionId]
  );
  const payrollQuery = useMemo(
    () => (institutionId ? query(collection(db, "payroll_records"), where("tenantId", "==", institutionId)) : null),
    [db, institutionId]
  );

  const { data: rawIncomeTxns = [], loading: txnsLoading } = useCollection(txnsQuery);
  const { data: rawExpenses = [], loading: expensesLoading } = useCollection(expensesQuery);
  const { data: rawPayroll = [], loading: payrollLoading } = useCollection(payrollQuery);

  const isDataLoading = txnsLoading || expensesLoading || payrollLoading || instLoading || profileLoading;

  // Helper to extract ISO date from records
  const getItemDate = (item: any): string => {
    if (item.date && typeof item.date === "string") {
      return item.date.substring(0, 10);
    }
    if (item.paidAt?.toDate) {
      return item.paidAt.toDate().toISOString().substring(0, 10);
    }
    if (item.createdAt?.toDate) {
      return item.createdAt.toDate().toISOString().substring(0, 10);
    }
    return "";
  };

  // Filtered Datasets using the single authoritative criteria
  const filteredIncomeTxns = useMemo(() => {
    return rawIncomeTxns.filter((t: any) => {
      const d = getItemDate(t);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });
  }, [rawIncomeTxns, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter((e: any) => {
      const d = getItemDate(e);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });
  }, [rawExpenses, dateFrom, dateTo]);

  const filteredPayroll = useMemo(() => {
    return rawPayroll.filter((p: any) => {
      const d = getItemDate(p);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });
  }, [rawPayroll, dateFrom, dateTo]);

  // Authoritative Accounting Formulas (Unchanged)
  const totalIncome = useMemo(
    () => filteredIncomeTxns.reduce((a, c: any) => a + (Number(c.amount) || 0), 0),
    [filteredIncomeTxns]
  );
  const operationalExpenses = useMemo(
    () => filteredExpenses.reduce((a, c: any) => a + (Number(c.amount) || 0), 0),
    [filteredExpenses]
  );
  const payrollExpenses = useMemo(
    () => filteredPayroll.reduce((a, c: any) => a + (Number(c.netSalary) || 0), 0),
    [filteredPayroll]
  );
  const totalExpenses = operationalExpenses + payrollExpenses;
  const netProfit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Active reporting period label
  const reportPeriodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    if (dateTo) return `Up to ${dateTo}`;
    const term = institution?.currentTerm || "Term 1";
    const year = institution?.academicYear || "2026/2027";
    return `${year} — ${term}`;
  }, [dateFrom, dateTo, institution]);

  // Consolidated Authoritative Report Model feeding Screen, CSV, and Print
  const authoritativeReportData: ProfitLossReportData = useMemo(() => {
    const incomeItems = filteredIncomeTxns.map((t: any) => ({
      id: t.id,
      category: t.category || "Tuition Fees",
      description: t.studentName ? `Tuition Payment — ${t.studentName}` : (t.description || "Tuition Payment"),
      amount: Number(t.amount) || 0,
      date: getItemDate(t),
      reference: t.reference || t.invoiceNumber || "",
    }));

    const operationalItems = filteredExpenses.map((e: any) => ({
      id: e.id,
      category: e.category || "Overheads",
      description: e.description || "Operational Expenditure",
      amount: Number(e.amount) || 0,
      date: getItemDate(e),
      type: "Operations",
    }));

    const payrollItems = filteredPayroll.map((p: any) => ({
      id: p.id,
      category: "Payroll & SSNIT",
      description: `Disbursement: ${p.staffName || "Faculty"} (${p.staffRole || "Staff"}) — ${p.month || ""} ${p.year || ""}`.trim(),
      amount: Number(p.netSalary) || 0,
      date: getItemDate(p),
      type: "Payroll",
    }));

    const instName = institution?.name || "Institution";
    const instCode = institution?.schoolCode || "SCH";

    return {
      institution: {
        name: instName,
        schoolCode: instCode,
        logoUrl: institution?.logoUrl || null,
        address: institution?.address || "",
        location: institution?.location || "",
        phone: institution?.phone || "",
        email: institution?.email || institution?.ownerEmail || "",
        motto: institution?.motto || "",
        academicYear: institution?.academicYear || "2026/2027",
        currentTerm: institution?.currentTerm || "Term 1",
      },
      periodLabel: reportPeriodLabel,
      academicYear: institution?.academicYear || "2026/2027",
      term: institution?.currentTerm || "Term 1",
      generatedDate: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      generatedBy: profile?.name || user?.displayName || user?.email || "Finance Officer",
      reportCode: `PL-${instCode.toUpperCase()}-${new Date().toISOString().substring(0, 10)}`,
      incomeItems,
      expenseItems: [...operationalItems, ...payrollItems],
      totalIncome,
      operationalExpenses,
      payrollExpenses,
      totalExpenses,
      netProfit,
      margin,
    };
  }, [
    filteredIncomeTxns,
    filteredExpenses,
    filteredPayroll,
    institution,
    reportPeriodLabel,
    profile,
    user,
    totalIncome,
    operationalExpenses,
    payrollExpenses,
    totalExpenses,
    netProfit,
    margin,
  ]);

  // Handler: CSV Export (Safe, formula-injection protected, dynamic filename, zero mutations)
  const handleExportCsv = () => {
    if (!isAuthorized) {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "You do not have authorization to export financial reports.",
      });
      return;
    }

    if (authoritativeReportData.incomeItems.length === 0 && authoritativeReportData.expenseItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data Available",
        description: "No financial records are available for the selected reporting period.",
      });
      return;
    }

    try {
      setIsExporting(true);
      const schoolNameSafe = sanitizeFilename(institution?.name || "Institution");
      const rawPeriod = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : (institution?.currentTerm || "Term");
      const periodSafe = sanitizeFilename(rawPeriod);
      const filename = `${schoolNameSafe}_Profit_Loss_${periodSafe}.csv`;

      const csvString = generateProfitLossCsvContent(authoritativeReportData);
      downloadCsv(filename, csvString);

      toast({
        title: "CSV Export Complete",
        description: `Downloaded ${filename} successfully.`,
      });
    } catch (err) {
      console.error("[ProfitLossPage] Error generating CSV export:", err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An unexpected error occurred while generating the CSV file.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handler: Centralized Global Print Architecture (Zero window.print in page)
  const handlePrint = async () => {
    if (!isAuthorized) {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "You do not have authorization to print financial audit reports.",
      });
      return;
    }

    if (authoritativeReportData.incomeItems.length === 0 && authoritativeReportData.expenseItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data Available",
        description: "No financial records are available for the selected reporting period.",
      });
      return;
    }

    try {
      setIsPrinting(true);
      const instName = institution?.name || "Institution";
      await printService.printDocument<ProfitLossReportData>({
        type: "profit-loss",
        title: `${instName} — Profit & Loss Report (${reportPeriodLabel})`,
        data: authoritativeReportData,
      });
    } catch (err) {
      console.error("[ProfitLossPage] Error dispatching print job:", err);
      toast({
        variant: "destructive",
        title: "Print Failed",
        description: "An error occurred while preparing the print document.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  // RBAC Access Restriction Gate
  if (!profileLoading && profile && !isAuthorized) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold font-headline text-primary">Restricted Financial Access</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Access to institutional Profit & Loss audit reports is reserved for authorized School Owners, Administrators, and Financial Officers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Banner and Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary">Strategic Financial Report</h1>
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30">
              Official Audit
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm md:text-base font-medium">
            Comprehensive Profit & Loss for{" "}
            <span className="text-accent font-bold uppercase">{reportPeriodLabel}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isPrinting || isDataLoading}
            className="flex-1 sm:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase shadow-sm border-slate-300 hover:bg-slate-50 transition-all"
          >
            {isPrinting ? <Loader2 className="size-4 animate-spin text-primary" /> : <Printer className="size-4 text-primary" />}
            Print PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting || isDataLoading}
            className="flex-1 sm:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase shadow-sm border-slate-300 hover:bg-slate-50 transition-all"
          >
            {isExporting ? <Loader2 className="size-4 animate-spin text-primary" /> : <Download className="size-4 text-primary" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filtering Bar */}
      <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Filter className="size-4 text-primary" />
              <span>Reporting Filter:</span>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="dateFrom" className="text-xs font-bold text-slate-600">From:</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-40 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="dateTo" className="text-xs font-bold text-slate-600">To:</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-40 text-xs rounded-xl"
              />
            </div>

            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-primary gap-1.5"
              >
                <RotateCcw className="size-3.5" /> Reset Filter
              </Button>
            )}
          </div>

          <div className="text-right text-[11px] text-muted-foreground font-medium">
            Active Dataset: <span className="font-bold text-primary">{filteredIncomeTxns.length}</span> Incomes • <span className="font-bold text-primary">{filteredExpenses.length + filteredPayroll.length}</span> Expenses
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Gross Income Card */}
        <Card className="border-none shadow-md bg-white border-l-4 border-green-600">
          <CardHeader className="pb-2 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Gross Income</CardDescription>
              <TrendingUp className="size-4 text-green-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">
              GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            <p className="text-[10px] text-muted-foreground italic truncate">
              {filteredIncomeTxns.length} tuition collection transactions
            </p>
          </CardContent>
        </Card>

        {/* Expenditure Card */}
        <Card className="border-none shadow-md bg-white border-l-4 border-destructive">
          <CardHeader className="pb-2 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Total Expenditure</CardDescription>
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">
              GH₵ {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            <p className="text-[10px] text-muted-foreground italic truncate">
              {filteredExpenses.length} operational vouchers + {filteredPayroll.length} payroll disbursements
            </p>
          </CardContent>
        </Card>

        {/* Net Position Card */}
        <Card
          className={`sm:col-span-2 lg:col-span-1 border-none shadow-lg border-l-4 ${
            netProfit >= 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-destructive bg-destructive text-destructive-foreground"
          }`}
        >
          <CardHeader className="pb-2 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <CardDescription
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  netProfit >= 0 ? "text-primary-foreground/70" : "text-destructive-foreground/70"
                }`}
              >
                {netProfit > 0 ? "Net Profit" : netProfit < 0 ? "Net Loss" : "Break-Even Position"}
              </CardDescription>
              <BarChart3 className="size-4 opacity-50" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">
              GH₵ {Math.abs(netProfit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {netProfit < 0 ? " (Deficit)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Operating Margin</span>
                <span>{margin.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(100, Math.max(0, margin))}
                className={`h-1.5 ${netProfit >= 0 ? "bg-white/20" : "bg-destructive-foreground/20"}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Details */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        {/* Income Breakdown */}
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <ArrowDownLeft className="size-5 text-green-600 shrink-0" /> Income Breakdown
              </CardTitle>
              <span className="text-xs font-mono font-bold text-green-700">
                GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-96 overflow-y-auto">
              <div className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <Wallet className="size-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">Tuition Fees & Collections</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">
                      {filteredIncomeTxns.length} payment receipts registered
                    </p>
                  </div>
                </div>
                <span className="font-bold text-primary text-sm md:text-base whitespace-nowrap ml-2">
                  GH₵ {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {filteredIncomeTxns.slice(0, 5).map((t: any) => (
                <div key={t.id} className="px-4 py-2.5 flex justify-between items-center text-xs bg-slate-50/40">
                  <div className="truncate mr-2">
                    <span className="font-medium text-slate-800">{t.studentName || "Tuition payment"}</span>
                    {t.reference && <span className="text-[10px] text-muted-foreground font-mono ml-2">[{t.reference}]</span>}
                  </div>
                  <span className="font-mono text-slate-700 whitespace-nowrap font-medium">
                    GH₵ {Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}

              {filteredIncomeTxns.length > 5 && (
                <div className="p-2 text-center text-[10px] text-muted-foreground italic bg-slate-50">
                  + {filteredIncomeTxns.length - 5} additional income records included in report totals
                </div>
              )}

              {filteredIncomeTxns.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  No income transactions found for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenditure Breakdown */}
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <ArrowUpRight className="size-5 text-destructive shrink-0" /> Expenditure Breakdown
              </CardTitle>
              <span className="text-xs font-mono font-bold text-destructive">
                GH₵ {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-96 overflow-y-auto">
              {/* Payroll row */}
              <div className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Banknote className="size-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">Payroll & Faculty SSNIT</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">
                      {filteredPayroll.length} salary disbursements
                    </p>
                  </div>
                </div>
                <span className="font-bold text-destructive text-sm md:text-base whitespace-nowrap ml-2">
                  GH₵ {payrollExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Operational Overheads row */}
              <div className="p-4 md:p-6 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Receipt className="size-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">Operational Overheads & Utilities</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">
                      {filteredExpenses.length} expenditure vouchers
                    </p>
                  </div>
                </div>
                <span className="font-bold text-destructive text-sm md:text-base whitespace-nowrap ml-2">
                  GH₵ {operationalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {filteredExpenses.slice(0, 3).map((e: any) => (
                <div key={e.id} className="px-4 py-2 flex justify-between items-center text-xs bg-slate-50/40">
                  <div className="truncate mr-2">
                    <span className="font-semibold text-slate-800">{e.category || "Voucher"}: </span>
                    <span className="text-slate-600">{e.description}</span>
                  </div>
                  <span className="font-mono text-slate-700 whitespace-nowrap font-medium">
                    GH₵ {Number(e.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}

              {filteredExpenses.length === 0 && filteredPayroll.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  No expenditure vouchers or payroll disbursements recorded for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Synchronization Note */}
      <div className="flex justify-center pt-8 px-4 text-center">
        <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex flex-col md:flex-row items-center gap-2">
          <PieChart className="size-3 hidden md:block text-primary" />
          Audit integrity synchronized with institutional ledger • {institution?.name || "Institution"} Treasury System
        </p>
      </div>
    </div>
  );
}
