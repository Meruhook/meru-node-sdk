import type {
  Address,
  AddressData,
  Usage,
  UsageData,
  UsagePeriod,
  UsagePeriodData,
  UsageEvent,
  UsageEventData,
  Billing,
  BillingData,
  Subscription,
  SubscriptionData,
  SpendingLimit,
  SpendingLimitData,
  BillingPeriod,
  BillingPeriodData,
  BillingBreakdown,
  BillingBreakdownData,
  User,
  UserData,
  ApiToken,
  ApiTokenData,
  AccountOverview,
  AccountOverviewData,
  AccountSummary,
  AccountSummaryData,
} from '../types/index.js';

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Transform raw address data to Address object
 */
export function transformAddress(data: AddressData): Address {
  return {
    id: data.id,
    address: data.address,
    webhookUrl: data.webhook_url,
    isEnabled: data.is_enabled,
    isPermanent: data.is_permanent,
    expiresAt: data.expires_at ? parseDate(data.expires_at) : null,
    emailCount: data.email_count,
    lastReceivedAt: data.last_received_at,
    isExpired: data.is_expired,
    createdAt: parseDate(data.created_at),
    updatedAt: parseDate(data.updated_at),
  };
}

/**
 * Transform raw usage period data to UsagePeriod object
 */
export function transformUsagePeriod(data: UsagePeriodData): UsagePeriod {
  return {
    start: parseDate(data.start),
    end: parseDate(data.end),
    currentDay: data.current_day,
    daysInMonth: data.days_in_month,
    daysRemaining: data.days_remaining,
  };
}

/**
 * Transform raw usage data to Usage object
 */
export function transformUsage(data: UsageData): Usage {
  return {
    totalEmails: data.total_emails,
    successfulEmails: data.successful_emails,
    failedWebhooks: data.failed_webhooks,
    todayEmails: data.today_emails,
    projectedMonthly: data.projected_monthly,
    successRate: data.success_rate,
    failureRate: data.failure_rate,
    lastCalculatedAt: data.last_calculated_at,
    period: transformUsagePeriod(data.period),
  };
}

/**
 * Transform raw usage event data to UsageEvent object
 */
export function transformUsageEvent(data: UsageEventData): UsageEvent {
  return {
    id: data.id,
    addressId: data.address_id,
    eventType: data.event_type as 'email_received' | 'webhook_sent' | 'webhook_failed',
    timestamp: parseDate(data.timestamp),
    metadata: data.metadata,
  };
}

/**
 * Transform raw subscription data to Subscription object
 */
export function transformSubscription(data: SubscriptionData): Subscription {
  return {
    hasBaseSubscription: data.has_base_subscription,
    hasAddonSubscription: data.has_addon_subscription,
    onTrial: data.on_trial,
    trialEndsAt: data.trial_ends_at ? parseDate(data.trial_ends_at) : null,
  };
}

/**
 * Transform raw spending limit data to SpendingLimit object
 */
export function transformSpendingLimit(data: SpendingLimitData): SpendingLimit {
  return {
    hasLimit: data.has_limit,
    limit: data.limit,
    currentSpending: data.current_spending,
    remainingBudget: data.remaining_budget,
    percentageUsed: data.percentage_used,
    isOverLimit: data.is_over_limit,
    limitReachedAt: data.limit_reached_at ? parseDate(data.limit_reached_at) : null,
  };
}

/**
 * Transform raw billing period data to BillingPeriod object
 */
export function transformBillingPeriod(data: BillingPeriodData): BillingPeriod {
  return {
    start: parseDate(data.start),
    end: parseDate(data.end),
  };
}

/**
 * Transform raw billing data to Billing object
 */
export function transformBilling(data: BillingData): Billing {
  return {
    currentCost: data.current_cost,
    projectedCost: data.projected_cost,
    emailProcessingCost: data.email_processing_cost,
    subscription: transformSubscription(data.subscription),
    spendingLimit: transformSpendingLimit(data.spending_limit),
    period: transformBillingPeriod(data.period),
  };
}

/**
 * Transform raw billing breakdown data to BillingBreakdown object
 */
export function transformBillingBreakdown(data: BillingBreakdownData): BillingBreakdown {
  return {
    emailProcessingCosts: {
      emailCount: data.email_processing_costs.email_count,
      costPerEmail: data.email_processing_costs.cost_per_email,
      totalCost: data.email_processing_costs.total_cost,
    },
    subscriptionCosts: {
      baseCost: data.subscription_costs.base_cost,
      addonCost: data.subscription_costs.addon_cost,
      totalCost: data.subscription_costs.total_cost,
    },
    totalCost: data.total_cost,
    period: transformBillingPeriod(data.period),
  };
}

/**
 * Transform raw user data to User object
 */
export function transformUser(data: UserData): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    emailVerifiedAt: data.email_verified_at ? parseDate(data.email_verified_at) : null,
    createdAt: parseDate(data.created_at),
    updatedAt: parseDate(data.updated_at),
  };
}

/**
 * Transform raw API token data to ApiToken object
 */
export function transformApiToken(data: ApiTokenData): ApiToken {
  return {
    id: data.id,
    name: data.name,
    token: data.token,
    abilities: data.abilities,
    expiresAt: data.expires_at ? parseDate(data.expires_at) : null,
    createdAt: parseDate(data.created_at),
    updatedAt: parseDate(data.updated_at),
  };
}

/**
 * Transform raw account summary data to AccountSummary object
 */
export function transformAccountSummary(data: AccountSummaryData): AccountSummary {
  return {
    totalAddresses: data.total_addresses,
    activeAddresses: data.active_addresses,
    emailsThisMonth: data.emails_this_month,
    costThisMonth: data.cost_this_month,
    isOverSpendingLimit: data.is_over_spending_limit,
  };
}

/**
 * Transform raw account overview data to AccountOverview object
 */
export function transformAccountOverview(data: AccountOverviewData): AccountOverview {
  return {
    addresses: data.addresses.map(transformAddress),
    usage: transformUsage(data.usage),
    billing: transformBilling(data.billing),
    summary: transformAccountSummary(data.summary),
  };
}