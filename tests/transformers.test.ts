import { describe, it, expect } from 'bun:test';
import { transformAddress, transformUsage, transformBilling } from '../src/utils/transformers.js';
import type { AddressData, UsageData, BillingData } from '../src/types/index.js';

describe('Transformers', () => {
  describe('transformAddress', () => {
    it('should transform address data correctly', () => {
      const data: AddressData = {
        id: 'addr_123',
        address: 'test@example.com',
        webhook_url: 'https://webhook.test',
        is_enabled: true,
        is_permanent: true,
        expires_at: null,
        email_count: 5,
        last_received_at: '2024-01-15T10:30:00Z',
        is_expired: false,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      const result = transformAddress(data);

      expect(result).toMatchObject({
        id: 'addr_123',
        address: 'test@example.com',
        webhookUrl: 'https://webhook.test',
        isEnabled: true,
        isPermanent: true,
        expiresAt: null,
        emailCount: 5,
        lastReceivedAt: '2024-01-15T10:30:00Z',
        isExpired: false,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle null webhook URL', () => {
      const data: AddressData = {
        id: 'addr_123',
        address: 'test@example.com',
        webhook_url: null,
        is_enabled: true,
        is_permanent: true,
        expires_at: null,
        email_count: 0,
        last_received_at: null,
        is_expired: false,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const result = transformAddress(data);
      expect(result.webhookUrl).toBeNull();
    });
  });

  describe('transformUsage', () => {
    it('should transform usage data correctly', () => {
      const data: UsageData = {
        total_emails: 100,
        successful_emails: 95,
        failed_webhooks: 5,
        today_emails: 10,
        projected_monthly: 200,
        success_rate: 95.0,
        failure_rate: 5.0,
        last_calculated_at: '2024-01-15T10:30:00Z',
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
          current_day: 15,
          days_in_month: 31,
          days_remaining: 16,
        }
      };

      const result = transformUsage(data);

      expect(result).toMatchObject({
        totalEmails: 100,
        successfulEmails: 95,
        failedWebhooks: 5,
        todayEmails: 10,
        projectedMonthly: 200,
        successRate: 95.0,
        failureRate: 5.0,
        lastCalculatedAt: '2024-01-15T10:30:00Z',
      });

      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
      expect(result.period.currentDay).toBe(15);
    });
  });

  describe('transformBilling', () => {
    it('should transform billing data correctly', () => {
      const data: BillingData = {
        current_cost: 12.50,
        projected_cost: 25.00,
        email_processing_cost: 10.00,
        subscription: {
          has_base_subscription: true,
          has_addon_subscription: false,
          on_trial: false,
          trial_ends_at: null,
        },
        spending_limit: {
          has_limit: true,
          limit: 100.00,
          current_spending: 12.50,
          remaining_budget: 87.50,
          percentage_used: 12.5,
          is_over_limit: false,
          limit_reached_at: null,
        },
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        }
      };

      const result = transformBilling(data);

      expect(result).toMatchObject({
        currentCost: 12.50,
        projectedCost: 25.00,
        emailProcessingCost: 10.00,
      });

      expect(result.subscription.hasBaseSubscription).toBe(true);
      expect(result.spendingLimit.hasLimit).toBe(true);
      expect(result.spendingLimit.limit).toBe(100.00);
      expect(result.period.start).toBeInstanceOf(Date);
    });
  });
});