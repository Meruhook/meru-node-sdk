import { describe, test, expect } from 'bun:test';
import { InputValidator } from '../../src/security/input-validator';

describe('InputValidator', () => {
  describe('validateUuid', () => {
    test('should validate valid UUIDs', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'a1b2c3d4-e5f6-1234-8cde-f123456789ab',
      ];

      validUuids.forEach(uuid => {
        const result = InputValidator.validateUuid(uuid);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid UUIDs', () => {
      const invalidUuids = [
        '',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-g456-426614174000', // invalid char
        '123e4567e89b12d3a456426614174000', // no hyphens
        null as any,
        undefined as any,
        123 as any,
      ];

      invalidUuids.forEach(uuid => {
        const result = InputValidator.validateUuid(uuid);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject UUIDs that are too long', () => {
      const tooLong = 'a'.repeat(100);
      const result = InputValidator.validateUuid(tooLong);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID exceeds maximum length of 64');
    });
  });

  describe('validateWebhookUrl', () => {
    test('should validate valid HTTPS URLs', () => {
      const validUrls = [
        'https://example.com/webhook',
        'https://api.example.com/v1/webhook',
        'https://subdomain.example.com:8080/webhook',
        'https://example.com/webhook?param=value',
      ];

      validUrls.forEach(url => {
        const result = InputValidator.validateWebhookUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate HTTP URLs in development', () => {
      const httpUrl = 'http://example.com:3000/webhook';
      const result = InputValidator.validateWebhookUrl(httpUrl, { allowHttp: true });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject HTTP URLs in production', () => {
      const httpUrl = 'http://example.com/webhook';
      const result = InputValidator.validateWebhookUrl(httpUrl, { allowHttp: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Webhook URL must use https protocol');
    });

    test('should reject dangerous hostnames', () => {
      const dangerousUrls = [
        'https://localhost/webhook',
        'https://127.0.0.1/webhook',
        'https://169.254.169.254/webhook',
        'https://10.0.0.1/webhook',
        'https://192.168.1.1/webhook',
      ];

      dangerousUrls.forEach(url => {
        const result = InputValidator.validateWebhookUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('not allowed for security reasons'))).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/plain,hello',
        null as any,
        undefined as any,
      ];

      invalidUrls.forEach(url => {
        const result = InputValidator.validateWebhookUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should handle optional validation', () => {
      const result = InputValidator.validateWebhookUrl('', { required: false });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject URLs that are too long', () => {
      const tooLongUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = InputValidator.validateWebhookUrl(tooLongUrl);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Webhook URL exceeds maximum length of 2048');
    });
  });

  describe('validateBaseUrl', () => {
    test('should validate valid base URLs', () => {
      const validUrls = [
        'https://api.example.com',
        'https://api.example.com:8080',
        'https://api.example.com/',
        'https://api.example.com/v1',
      ];

      validUrls.forEach(url => {
        const result = InputValidator.validateBaseUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid base URLs', () => {
      const invalidUrls = [
        'http://api.example.com', // HTTP not allowed by default
        'ftp://api.example.com',
        'not-a-url',
        '',
      ];

      invalidUrls.forEach(url => {
        const result = InputValidator.validateBaseUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateHeaderValue', () => {
    test('should validate clean header values', () => {
      const validHeaders = [
        'application/json',
        'Bearer token123',
        'value with spaces',
        '123456',
      ];

      validHeaders.forEach(header => {
        const result = InputValidator.validateHeaderValue(header, 'Test-Header');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject header values with dangerous characters', () => {
      const dangerousHeaders = [
        'value\r\nX-Injected: malicious',
        'value\nX-Injected: malicious',
        'value\x00',
        'value\x01malicious',
      ];

      dangerousHeaders.forEach(header => {
        const result = InputValidator.validateHeaderValue(header, 'Test-Header');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Test-Header header contains invalid characters');
      });
    });

    test('should reject header values that are too long', () => {
      const tooLong = 'a'.repeat(10000);
      const result = InputValidator.validateHeaderValue(tooLong, 'Test-Header');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test-Header header exceeds maximum length of 8192');
    });

    test('should reject non-string header values', () => {
      const result = InputValidator.validateHeaderValue(123 as any, 'Test-Header');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test-Header header must be a string');
    });
  });

  describe('validateTimeout', () => {
    test('should validate reasonable timeout values', () => {
      const validTimeouts = [1000, 5000, 30000, 60000];

      validTimeouts.forEach(timeout => {
        const result = InputValidator.validateTimeout(timeout);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid timeout values', () => {
      const invalidTimeouts = [
        0,
        -1000,
        100, // too short
        70000, // too long
        NaN,
        'not-a-number' as any,
        null as any,
        undefined as any,
      ];

      invalidTimeouts.forEach(timeout => {
        const result = InputValidator.validateTimeout(timeout);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('sanitizeString', () => {
    test('should remove dangerous characters', () => {
      const dangerous = 'hello\x00world\x01test';
      const sanitized = InputValidator.sanitizeString(dangerous);
      expect(sanitized).toBe('helloworldtest');
    });

    test('should trim whitespace', () => {
      const withWhitespace = '  hello world  ';
      const sanitized = InputValidator.sanitizeString(withWhitespace);
      expect(sanitized).toBe('hello world');
    });

    test('should limit length', () => {
      const tooLong = 'a'.repeat(100);
      const sanitized = InputValidator.sanitizeString(tooLong, 10);
      expect(sanitized).toHaveLength(10);
      expect(sanitized).toBe('aaaaaaaaaa');
    });

    test('should handle non-strings', () => {
      const result = InputValidator.sanitizeString(123 as any);
      expect(result).toBe('');
    });
  });

  describe('validateJsonString', () => {
    test('should validate clean JSON', () => {
      const validJson = JSON.stringify({ hello: 'world', num: 123 });
      const result = InputValidator.validateJsonString(validJson);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid JSON', () => {
      const invalidJson = '{ hello: world }'; // Missing quotes
      const result = InputValidator.validateJsonString(invalidJson);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    test('should reject JSON that is too large', () => {
      const tooLarge = JSON.stringify({ data: 'a'.repeat(15 * 1024 * 1024) }); // > 10MB
      const result = InputValidator.validateJsonString(tooLarge);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('JSON string exceeds maximum size of 10485760 bytes');
    });

    test('should reject deeply nested JSON', () => {
      // Create deeply nested object
      let deepObject: any = {};
      let current = deepObject;
      for (let i = 0; i < 150; i++) {
        current.nested = {};
        current = current.nested;
      }
      
      const deepJson = JSON.stringify(deepObject);
      const result = InputValidator.validateJsonString(deepJson);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('JSON depth exceeds maximum of 100');
    });

    test('should reject non-string input', () => {
      const result = InputValidator.validateJsonString(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input must be a string');
    });
  });
});