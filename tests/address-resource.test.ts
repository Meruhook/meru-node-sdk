import { describe, it, expect, beforeEach } from 'bun:test';
import { MeruClient } from '../src/index.js';

// Mock fetch for testing
global.fetch = async (url: string | Request, init?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url.url;
  const method = init?.method || 'GET';

  // Mock responses based on endpoint
  // Check specific address endpoints first
  if (urlStr.match(/\/api\/addresses\/addr_/) && method === 'GET') {
    return new Response(JSON.stringify({
      data: {
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
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.match(/\/api\/addresses\/addr_/) && method === 'DELETE') {
    return new Response('', {
      status: 204,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.match(/\/api\/addresses\/addr_/) && method === 'PATCH') {
    return new Response(JSON.stringify({
      data: {
        id: 'addr_123',
        address: 'test@example.com',
        webhook_url: 'https://new-webhook.test',
        is_enabled: false,
        is_permanent: true,
        expires_at: null,
        email_count: 5,
        last_received_at: '2024-01-15T10:30:00Z',
        is_expired: false,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-16T11:00:00Z',
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // General endpoints
  if (urlStr.includes('/api/addresses') && method === 'GET') {
    return new Response(JSON.stringify({
      data: [
        {
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
        }
      ]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/api/addresses') && method === 'POST') {
    return new Response(JSON.stringify({
      data: {
        id: 'addr_456',
        address: 'new@example.com',
        webhook_url: 'https://webhook.test',
        is_enabled: true,
        is_permanent: true,
        expires_at: null,
        email_count: 0,
        last_received_at: null,
        is_expired: false,
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z',
      }
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
};

describe('AddressResource', () => {
  let client: MeruClient;

  beforeEach(() => {
    client = new MeruClient({
      apiToken: 'test-token',
      baseUrl: 'https://api.test.com',
    });
  });

  describe('list', () => {
    it('should list all addresses', async () => {
      const addresses = await client.addresses.list();
      
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toMatchObject({
        id: 'addr_123',
        address: 'test@example.com',
        webhookUrl: 'https://webhook.test',
        isEnabled: true,
        isPermanent: true,
        emailCount: 5,
      });
    });
  });

  describe('create', () => {
    it('should create address with object params', async () => {
      const address = await client.addresses.create({
        webhookUrl: 'https://webhook.test',
        isPermanent: true,
      });

      expect(address.id).toBe('addr_456');
      expect(address.webhookUrl).toBe('https://webhook.test');
      expect(address.isPermanent).toBe(true);
    });

    it('should create address with string params', async () => {
      const address = await client.addresses.create('https://webhook.test', true);

      expect(address.id).toBe('addr_456');
      expect(address.webhookUrl).toBe('https://webhook.test');
    });
  });

  describe('get', () => {
    it('should get specific address', async () => {
      const address = await client.addresses.get('550e8400-e29b-41d4-a716-446655440000');

      expect(address.id).toBe('addr_123');
      expect(address.address).toBe('test@example.com');
    });
  });

  describe('update', () => {
    it('should update address', async () => {
      const address = await client.addresses.update('550e8400-e29b-41d4-a716-446655440001', {
        webhookUrl: 'https://new-webhook.test',
        isEnabled: false,
      });

      expect(address.webhookUrl).toBe('https://new-webhook.test');
      expect(address.isEnabled).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete address', async () => {
      await expect(client.addresses.delete('550e8400-e29b-41d4-a716-446655440002')).resolves.toBeUndefined();
    });
  });

  describe('convenience methods', () => {
    it('should enable address', async () => {
      const address = await client.addresses.enable('550e8400-e29b-41d4-a716-446655440003');
      expect(address).toBeDefined();
    });

    it('should disable address', async () => {
      const address = await client.addresses.disable('550e8400-e29b-41d4-a716-446655440004');
      expect(address.isEnabled).toBe(false);
    });

    it('should update webhook URL', async () => {
      const address = await client.addresses.updateWebhookUrl('550e8400-e29b-41d4-a716-446655440005', 'https://new-webhook.test');
      expect(address.webhookUrl).toBe('https://new-webhook.test');
    });
  });
});