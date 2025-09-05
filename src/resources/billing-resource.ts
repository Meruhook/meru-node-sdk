import type { HttpClient } from '../client/http-client.js';
import type { Billing, BillingBreakdown } from '../types/billing.js';
import {
  GetBillingRequest,
  GetBillingBreakdownRequest,
} from '../requests/billing/index.js';

/**
 * Billing resource for billing information
 */
export class BillingResource {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get current billing status and costs
   */
  async get(): Promise<Billing> {
    const request = new GetBillingRequest();
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get detailed cost breakdown
   */
  async breakdown(): Promise<BillingBreakdown> {
    const request = new GetBillingBreakdownRequest();
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Check if user is over spending limit
   */
  async isOverSpendingLimit(): Promise<boolean> {
    const billing = await this.get();
    return billing.spendingLimit.isOverLimit;
  }

  /**
   * Get remaining budget
   */
  async getRemainingBudget(): Promise<number | null> {
    const billing = await this.get();
    return billing.spendingLimit.remainingBudget;
  }

  /**
   * Get current month's projected cost
   */
  async getProjectedCost(): Promise<number> {
    const billing = await this.get();
    return billing.projectedCost;
  }
}