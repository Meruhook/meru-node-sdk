import type { MeruClientConfig } from '../types/client.js';
import { HttpClient } from './http-client.js';
import { AddressResource } from '../resources/address-resource.js';
import { UsageResource } from '../resources/usage-resource.js';
import { BillingResource } from '../resources/billing-resource.js';
import { AccountResource } from '../resources/account-resource.js';

/**
 * Main Meru API client
 */
export class MeruClient {
  private readonly httpClient: HttpClient;
  public readonly addresses: AddressResource;
  public readonly usage: UsageResource;
  public readonly billing: BillingResource;
  public readonly account: AccountResource;

  constructor(config: MeruClientConfig) {
    // HttpClient constructor now handles all validation
    this.httpClient = new HttpClient(config);
    
    // Initialize resource instances
    this.addresses = new AddressResource(this.httpClient);
    this.usage = new UsageResource(this.httpClient);
    this.billing = new BillingResource(this.httpClient);
    this.account = new AccountResource(this.httpClient);
  }

  /**
   * Create a new Meru client instance
   */
  static create(config: MeruClientConfig): MeruClient {
    return new MeruClient(config);
  }

  /**
   * Get the HTTP client instance (for advanced usage)
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }
}