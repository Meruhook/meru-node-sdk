import { describe, it, expect, beforeEach } from 'bun:test';
import { MeruClient } from '../src/index.js';
import { AuthenticationException, ValidationException } from '../src/exceptions/index.js';

describe('MeruClient', () => {
  let client: MeruClient;

  beforeEach(() => {
    client = new MeruClient({
      apiToken: 'test-token',
      baseUrl: 'https://api.test.com',
      debug: false,
    });
  });

  it('should create a client instance', () => {
    expect(client).toBeDefined();
    expect(client.addresses).toBeDefined();
    expect(client.usage).toBeDefined();
    expect(client.billing).toBeDefined();
    expect(client.account).toBeDefined();
  });

  it('should throw error without API token', () => {
    expect(() => {
      new MeruClient({} as any);
    }).toThrow('API token is required');
  });

  it('should create client with static method', () => {
    const staticClient = MeruClient.create({
      apiToken: 'test-token',
    });
    
    expect(staticClient).toBeInstanceOf(MeruClient);
  });

  it('should provide access to HTTP client', () => {
    const httpClient = client.getHttpClient();
    expect(httpClient).toBeDefined();
  });
});