import { BaseAIService } from './base.service';

export class FinanceService extends BaseAIService {
  async getUnpaidInvoices(tenantId: string) {
    const data = await this.getTenantData("invoices", tenantId);
    return data.filter((d: any) => d.status !== "Paid");
  }

  async getLedger(tenantId: string, studentId?: string) {
    const data = await this.getTenantData("student_ledger", tenantId);
    return studentId ? data.filter((d: any) => d.studentId === studentId) : data;
  }

  async getTransactions(tenantId: string) {
    return this.getTenantData("transactions", tenantId);
  }

  async getExpenditure(tenantId: string) {
    return this.getTenantData("expenditure_vouchers", tenantId);
  }
}

export const financeService = new FinanceService();
