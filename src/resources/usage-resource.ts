import type { HttpClient } from '../client/http-client.js';
import type { Usage, UsageEvent } from '../types/usage.js';
import {
  GetUsageRequest,
  GetUsageEventsRequest,
  GetUsagePeriodRequest,
} from '../requests/usage/index.js';

/**
 * Usage resource for statistics and events
 */
export class UsageResource {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get current month usage summary
   */
  async get(): Promise<Usage> {
    const request = new GetUsageRequest();
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get recent usage events (audit trail)
   */
  async events(limit: number = 50): Promise<UsageEvent[]> {
    const request = new GetUsageEventsRequest(limit);
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get usage for a specific period (YYYY-MM format)
   */
  async period(period: string): Promise<Usage> {
    const request = new GetUsagePeriodRequest(period);
    const requestOptions = request.getRequestOptions();
    const response = await this.httpClient.request<{ data: any }>(requestOptions);
    return request.transformResponse(response);
  }

  /**
   * Get usage for a specific year and month
   */
  async forMonth(year: number, month: number): Promise<Usage> {
    const period = `${year}-${month.toString().padStart(2, '0')}`;
    return this.period(period);
  }

  /**
   * Get usage for the previous month
   */
  async previousMonth(): Promise<Usage> {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return this.forMonth(previousMonth.getFullYear(), previousMonth.getMonth() + 1);
  }
}