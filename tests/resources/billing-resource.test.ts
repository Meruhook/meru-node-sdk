import { describe, it, expect, beforeEach } from 'bun:test';
import { MeruClient } from '../../src/index.js';

// Mock fetch for testing
global.fetch = async (url: string | Request, init?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url.url;
  const method = init?.method || 'GET';

  // Mock billing information
  if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
    return new Response(JSON.stringify({
      data: {
        current_cost: 24.75,
        projected_cost: 49.50,
        spending_limit: {
          has_limit: true,
          limit_amount: 100.00,
          is_over_limit: false,
          remaining_budget: 75.25,
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
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Mock billing breakdown
  if (urlStr.includes('/api/billing/breakdown') && method === 'GET') {
    return new Response(JSON.stringify({
      data: {
        items: [
          {
            id: 'line_1',
            description: 'Email Processing',
            category: 'email',
            quantity: 1247,
            unit_price: 0.012,
            amount: 14.96,
            period: '2024-01-01 to 2024-01-15'
          },
          {
            id: 'line_2',
            description: 'Webhook Delivery Attempts',
            category: 'webhook',
            quantity: 1189,
            unit_price: 0.005,
            amount: 5.95,
            period: '2024-01-01 to 2024-01-15'
          },
          {
            id: 'line_3',
            description: 'Email Storage',
            category: 'storage',
            quantity: 58,
            unit_price: 0.065,
            amount: 3.77,
            period: '2024-01-01 to 2024-01-15'
          },
          {
            id: 'line_4',
            description: 'API Requests',
            category: 'api',
            quantity: 156,
            unit_price: 0.0005,
            amount: 0.08,
            period: '2024-01-01 to 2024-01-15'
          }
        ],
        total_amount: 24.76,
        period: {
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-15T23:59:59Z'
        },
        currency: 'USD',
        generated_at: '2024-01-15T12:00:00Z'
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
};

describe('BillingResource', () => {
  let client: MeruClient;

  beforeEach(() => {
    client = new MeruClient({
      apiToken: 'test-token',
      baseUrl: 'https://api.test.com',
    });
  });

  describe('get', () => {
    it('should get current billing status', async () => {
      const billing = await client.billing.get();
      
      expect(billing.currentCost).toBe(24.75);
      expect(billing.projectedCost).toBe(49.50);
      expect(billing.spendingLimit).toEqual({
        hasLimit: true,
        limitAmount: 100.00,
        isOverLimit: false,
        remainingBudget: 75.25,
        alertThreshold: 80.00,
        alertTriggered: false
      });
      expect(billing.billingPeriod).toEqual({
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        daysElapsed: 15,
        daysRemaining: 16
      });
      expect(billing.lastUpdated).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('breakdown', () => {
    it('should get detailed billing breakdown', async () => {
      const breakdown = await client.billing.breakdown();
      
      expect(breakdown.items).toHaveLength(4);
      expect(breakdown.totalAmount).toBe(24.76);
      expect(breakdown.currency).toBe('USD');
      expect(breakdown.period).toEqual({
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-15T23:59:59Z')
      });

      // Check first line item
      expect(breakdown.items[0]).toEqual({
        id: 'line_1',
        description: 'Email Processing',
        category: 'email',
        quantity: 1247,
        unitPrice: 0.012,
        amount: 14.96,
        period: '2024-01-01 to 2024-01-15'
      });

      // Check webhook delivery line item
      expect(breakdown.items[1]).toEqual({
        id: 'line_2',
        description: 'Webhook Delivery Attempts',
        category: 'webhook',
        quantity: 1189,
        unitPrice: 0.005,
        amount: 5.95,
        period: '2024-01-01 to 2024-01-15'
      });
    });

    it('should handle different cost categories', async () => {
      const breakdown = await client.billing.breakdown();
      
      const categories = breakdown.items.map(item => item.category);
      expect(categories).toContain('email');
      expect(categories).toContain('webhook');
      expect(categories).toContain('storage');
      expect(categories).toContain('api');
    });

    it('should calculate costs correctly', async () => {
      const breakdown = await client.billing.breakdown();
      
      // Verify quantity * unitPrice = amount for each item
      breakdown.items.forEach(item => {
        const calculatedAmount = item.quantity * item.unitPrice;
        expect(Math.abs(calculatedAmount - item.amount)).toBeLessThan(0.01);
      });
    });
  });

  describe('isOverSpendingLimit', () => {
    it('should return false when under spending limit', async () => {
      const isOverLimit = await client.billing.isOverSpendingLimit();
      
      expect(isOverLimit).toBe(false);
    });

    it('should return true when over spending limit', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
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
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const isOverLimit = await client.billing.isOverSpendingLimit();
      
      expect(isOverLimit).toBe(true);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle no spending limit set', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              current_cost: 24.75,
              projected_cost: 49.50,
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
                days_elapsed: 15,
                days_remaining: 16
              },
              last_updated: '2024-01-15T12:00:00Z'
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const isOverLimit = await client.billing.isOverSpendingLimit();
      
      expect(isOverLimit).toBe(false);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getRemainingBudget', () => {
    it('should return remaining budget when limit is set', async () => {
      const remainingBudget = await client.billing.getRemainingBudget();
      
      expect(remainingBudget).toBe(75.25);
    });

    it('should return null when no spending limit is set', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              current_cost: 24.75,
              projected_cost: 49.50,
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
                days_elapsed: 15,
                days_remaining: 16
              },
              last_updated: '2024-01-15T12:00:00Z'
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const remainingBudget = await client.billing.getRemainingBudget();
      
      expect(remainingBudget).toBeNull();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should return negative budget when over limit', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
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
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const remainingBudget = await client.billing.getRemainingBudget();
      
      expect(remainingBudget).toBe(-25.00);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('getProjectedCost', () => {
    it('should return projected month-end cost', async () => {
      const projectedCost = await client.billing.getProjectedCost();
      
      expect(projectedCost).toBe(49.50);
    });

    it('should handle zero projected cost', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              current_cost: 0.00,
              projected_cost: 0.00,
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
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const projectedCost = await client.billing.getProjectedCost();
      
      expect(projectedCost).toBe(0.00);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle high projected cost', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing') && !urlStr.includes('breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              current_cost: 350.75,
              projected_cost: 750.00,
              spending_limit: {
                has_limit: true,
                limit_amount: 500.00,
                is_over_limit: true,
                remaining_budget: -250.75,
                alert_threshold: 400.00,
                alert_triggered: true
              },
              billing_period: {
                start_date: '2024-01-01T00:00:00Z',
                end_date: '2024-01-31T23:59:59Z',
                days_elapsed: 15,
                days_remaining: 16
              },
              last_updated: '2024-01-15T12:00:00Z'
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const projectedCost = await client.billing.getProjectedCost();
      
      expect(projectedCost).toBe(750.00);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('edge cases', () => {
    it('should handle empty breakdown', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        const method = init?.method || 'GET';

        if (urlStr.includes('/api/billing/breakdown') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              items: [],
              total_amount: 0.00,
              period: {
                start_date: '2024-01-01T00:00:00Z',
                end_date: '2024-01-01T23:59:59Z'
              },
              currency: 'USD',
              generated_at: '2024-01-01T12:00:00Z'
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        
        // Return billing data for other calls
        if (urlStr.includes('/api/billing') && method === 'GET') {
          return new Response(JSON.stringify({
            data: {
              current_cost: 0.00,
              projected_cost: 0.00,
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
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        
        return new Response('Not Found', { status: 404 });
      };

      const breakdown = await client.billing.breakdown();
      
      expect(breakdown.items).toHaveLength(0);
      expect(breakdown.totalAmount).toBe(0.00);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle precision in cost calculations', async () => {
      const breakdown = await client.billing.breakdown();
      
      // All amounts should be properly rounded to 2 decimal places
      breakdown.items.forEach(item => {
        expect(Number.isFinite(item.amount)).toBe(true);
        expect(Number.isFinite(item.unitPrice)).toBe(true);
        expect(Number.isInteger(item.quantity)).toBe(true);
      });

      expect(Number.isFinite(breakdown.totalAmount)).toBe(true);
    });
  });

  describe('method chaining and consistency', () => {
    it('should return consistent data across method calls', async () => {
      const billing = await client.billing.get();
      const isOverLimit = await client.billing.isOverSpendingLimit();
      const remainingBudget = await client.billing.getRemainingBudget();
      const projectedCost = await client.billing.getProjectedCost();

      // All convenience methods should return data consistent with get()
      expect(isOverLimit).toBe(billing.spendingLimit.isOverLimit);
      expect(remainingBudget).toBe(billing.spendingLimit.remainingBudget);
      expect(projectedCost).toBe(billing.projectedCost);
    });

    it('should handle multiple concurrent calls', async () => {
      const promises = [
        client.billing.get(),
        client.billing.breakdown(),
        client.billing.isOverSpendingLimit(),
        client.billing.getRemainingBudget(),
        client.billing.getProjectedCost()
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).toBeDefined(); // billing
      expect(results[1]).toBeDefined(); // breakdown
      expect(typeof results[2]).toBe('boolean'); // isOverLimit
      expect(typeof results[3]).toBe('number'); // remainingBudget
      expect(typeof results[4]).toBe('number'); // projectedCost
    });
  });
});