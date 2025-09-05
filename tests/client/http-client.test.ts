import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { HttpClient } from '../../src/client/http-client.js';
import { 
  MeruException, 
  AuthenticationException, 
  ValidationException, 
  RateLimitException 
} from '../../src/exceptions/index.js';

// Mock fetch globally
const mockFetch = mock();
global.fetch = mockFetch;

// Mock console methods to avoid cluttering test output
const originalConsole = { ...console };
beforeEach(() => {
  console.log = mock();
  console.warn = mock();
  console.error = mock();
  console.debug = mock();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  mockFetch.mockClear();
});

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      apiToken: 'test-token-123',
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      debug: false
    });
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      const client = new HttpClient({
        apiToken: 'valid-token',
        baseUrl: 'https://api.example.com',
        timeout: 10000,
        debug: true
      });
      
      expect(client).toBeDefined();
    });

    it('should use default values for optional parameters', () => {
      const client = new HttpClient({
        apiToken: 'valid-token'
      });
      
      expect(client).toBeDefined();
    });

    it('should throw ValidationException for missing API token', () => {
      expect(() => new HttpClient({
        apiToken: '',
        baseUrl: 'https://api.example.com'
      })).toThrow(ValidationException);

      expect(() => new HttpClient({
        // @ts-ignore - testing runtime validation
        apiToken: null
      })).toThrow(ValidationException);
    });

    it('should throw ValidationException for invalid base URL', () => {
      expect(() => new HttpClient({
        apiToken: 'valid-token',
        baseUrl: 'invalid-url'
      })).toThrow(ValidationException);

      expect(() => new HttpClient({
        apiToken: 'valid-token',
        baseUrl: 'http://api.example.com' // HTTP not allowed in production
      })).toThrow(ValidationException);
    });

    it('should allow HTTP in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      expect(() => new HttpClient({
        apiToken: 'valid-token',
        baseUrl: 'http://localhost:3000'
      })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw ValidationException for invalid timeout', () => {
      expect(() => new HttpClient({
        apiToken: 'valid-token',
        timeout: -1000
      })).toThrow(ValidationException);

      expect(() => new HttpClient({
        apiToken: 'valid-token',
        timeout: 0
      })).toThrow(ValidationException);
    });
  });

  describe('successful requests', () => {
    it('should make GET request successfully', async () => {
      const responseData = { id: '123', name: 'test' };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/test'
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: responseData });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': '@meruhook/node-sdk/1.0.0'
          })
        })
      );
    });

    it('should make POST request with body successfully', async () => {
      const requestBody = { name: 'test', value: 42 };
      const responseData = { id: '456', created: true };
      
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: responseData }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      }));

      const response = await httpClient.request({
        method: 'POST',
        endpoint: '/create',
        body: requestBody
      });

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ data: responseData });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
    });

    it('should handle query parameters', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await httpClient.request({
        method: 'GET',
        endpoint: '/search',
        query: {
          q: 'test query',
          limit: 10,
          active: true
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/search?q=test+query&limit=10&active=true',
        expect.any(Object)
      );
    });

    it('should handle custom headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await httpClient.request({
        method: 'GET',
        endpoint: '/test',
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Request-ID': 'req-123'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'X-Request-ID': 'req-123'
          })
        })
      );
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', {
        status: 204,
        headers: { 'content-type': 'application/json' }
      }));

      const response = await httpClient.request({
        method: 'DELETE',
        endpoint: '/test/123'
      });

      expect(response.status).toBe(204);
      expect(response.data).toBeNull();
    });

    it('should handle non-JSON responses', async () => {
      const textResponse = 'Plain text response';
      mockFetch.mockResolvedValueOnce(new Response(textResponse, {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      }));

      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/text'
      });

      expect(response.status).toBe(200);
      expect(response.data).toBe(textResponse);
    });
  });

  describe('error handling', () => {
    it('should throw AuthenticationException for 401 responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'unauthorized',
        message: 'Invalid API token'
      }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/protected'
      })).rejects.toThrow(AuthenticationException);
    });

    it('should throw ValidationException for 422 responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'validation_failed',
        message: 'Invalid input',
        errors: ['Field is required']
      }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'POST',
        endpoint: '/create',
        body: { invalid: 'data' }
      })).rejects.toThrow(ValidationException);
    });

    it('should throw RateLimitException for 429 responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'rate_limited',
        message: 'Too many requests'
      }), {
        status: 429,
        headers: { 
          'content-type': 'application/json',
          'retry-after': '60'
        }
      }));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(RateLimitException);
    });

    it('should throw MeruException for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'server_error',
        message: 'Internal server error'
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(MeruException);
    });

    it('should throw MeruException for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(MeruException);
    });

    it('should throw MeruException for timeout errors', async () => {
      // Create a client with very short timeout
      const shortTimeoutClient = new HttpClient({
        apiToken: 'test-token',
        timeout: 1 // 1ms timeout
      });

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response('{}', { status: 200 })), 100))
      );

      await expect(shortTimeoutClient.request({
        method: 'GET',
        endpoint: '/slow'
      })).rejects.toThrow(MeruException);
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce(new Response('{"data":"success"}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }));

      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/api'
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'unauthorized',
        message: 'Invalid token'
      }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(AuthenticationException);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on validation errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'validation_failed',
        message: 'Invalid data'
      }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'POST',
        endpoint: '/api',
        body: { invalid: 'data' }
      })).rejects.toThrow(ValidationException);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect retry-after header for rate limiting', async () => {
      const rateLimitResponse = new Response(JSON.stringify({
        error: 'rate_limited',
        message: 'Too many requests'
      }), {
        status: 429,
        headers: { 
          'content-type': 'application/json',
          'retry-after': '2' // 2 seconds
        }
      });

      const successResponse = new Response(JSON.stringify({
        data: 'success'
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

      mockFetch
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse);

      const startTime = Date.now();
      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/api'
      });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Should have waited at least 2 seconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });

    it('should give up after max retries', async () => {
      // All calls fail
      mockFetch.mockRejectedValue(new TypeError('Persistent network error'));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(MeruException);

      // Should try initial request + 3 retries = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('security features', () => {
    it('should prevent header injection', async () => {
      expect(() => httpClient.request({
        method: 'GET',
        endpoint: '/api',
        headers: {
          'X-Custom': 'value\r\nInjected-Header: malicious'
        }
      })).rejects.toThrow(ValidationException);
    });

    it('should prevent overriding critical headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await httpClient.request({
        method: 'GET',
        endpoint: '/api',
        headers: {
          'Authorization': 'Bearer malicious-token',
          'User-Agent': 'malicious-agent',
          'Host': 'malicious.com',
          'X-Safe-Header': 'safe-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123', // Original token preserved
            'User-Agent': '@meruhook/node-sdk/1.0.0', // Original user-agent preserved
            'X-Safe-Header': 'safe-value' // Safe header allowed
          })
        })
      );
    });

    it('should handle large responses with size limits', async () => {
      const client = new HttpClient({
        apiToken: 'test-token',
        maxResponseSize: 1024 // 1KB limit
      });

      const largeResponse = 'x'.repeat(2048); // 2KB response
      mockFetch.mockResolvedValueOnce(new Response(largeResponse, {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      }));

      await expect(client.request({
        method: 'GET',
        endpoint: '/large'
      })).rejects.toThrow(MeruException);
    });

    it('should validate JSON to prevent JSON bombs', async () => {
      // Mock invalid JSON that could cause issues
      const invalidJson = '{"valid": true, "nested": ' + '{"level": 1,'.repeat(200) + '"end": true}' + '}'.repeat(200);
      
      mockFetch.mockResolvedValueOnce(new Response(invalidJson, {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await expect(httpClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(MeruException);
    });

    it('should sanitize header values', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      const longHeaderValue = 'x'.repeat(10000); // Very long header
      await httpClient.request({
        method: 'GET',
        endpoint: '/api',
        headers: {
          'X-Long-Header': longHeaderValue
        }
      });

      // Should be called (sanitized), not throw
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('configuration options', () => {
    it('should use custom retry configuration', async () => {
      const customClient = new HttpClient({
        apiToken: 'test-token',
        retry: {
          times: 1, // Only 1 retry
          delay: 50,
          maxDelay: 1000,
          backoffMultiplier: 1.5
        }
      });

      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(customClient.request({
        method: 'GET',
        endpoint: '/api'
      })).rejects.toThrow(MeruException);

      // Should try initial request + 1 retry = 2 total
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle debug mode', async () => {
      const debugClient = new HttpClient({
        apiToken: 'test-token',
        debug: true
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await debugClient.request({
        method: 'GET',
        endpoint: '/api'
      });

      // Debug mode should log requests (mocked console.log should be called)
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle custom base URL correctly', async () => {
      const customClient = new HttpClient({
        apiToken: 'test-token',
        baseUrl: 'https://custom.api.com/v2'
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));

      await customClient.request({
        method: 'GET',
        endpoint: '/test'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v2/test',
        expect.any(Object)
      );
    });
  });

  describe('response handling', () => {
    it('should handle response headers correctly', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'x-rate-limit-remaining': '99',
          'X-Custom-Header': 'Custom-Value'
        })
      }));

      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/api'
      });

      expect(response.headers).toEqual({
        'content-type': 'application/json',
        'x-rate-limit-remaining': '99',
        'x-custom-header': 'Custom-Value' // Should be lowercase
      });
    });

    it('should handle response with content-length header', async () => {
      const responseBody = JSON.stringify({ data: 'test' });
      mockFetch.mockResolvedValueOnce(new Response(responseBody, {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': responseBody.length.toString()
        })
      }));

      const response = await httpClient.request({
        method: 'GET',
        endpoint: '/api'
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'test' });
    });

    it('should reject responses that exceed content-length limit', async () => {
      const client = new HttpClient({
        apiToken: 'test-token',
        maxResponseSize: 100 // 100 bytes limit
      });

      mockFetch.mockResolvedValueOnce(new Response('small response', {
        status: 200,
        headers: new Headers({
          'content-type': 'text/plain',
          'content-length': '1000' // Claims to be 1000 bytes
        })
      }));

      await expect(client.request({
        method: 'GET',
        endpoint: '/large'
      })).rejects.toThrow(MeruException);
    });
  });
});