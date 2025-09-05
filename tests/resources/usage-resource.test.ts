import { describe, it, expect, beforeEach } from 'bun:test';
import { MeruClient } from '../../src/index.js';

// Mock fetch for testing
global.fetch = async (url: string | Request, init?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url.url;
  const method = init?.method || 'GET';

  // Mock current month usage
  if (urlStr.includes('/api/usage') && !urlStr.includes('events') && !urlStr.includes('period') && method === 'GET') {
    return new Response(JSON.stringify({
      data: {
        total_emails: 150,
        successful_emails: 142,
        failed_webhooks: 8,
        success_rate: 94.67,
        period: '2024-01',
        cost: 7.50,
        breakdown: {
          email_processing: 150,
          webhook_delivery: 142,
          storage: 8
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Mock usage events
  if (urlStr.includes('/api/usage/events') && method === 'GET') {
    const limitMatch = urlStr.match(/limit=(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 50;
    
    const events = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      id: `event_${i + 1}`,
      type: i === 0 ? 'email_received' : i === 1 ? 'webhook_delivered' : 'email_failed',
      address_id: `addr_${i + 1}`,
      timestamp: `2024-01-${15 + i}T10:${30 + i}:00Z`,
      details: {
        from: `sender${i + 1}@example.com`,
        to: `test${i + 1}@meru.example`,
        subject: `Test Email ${i + 1}`,
        size_bytes: 1024 + (i * 512)
      },
      cost: 0.05,
      status: i === 2 ? 'failed' : 'success',
      error_message: i === 2 ? 'Webhook endpoint returned 500' : null
    }));

    return new Response(JSON.stringify({
      data: events,
      pagination: {
        limit: limit,
        has_more: limit >= 50
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Mock period usage
  if (urlStr.includes('/api/usage/period/') && method === 'GET') {
    const periodMatch = urlStr.match(/period\/([^?]+)/);
    const period = periodMatch ? periodMatch[1] : '2024-01';
    
    return new Response(JSON.stringify({
      data: {
        total_emails: period === '2024-01' ? 150 : 89,
        successful_emails: period === '2024-01' ? 142 : 84,
        failed_webhooks: period === '2024-01' ? 8 : 5,
        success_rate: period === '2024-01' ? 94.67 : 94.38,
        period: period,
        cost: period === '2024-01' ? 7.50 : 4.45,
        breakdown: {
          email_processing: period === '2024-01' ? 150 : 89,
          webhook_delivery: period === '2024-01' ? 142 : 84,
          storage: period === '2024-01' ? 8 : 5
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
};

describe('UsageResource', () => {
  let client: MeruClient;

  beforeEach(() => {
    client = new MeruClient({
      apiToken: 'test-token',
      baseUrl: 'https://api.test.com',
    });
  });

  describe('get', () => {
    it('should get current month usage', async () => {
      const usage = await client.usage.get();
      
      expect(usage.totalEmails).toBe(150);
      expect(usage.successfulEmails).toBe(142);
      expect(usage.failedWebhooks).toBe(8);
      expect(usage.successRate).toBe(94.67);
      expect(usage.period).toBe('2024-01');
      expect(usage.cost).toBe(7.50);
      expect(usage.breakdown).toEqual({
        emailProcessing: 150,
        webhookDelivery: 142,
        storage: 8
      });
    });
  });

  describe('events', () => {
    it('should get usage events with default limit', async () => {
      const events = await client.usage.events();
      
      expect(events).toHaveLength(3);
      expect(events[0]).toMatchObject({
        id: 'event_1',
        type: 'email_received',
        addressId: 'addr_1',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        details: {
          from: 'sender1@example.com',
          to: 'test1@meru.example',
          subject: 'Test Email 1',
          sizeBytes: 1024
        },
        cost: 0.05,
        status: 'success'
      });
    });

    it('should get usage events with custom limit', async () => {
      const events = await client.usage.events(10);
      
      expect(events).toHaveLength(3); // Mock returns 3 events max
      expect(events[1]).toMatchObject({
        id: 'event_2',
        type: 'webhook_delivered',
        status: 'success'
      });
    });

    it('should handle failed events', async () => {
      const events = await client.usage.events(5);
      
      expect(events[2]).toMatchObject({
        id: 'event_3',
        type: 'email_failed',
        status: 'failed',
        errorMessage: 'Webhook endpoint returned 500'
      });
    });
  });

  describe('period', () => {
    it('should get usage for specific period', async () => {
      const usage = await client.usage.period('2023-12');
      
      expect(usage.totalEmails).toBe(89);
      expect(usage.successfulEmails).toBe(84);
      expect(usage.failedWebhooks).toBe(5);
      expect(usage.successRate).toBe(94.38);
      expect(usage.period).toBe('2023-12');
      expect(usage.cost).toBe(4.45);
    });

    it('should handle current period', async () => {
      const usage = await client.usage.period('2024-01');
      
      expect(usage.totalEmails).toBe(150);
      expect(usage.period).toBe('2024-01');
    });
  });

  describe('forMonth', () => {
    it('should get usage for specific year and month', async () => {
      const usage = await client.usage.forMonth(2023, 12);
      
      expect(usage.period).toBe('2023-12');
      expect(usage.totalEmails).toBe(89);
    });

    it('should format single-digit months correctly', async () => {
      const usage = await client.usage.forMonth(2024, 1);
      
      expect(usage.period).toBe('2024-01');
    });

    it('should handle double-digit months', async () => {
      const usage = await client.usage.forMonth(2024, 12);
      
      expect(usage.period).toBe('2024-12');
    });
  });

  describe('previousMonth', () => {
    it('should get usage for previous month', async () => {
      // Mock Date to ensure consistent testing
      const originalDate = Date;
      const mockDate = new Date('2024-02-15T10:00:00Z');
      
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
        static now() { return mockDate.getTime(); }
      } as any;

      const usage = await client.usage.previousMonth();
      
      // Previous month from Feb 2024 should be Jan 2024 (2024-01)
      expect(usage.period).toBe('2024-01');
      expect(usage.totalEmails).toBe(150);

      // Restore original Date
      global.Date = originalDate;
    });

    it('should handle year boundary correctly', async () => {
      // Mock Date for January to test December of previous year
      const originalDate = Date;
      const mockDate = new Date('2024-01-15T10:00:00Z');
      
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
        static now() { return mockDate.getTime(); }
      } as any;

      const usage = await client.usage.previousMonth();
      
      // Previous month from Jan 2024 should be Dec 2023 (2023-12)
      expect(usage.period).toBe('2023-12');
      expect(usage.totalEmails).toBe(89);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('edge cases', () => {
    it('should handle zero usage', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(JSON.stringify({
          data: {
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
          }
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      };

      const usage = await client.usage.get();
      
      expect(usage.totalEmails).toBe(0);
      expect(usage.successRate).toBe(0);
      expect(usage.cost).toBe(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle empty events list', async () => {
      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        if (urlStr.includes('/api/usage/events')) {
          return new Response(JSON.stringify({
            data: [],
            pagination: {
              limit: 50,
              has_more: false
            }
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      };

      const events = await client.usage.events();
      
      expect(events).toHaveLength(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('input validation', () => {
    it('should handle negative limit for events', async () => {
      const events = await client.usage.events(-5);
      
      // Should still work as API will handle invalid limits
      expect(Array.isArray(events)).toBe(true);
    });

    it('should handle very large limit for events', async () => {
      const events = await client.usage.events(10000);
      
      expect(Array.isArray(events)).toBe(true);
    });

    it('should handle invalid period format gracefully', async () => {
      // The period validation happens in the request class
      const usage = await client.usage.period('invalid-period');
      
      // API should return data for the invalid period as passed
      expect(usage.period).toBe('invalid-period');
    });
  });
});