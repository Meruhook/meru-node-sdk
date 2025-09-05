import { describe, it, expect, beforeEach } from 'bun:test';
import { MeruClient } from '../../src/index.js';

// Mock fetch for testing
global.fetch = async (url: string | Request, init?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url.url;
  const method = init?.method || 'GET';

  // Mock account overview
  if (urlStr.includes('/api/account/overview') && method === 'GET') {
    return new Response(JSON.stringify({
      data: {
        addresses: [
          {
            id: 'addr_123',
            address: 'inbox1@meru.example',
            webhook_url: 'https://webhook.example.com/endpoint1',
            is_enabled: true,
            is_permanent: true,
            expires_at: null,
            email_count: 42,
            last_received_at: '2024-01-15T14:30:00Z',
            is_expired: false,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-15T14:30:00Z'
          },
          {
            id: 'addr_456',
            address: 'inbox2@meru.example',
            webhook_url: 'https://webhook.example.com/endpoint2',
            is_enabled: false,
            is_permanent: false,
            expires_at: '2024-02-01T00:00:00Z',
            email_count: 18,
            last_received_at: '2024-01-10T09:15:00Z',
            is_expired: false,
            created_at: '2024-01-05T08:30:00Z',
            updated_at: '2024-01-14T16:45:00Z'
          },
          {
            id: 'addr_789',
            address: 'inbox3@meru.example',
            webhook_url: 'https://webhook.example.com/endpoint3',
            is_enabled: true,
            is_permanent: false,
            expires_at: '2024-03-15T00:00:00Z',
            email_count: 7,
            last_received_at: '2024-01-12T11:20:00Z',
            is_expired: false,
            created_at: '2024-01-08T12:15:00Z',
            updated_at: '2024-01-12T11:20:00Z'
          }
        ],
        usage: {
          total_emails: 247,
          successful_emails: 231,
          failed_webhooks: 16,
          success_rate: 93.52,
          period: '2024-01',
          cost: 12.35,
          breakdown: {
            email_processing: 247,
            webhook_delivery: 231,
            storage: 16
          }
        },
        billing: {
          current_cost: 32.85,
          projected_cost: 65.70,
          spending_limit: {
            has_limit: true,
            limit_amount: 100.00,
            is_over_limit: false,
            remaining_budget: 67.15,
            alert_threshold: 80.00,
            alert_triggered: false
          },
          billing_period: {
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-01-31T23:59:59Z',
            days_elapsed: 15,
            days_remaining: 16
          },
          last_updated: '2024-01-15T12:00:00Z'
        },
        summary: {
          active_addresses: 2,
          total_addresses: 3,
          emails_this_month: 247,
          cost_this_month: 32.85,
          is_over_spending_limit: false,
          health_status: 'healthy',
          last_activity: '2024-01-15T14:30:00Z'
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
};

describe('AccountResource', () => {
  let client: MeruClient;

  beforeEach(() => {
    client = new MeruClient({
      apiToken: 'test-token',
      baseUrl: 'https://api.test.com',
    });
  });

  describe('overview', () => {
    it('should get complete account overview', async () => {
      const overview = await client.account.overview();
      
      // Check addresses
      expect(overview.addresses).toHaveLength(3);
      expect(overview.addresses[0]).toEqual({
        id: 'addr_123',
        address: 'inbox1@meru.example',
        webhookUrl: 'https://webhook.example.com/endpoint1',
        isEnabled: true,
        isPermanent: true,
        expiresAt: null,
        emailCount: 42,
        lastReceivedAt: new Date('2024-01-15T14:30:00Z'),
        isExpired: false,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-15T14:30:00Z')
      });

      // Check usage
      expect(overview.usage).toEqual({
        totalEmails: 247,
        successfulEmails: 231,
        failedWebhooks: 16,
        successRate: 93.52,
        period: '2024-01',
        cost: 12.35,
        breakdown: {
          emailProcessing: 247,
          webhookDelivery: 231,
          storage: 16
        }
      });

      // Check billing
      expect(overview.billing).toEqual({
        currentCost: 32.85,
        projectedCost: 65.70,
        spendingLimit: {
          hasLimit: true,
          limitAmount: 100.00,
          isOverLimit: false,
          remainingBudget: 67.15,
          alertThreshold: 80.00,
          alertTriggered: false
        },
        billingPeriod: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
          daysElapsed: 15,
          daysRemaining: 16
        },
        lastUpdated: new Date('2024-01-15T12:00:00Z')
      });

      // Check summary
      expect(overview.summary).toEqual({
        activeAddresses: 2,
        totalAddresses: 3,
        emailsThisMonth: 247,
        costThisMonth: 32.85,
        isOverSpendingLimit: false,
        healthStatus: 'healthy',
        lastActivity: new Date('2024-01-15T14:30:00Z')
      });
    });

    it('should handle different address types', async () => {
      const overview = await client.account.overview();
      
      const permanentAddresses = overview.addresses.filter(addr => addr.isPermanent);
      const temporaryAddresses = overview.addresses.filter(addr => !addr.isPermanent);
      const enabledAddresses = overview.addresses.filter(addr => addr.isEnabled);
      const disabledAddresses = overview.addresses.filter(addr => !addr.isEnabled);

      expect(permanentAddresses).toHaveLength(1);
      expect(temporaryAddresses).toHaveLength(2);
      expect(enabledAddresses).toHaveLength(2);
      expect(disabledAddresses).toHaveLength(1);
    });

    it('should handle address expiration dates', async () => {
      const overview = await client.account.overview();
      
      const addressWithoutExpiry = overview.addresses.find(addr => addr.id === 'addr_123');
      const addressWithExpiry = overview.addresses.find(addr => addr.id === 'addr_456');

      expect(addressWithoutExpiry?.expiresAt).toBeNull();
      expect(addressWithExpiry?.expiresAt).toEqual(new Date('2024-02-01T00:00:00Z'));
    });
  });

  describe('summary', () => {
    it('should get account summary', async () => {
      const summary = await client.account.summary();
      
      expect(summary).toEqual({
        activeAddresses: 2,
        totalAddresses: 3,
        emailsThisMonth: 247,
        costThisMonth: 32.85,
        isOverSpendingLimit: false,
        healthStatus: 'healthy',
        lastActivity: new Date('2024-01-15T14:30:00Z')
      });
    });
  });

  describe('isHealthy', () => {
    it('should return true when account is healthy', async () => {
      const isHealthy = await client.account.isHealthy();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false when over spending limit', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [],
              usage: {
                total_emails: 0,
                successful_emails: 0,
                failed_webhooks: 0,
                success_rate: 0,
                period: '2024-01',
                cost: 0,
                breakdown: {
                  email_processing: 0,
                  webhook_delivery: 0,
                  storage: 0
                }
              },
              billing: {
                current_cost: 125.00,
                projected_cost: 250.00,
                spending_limit: {
                  has_limit: true,
                  limit_amount: 100.00,
                  is_over_limit: true,
                  remaining_budget: -25.00,
                  alert_threshold: 80.00,
                  alert_triggered: true
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 15,
                  days_remaining: 16
                },
                last_updated: '2024-01-15T12:00:00Z'
              },
              summary: {
                active_addresses: 0,
                total_addresses: 0,
                emails_this_month: 0,
                cost_this_month: 125.00,
                is_over_spending_limit: true,
                health_status: 'over_budget',
                last_activity: '2024-01-15T14:30:00Z'
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const isHealthy = await client.account.isHealthy();
      
      expect(isHealthy).toBe(false);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getActiveAddressCount', () => {
    it('should return number of active addresses', async () => {
      const activeCount = await client.account.getActiveAddressCount();
      
      expect(activeCount).toBe(2);
    });

    it('should handle zero active addresses', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [
                {
                  id: 'addr_disabled',
                  address: 'disabled@meru.example',
                  webhook_url: 'https://webhook.example.com/disabled',
                  is_enabled: false,
                  is_permanent: true,
                  expires_at: null,
                  email_count: 0,
                  last_received_at: null,
                  is_expired: false,
                  created_at: '2024-01-01T10:00:00Z',
                  updated_at: '2024-01-01T10:00:00Z'
                }
              ],
              usage: {
                total_emails: 0,
                successful_emails: 0,
                failed_webhooks: 0,
                success_rate: 0,
                period: '2024-01',
                cost: 0,
                breakdown: {
                  email_processing: 0,
                  webhook_delivery: 0,
                  storage: 0
                }
              },
              billing: {
                current_cost: 0,
                projected_cost: 0,
                spending_limit: {
                  has_limit: false,
                  limit_amount: null,
                  is_over_limit: false,
                  remaining_budget: null,
                  alert_threshold: null,
                  alert_triggered: false
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 1,
                  days_remaining: 30
                },
                last_updated: '2024-01-01T12:00:00Z'
              },
              summary: {
                active_addresses: 0,
                total_addresses: 1,
                emails_this_month: 0,
                cost_this_month: 0,
                is_over_spending_limit: false,
                health_status: 'inactive',
                last_activity: null
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const activeCount = await client.account.getActiveAddressCount();
      
      expect(activeCount).toBe(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getCurrentMonthEmailCount', () => {
    it('should return current month email count', async () => {
      const emailCount = await client.account.getCurrentMonthEmailCount();
      
      expect(emailCount).toBe(247);
    });

    it('should handle zero emails', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [],
              usage: {
                total_emails: 0,
                successful_emails: 0,
                failed_webhooks: 0,
                success_rate: 0,
                period: '2024-01',
                cost: 0,
                breakdown: {
                  email_processing: 0,
                  webhook_delivery: 0,
                  storage: 0
                }
              },
              billing: {
                current_cost: 0,
                projected_cost: 0,
                spending_limit: {
                  has_limit: false,
                  limit_amount: null,
                  is_over_limit: false,
                  remaining_budget: null,
                  alert_threshold: null,
                  alert_triggered: false
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 1,
                  days_remaining: 30
                },
                last_updated: '2024-01-01T12:00:00Z'
              },
              summary: {
                active_addresses: 0,
                total_addresses: 0,
                emails_this_month: 0,
                cost_this_month: 0,
                is_over_spending_limit: false,
                health_status: 'new_account',
                last_activity: null
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const emailCount = await client.account.getCurrentMonthEmailCount();
      
      expect(emailCount).toBe(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getCurrentMonthCost', () => {
    it('should return current month cost', async () => {
      const cost = await client.account.getCurrentMonthCost();
      
      expect(cost).toBe(32.85);
    });

    it('should handle zero cost', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [],
              usage: {
                total_emails: 0,
                successful_emails: 0,
                failed_webhooks: 0,
                success_rate: 0,
                period: '2024-01',
                cost: 0,
                breakdown: {
                  email_processing: 0,
                  webhook_delivery: 0,
                  storage: 0
                }
              },
              billing: {
                current_cost: 0,
                projected_cost: 0,
                spending_limit: {
                  has_limit: false,
                  limit_amount: null,
                  is_over_limit: false,
                  remaining_budget: null,
                  alert_threshold: null,
                  alert_triggered: false
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 1,
                  days_remaining: 30
                },
                last_updated: '2024-01-01T12:00:00Z'
              },
              summary: {
                active_addresses: 0,
                total_addresses: 0,
                emails_this_month: 0,
                cost_this_month: 0.00,
                is_over_spending_limit: false,
                health_status: 'new_account',
                last_activity: null
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const cost = await client.account.getCurrentMonthCost();
      
      expect(cost).toBe(0.00);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('method consistency', () => {
    it('should return consistent data across all methods', async () => {
      const overview = await client.account.overview();
      const summary = await client.account.summary();
      const isHealthy = await client.account.isHealthy();
      const activeCount = await client.account.getActiveAddressCount();
      const emailCount = await client.account.getCurrentMonthEmailCount();
      const cost = await client.account.getCurrentMonthCost();

      // All convenience methods should return data consistent with overview
      expect(summary).toEqual(overview.summary);
      expect(isHealthy).toBe(!overview.summary.isOverSpendingLimit);
      expect(activeCount).toBe(overview.summary.activeAddresses);
      expect(emailCount).toBe(overview.summary.emailsThisMonth);
      expect(cost).toBe(overview.summary.costThisMonth);
    });

    it('should handle multiple concurrent calls', async () => {
      const promises = [
        client.account.overview(),
        client.account.summary(),
        client.account.isHealthy(),
        client.account.getActiveAddressCount(),
        client.account.getCurrentMonthEmailCount(),
        client.account.getCurrentMonthCost()
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).toBeDefined(); // overview
      expect(results[1]).toBeDefined(); // summary
      expect(typeof results[2]).toBe('boolean'); // isHealthy
      expect(typeof results[3]).toBe('number'); // activeCount
      expect(typeof results[4]).toBe('number'); // emailCount
      expect(typeof results[5]).toBe('number'); // cost
    });
  });

  describe('edge cases', () => {
    it('should handle null values gracefully', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [],
              usage: {
                total_emails: 0,
                successful_emails: 0,
                failed_webhooks: 0,
                success_rate: 0,
                period: '2024-01',
                cost: 0,
                breakdown: {
                  email_processing: 0,
                  webhook_delivery: 0,
                  storage: 0
                }
              },
              billing: {
                current_cost: 0,
                projected_cost: 0,
                spending_limit: {
                  has_limit: false,
                  limit_amount: null,
                  is_over_limit: false,
                  remaining_budget: null,
                  alert_threshold: null,
                  alert_triggered: false
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 1,
                  days_remaining: 30
                },
                last_updated: '2024-01-01T12:00:00Z'
              },
              summary: {
                active_addresses: 0,
                total_addresses: 0,
                emails_this_month: 0,
                cost_this_month: 0,
                is_over_spending_limit: false,
                health_status: 'new_account',
                last_activity: null
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const overview = await client.account.overview();
      
      expect(overview.addresses).toHaveLength(0);
      expect(overview.summary.lastActivity).toBeNull();
      expect(overview.billing.spendingLimit.remainingBudget).toBeNull();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle large numbers correctly', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/account/overview') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              addresses: [],
              usage: {
                total_emails: 1000000,
                successful_emails: 995000,
                failed_webhooks: 5000,
                success_rate: 99.50,
                period: '2024-01',
                cost: 50000.00,
                breakdown: {
                  email_processing: 1000000,
                  webhook_delivery: 995000,
                  storage: 5000
                }
              },
              billing: {
                current_cost: 50000.00,
                projected_cost: 100000.00,
                spending_limit: {
                  has_limit: true,
                  limit_amount: 75000.00,
                  is_over_limit: true,
                  remaining_budget: -25000.00,
                  alert_threshold: 60000.00,
                  alert_triggered: true
                },
                billing_period: {
                  start_date: '2024-01-01T00:00:00Z',
                  end_date: '2024-01-31T23:59:59Z',
                  days_elapsed: 15,
                  days_remaining: 16
                },
                last_updated: '2024-01-15T12:00:00Z'
              },
              summary: {
                active_addresses: 100,
                total_addresses: 150,
                emails_this_month: 1000000,
                cost_this_month: 50000.00,
                is_over_spending_limit: true,
                health_status: 'over_budget',
                last_activity: '2024-01-15T14:30:00Z'
              }
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const emailCount = await client.account.getCurrentMonthEmailCount();
      const cost = await client.account.getCurrentMonthCost();
      const activeCount = await client.account.getActiveAddressCount();

      expect(emailCount).toBe(1000000);
      expect(cost).toBe(50000.00);
      expect(activeCount).toBe(100);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});