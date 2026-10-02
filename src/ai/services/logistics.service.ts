import { BaseAIService } from './base.service';

/**
 * @fileOverview Transport, Library, and Hostel Domain Service.
 */
export class LogisticsService extends BaseAIService {
  async getTransportFleet(tenantId: string) {
    return this.getTenantData("vehicles", tenantId);
  }

  async getLibraryCatalog(tenantId: string) {
    return this.getTenantData("library_books", tenantId);
  }

  async getHostelRegistry(tenantId: string) {
    return this.getTenantData("hostels", tenantId);
  }

  async getLibraryTransactions(tenantId: string) {
    return this.getTenantData("library_transactions", tenantId);
  }
}

export const logisticsService = new LogisticsService();
