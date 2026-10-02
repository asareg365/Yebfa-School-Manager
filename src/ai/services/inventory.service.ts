import { BaseAIService } from './base.service';

/**
 * @fileOverview Inventory and Procurement Domain Service.
 */
export class InventoryService extends BaseAIService {
  async getAssetRegistry(tenantId: string) {
    return this.getTenantData("inventory", tenantId);
  }

  async getProcurementLogs(tenantId: string) {
    return this.getTenantData("procurement_orders", tenantId);
  }

  async getMaintenanceSchedule(tenantId: string) {
    const data = await this.getAssetRegistry(tenantId);
    return data.filter((d: any) => d.condition === 'Poor' || d.condition === 'Broken');
  }
}

export const inventoryService = new InventoryService();
