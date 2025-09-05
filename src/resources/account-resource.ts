import type { HttpClient } from '../client/http-client.js';
import type { AccountOverview } from '../types/account.js';
import { GetAccountOverviewRequest } from '../requests/account/index.js';

/**
 * Account resource for account overview
 */
export class AccountResource {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get combined account overview (addresses, usage, billing)
   */
  async overview(): Promise<AccountOverview> {
    const request = new GetAccountOverviewRequest();
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get a quick summary of account status
   */
  async summary() {
    const overview = await this.overview();
    return overview.summary;
  }

  /**
   * Check if account is healthy (no issues)
   */
  async isHealthy(): Promise<boolean> {
    const overview = await this.overview();
    return !overview.summary.isOverSpendingLimit;
  }

  /**
   * Get total number of active addresses
   */
  async getActiveAddressCount(): Promise<number> {
    const overview = await this.overview();
    return overview.summary.activeAddresses;
  }

  /**
   * Get current month email count
   */
  async getCurrentMonthEmailCount(): Promise<number> {
    const overview = await this.overview();
    return overview.summary.emailsThisMonth;
  }

  /**
   * Get current month cost
   */
  async getCurrentMonthCost(): Promise<number> {
    const overview = await this.overview();
    return overview.summary.costThisMonth;
  }
}