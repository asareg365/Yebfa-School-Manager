import { BaseAIService } from './base.service';

/**
 * @fileOverview HR and Payroll Domain Service.
 */
export class HRService extends BaseAIService {
  async getStaffRegistry(tenantId: string) {
    return this.getTenantData("staff", tenantId);
  }

  async getPayrollHistory(tenantId: string, staffId?: string) {
    const data = await this.getTenantData("payroll_records", tenantId);
    return staffId ? data.filter((d: any) => d.staffId === staffId) : data;
  }

  async getLeaveRequests(tenantId: string) {
    return this.getTenantData("leave_requests", tenantId);
  }
}

export const hrService = new HRService();
