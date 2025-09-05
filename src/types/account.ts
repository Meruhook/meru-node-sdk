import type { Address } from './address.js';
import type { Usage } from './usage.js';
import type { Billing } from './billing.js';

/**
 * Account overview data object combining addresses, usage, and billing
 */
export interface AccountOverview {
  readonly addresses: Address[];
  readonly usage: Usage;
  readonly billing: Billing;
  readonly summary: AccountSummary;
}

/**
 * Account summary information
 */
export interface AccountSummary {
  readonly totalAddresses: number;
  readonly activeAddresses: number;
  readonly emailsThisMonth: number;
  readonly costThisMonth: number;
  readonly isOverSpendingLimit: boolean;
}

/**
 * Raw account overview data from API response
 */
export interface AccountOverviewData {
  addresses: any[];
  usage: any;
  billing: any;
  summary: AccountSummaryData;
}

/**
 * Raw account summary data from API response
 */
export interface AccountSummaryData {
  total_addresses: number;
  active_addresses: number;
  emails_this_month: number;
  cost_this_month: number;
  is_over_spending_limit: boolean;
}