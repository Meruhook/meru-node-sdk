import { Address, Usage, Billing, AccountOverview } from '../../src/types';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestWebhookUrl(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `https://webhook.site/${random}-${timestamp}`;
}

export function formatAddress(address: Address): string {
  const status = address.isEnabled ? '🟢 Active' : '🔴 Disabled';
  const type = address.isPermanent ? 'Permanent' : 'Temporary';
  return `${address.address} [${status}, ${type}]`;
}

export function formatUsage(usage: Usage): string {
  const successRate = usage.totalEmails > 0 
    ? ((usage.successfulEmails / usage.totalEmails) * 100).toFixed(1) 
    : '0';
  return `${usage.totalEmails} total emails, ${usage.successfulEmails} successful (${successRate}% success rate)`;
}

export function formatBilling(billing: Billing): string {
  const projectedStr = billing.projectedCost 
    ? `, projected: $${billing.projectedCost.toFixed(2)}` 
    : '';
  return `Current: $${billing.currentCost.toFixed(2)}${projectedStr}`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCount(count: number): string {
  return count.toLocaleString();
}

export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function createTestAddress(baseWebhookUrl: string): {
  webhookUrl: string;
  isPermanent: boolean;
} {
  const timestamp = Date.now();
  return {
    webhookUrl: `${baseWebhookUrl}?test=${timestamp}`,
    isPermanent: Math.random() > 0.5, // Randomly choose permanent or temporary
  };
}

export function validateEnvironment(): void {
  const required = ['MERU_API_TOKEN', 'WEBHOOK_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function getPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1);
  return `${prev.getFullYear()}-${(prev.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function formatAccountHealth(overview: AccountOverview): string {
  const health = overview.summary.isOverSpendingLimit ? '🔴 Over Limit' : '🟢 Healthy';
  return `${health} - ${overview.summary.activeAddresses} addresses, ${formatMoney(overview.summary.costThisMonth)} this month`;
}

export interface OperationResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export class OperationTracker {
  private operations: OperationResult[] = [];
  private startTime = Date.now();

  async track<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const operationStart = Date.now();
    try {
      const result = await fn();
      this.operations.push({
        name,
        success: true,
        duration: Date.now() - operationStart,
        data: result
      });
      return result;
    } catch (error: any) {
      this.operations.push({
        name,
        success: false,
        duration: Date.now() - operationStart,
        error: error.message || String(error)
      });
      throw error;
    }
  }

  getStats() {
    const total = this.operations.length;
    const successful = this.operations.filter(op => op.success).length;
    const failed = total - successful;
    const totalTime = Date.now() - this.startTime;
    const durations = this.operations.map(op => op.duration);
    const averageTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    return {
      total,
      successful,
      failed,
      totalTime,
      averageTime,
      operations: this.operations
    };
  }
}