/**
 * Billing information data object
 */
export interface Billing {
  readonly currentCost: number;
  readonly projectedCost: number;
  readonly emailProcessingCost: number;
  readonly subscription: Subscription;
  readonly spendingLimit: SpendingLimit;
  readonly period: BillingPeriod;
}

/**
 * Subscription status information
 */
export interface Subscription {
  readonly hasBaseSubscription: boolean;
  readonly hasAddonSubscription: boolean;
  readonly onTrial: boolean;
  readonly trialEndsAt: Date | null;
}

/**
 * Spending limit information
 */
export interface SpendingLimit {
  readonly hasLimit: boolean;
  readonly limit: number | null;
  readonly currentSpending: number;
  readonly remainingBudget: number | null;
  readonly percentageUsed: number | null;
  readonly isOverLimit: boolean;
  readonly limitReachedAt: Date | null;
}

/**
 * Billing period information
 */
export interface BillingPeriod {
  readonly start: Date;
  readonly end: Date;
}

/**
 * Billing breakdown information
 */
export interface BillingBreakdown {
  readonly emailProcessingCosts: EmailProcessingCosts;
  readonly subscriptionCosts: SubscriptionCosts;
  readonly totalCost: number;
  readonly period: BillingPeriod;
}

/**
 * Email processing cost breakdown
 */
export interface EmailProcessingCosts {
  readonly emailCount: number;
  readonly costPerEmail: number;
  readonly totalCost: number;
}

/**
 * Subscription cost breakdown
 */
export interface SubscriptionCosts {
  readonly baseCost: number;
  readonly addonCost: number;
  readonly totalCost: number;
}

/**
 * Raw billing data from API response
 */
export interface BillingData {
  current_cost: number;
  projected_cost: number;
  email_processing_cost: number;
  subscription: SubscriptionData;
  spending_limit: SpendingLimitData;
  period: BillingPeriodData;
}

/**
 * Raw subscription data from API response
 */
export interface SubscriptionData {
  has_base_subscription: boolean;
  has_addon_subscription: boolean;
  on_trial: boolean;
  trial_ends_at: string | null;
}

/**
 * Raw spending limit data from API response
 */
export interface SpendingLimitData {
  has_limit: boolean;
  limit: number | null;
  current_spending: number;
  remaining_budget: number | null;
  percentage_used: number | null;
  is_over_limit: boolean;
  limit_reached_at: string | null;
}

/**
 * Raw billing period data from API response
 */
export interface BillingPeriodData {
  start: string;
  end: string;
}

/**
 * Raw billing breakdown data from API response
 */
export interface BillingBreakdownData {
  email_processing_costs: {
    email_count: number;
    cost_per_email: number;
    total_cost: number;
  };
  subscription_costs: {
    base_cost: number;
    addon_cost: number;
    total_cost: number;
  };
  total_cost: number;
  period: BillingPeriodData;
}