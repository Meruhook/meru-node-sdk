/**
 * Usage statistics data object
 */
export interface Usage {
  readonly totalEmails: number;
  readonly successfulEmails: number;
  readonly failedWebhooks: number;
  readonly todayEmails: number;
  readonly projectedMonthly: number;
  readonly successRate: number;
  readonly failureRate: number;
  readonly lastCalculatedAt: string | null;
  readonly period: UsagePeriod;
}

/**
 * Usage period information
 */
export interface UsagePeriod {
  readonly start: Date;
  readonly end: Date;
  readonly currentDay: number;
  readonly daysInMonth: number;
  readonly daysRemaining: number;
}

/**
 * Individual usage event
 */
export interface UsageEvent {
  readonly id: string;
  readonly addressId: string;
  readonly eventType: 'email_received' | 'webhook_sent' | 'webhook_failed';
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Raw usage data from API response
 */
export interface UsageData {
  total_emails: number;
  successful_emails: number;
  failed_webhooks: number;
  today_emails: number;
  projected_monthly: number;
  success_rate: number;
  failure_rate: number;
  last_calculated_at: string | null;
  period: UsagePeriodData;
}

/**
 * Raw usage period data from API response
 */
export interface UsagePeriodData {
  start: string;
  end: string;
  current_day: number;
  days_in_month: number;
  days_remaining: number;
}

/**
 * Raw usage event data from API response
 */
export interface UsageEventData {
  id: string;
  address_id: string;
  event_type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}