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
  readonly hasRecentActivity: boolean;
  readonly lastActivity: Date | null;
}

/**
 * Raw account overview data from API response
 */
export interface AccountOverviewData {
  addresses: {
    data: any[];
  };
  usage: any;
  billing: any;
  summary: AccountSummaryData;
}

/**
 * Raw account summary data from API response
 */
export interface AccountSummaryData {
  active_addresses: number;
  total_addresses: number;
  is_over_spending_limit: boolean;
  has_recent_activity: boolean;
}