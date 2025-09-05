import { describe, test, expect } from 'bun:test';
import { UrlValidator, isValidUrl, assertValidUrl } from '../../src/security/url-validator';

describe('UrlValidator', () => {
  describe('validateUrl', () => {
    test('should validate clean HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://api.example.com/v1',
        'https://subdomain.example.com:8080/path',
        'https://example.com/path?query=value',
        'https://example.com/path#fragment',
      ];

      validUrls.forEach(url => {
        const result = UrlValidator.validateUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate HTTP URLs when allowed', () => {
      const httpUrl = 'http://example.com/webhook';
      const result = UrlValidator.validateUrl(httpUrl, 'URL', { allowHttp: true });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject HTTP URLs when not allowed', () => {
      const httpUrl = 'http://example.com/webhook';
      const result = UrlValidator.validateUrl(httpUrl, 'URL', { allowHttp: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL must use https protocol');
    });

    test('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://example.com',
      ];

      dangerousUrls.forEach(url => {
        const result = UrlValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject private network URLs', () => {
      const privateUrls = [
        'https://localhost/webhook',
        'https://127.0.0.1/webhook',
        'https://10.0.0.1/webhook',
        'https://192.168.1.1/webhook',
        'https://172.16.0.1/webhook',
        'https://169.254.169.254/webhook', // AWS metadata
      ];

      privateUrls.forEach(url => {
        const result = UrlValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.includes('not allowed') || error.includes('private network')
        )).toBe(true);
      });
    });

    test('should allow private networks when configured', () => {
      const privateUrl = 'https://192.168.1.1/webhook';
      const result = UrlValidator.validateUrl(privateUrl, 'URL', { 
        allowPrivateNetworks: true 
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject URLs with suspicious patterns', () => {
      const suspiciousUrls = [
        'https://bit.ly/malicious', // URL shortener
        'https://tinyurl.com/malicious',
        'https://t.co/malicious',
      ];

      suspiciousUrls.forEach(url => {
        const result = UrlValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.includes('URL shortener') || error.includes('not allowed')
        )).toBe(true);
      });
    });

    test('should enforce path requirements', () => {
      const urlWithoutPath = 'https://example.com';
      const urlWithPath = 'https://example.com/webhook';

      const resultWithoutPath = UrlValidator.validateUrl(urlWithoutPath, 'URL', { 
        requirePath: true 
      });
      expect(resultWithoutPath.isValid).toBe(false);
      expect(resultWithoutPath.errors).toContain('URL must include a path');

      const resultWithPath = UrlValidator.validateUrl(urlWithPath, 'URL', { 
        requirePath: true 
      });
      expect(resultWithPath.isValid).toBe(true);
    });

    test('should reject URLs that are too long', () => {
      const longPath = 'a'.repeat(3000);
      const longUrl = `https://example.com/${longPath}`;
      const result = UrlValidator.validateUrl(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL exceeds maximum length of 2048 characters');
    });

    test('should reject invalid URL formats', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'https://',
        'https://[invalid',
        null as any,
        undefined as any,
      ];

      invalidUrls.forEach(url => {
        const result = UrlValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateHostname', () => {
    test('should validate clean hostnames', () => {
      const validHostnames = [
        'example.com',
        'api.example.com',
        'sub.domain.example.com',
        'example-with-dash.com',
        'example123.com',
      ];

      validHostnames.forEach(hostname => {
        const result = UrlValidator.validateHostname(hostname);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate IP addresses', () => {
      const validIPs = [
        '1.2.3.4',
        '192.168.1.1',
        '255.255.255.255',
      ];

      validIPs.forEach(ip => {
        const result = UrlValidator.validateHostname(ip, 'hostname', { 
          allowPrivateNetworks: true 
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject localhost variations', () => {
      const localhostVariations = [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0',
      ];

      localhostVariations.forEach(hostname => {
        const result = UrlValidator.validateHostname(hostname);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('localhost'))).toBe(true);
      });
    });

    test('should reject metadata service hostnames', () => {
      const metadataHosts = [
        '169.254.169.254',
        '100.100.100.200',
        'metadata.google.internal',
        'some.metadata.internal',
      ];

      metadataHosts.forEach(hostname => {
        const result = UrlValidator.validateHostname(hostname);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.includes('metadata service') || error.includes('not allowed')
        )).toBe(true);
      });
    });

    test('should reject invalid domain names', () => {
      const invalidDomains = [
        '',
        '.invalid',
        'invalid.',
        'invalid..domain',
        'a'.repeat(300), // Too long
      ];

      invalidDomains.forEach(hostname => {
        const result = UrlValidator.validateHostname(hostname);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('sanitizeUrl', () => {
    test('should remove authentication info', () => {
      const urlWithAuth = 'https://user:pass@example.com/path';
      const sanitized = UrlValidator.sanitizeUrl(urlWithAuth);
      expect(sanitized).toBe('https://example.com/path');
    });

    test('should remove fragments', () => {
      const urlWithFragment = 'https://example.com/path#fragment';
      const sanitized = UrlValidator.sanitizeUrl(urlWithFragment);
      expect(sanitized).toBe('https://example.com/path');
    });

    test('should normalize paths', () => {
      const urlWithMultipleSlashes = 'https://example.com//path///to//resource';
      const sanitized = UrlValidator.sanitizeUrl(urlWithMultipleSlashes);
      expect(sanitized).toBe('https://example.com/path/to/resource');
    });

    test('should handle invalid URLs', () => {
      const invalidUrl = 'not-a-url';
      const sanitized = UrlValidator.sanitizeUrl(invalidUrl);
      expect(sanitized).toBe('');
    });
  });

  describe('extractSafeHostname', () => {
    test('should extract hostname from valid URLs', () => {
      const url = 'https://api.example.com:8080/path?query=value';
      const hostname = UrlValidator.extractSafeHostname(url);
      expect(hostname).toBe('api.example.com');
    });

    test('should handle invalid URLs safely', () => {
      const invalidUrl = 'not-a-url';
      const hostname = UrlValidator.extractSafeHostname(invalidUrl);
      expect(hostname).toBe('[invalid-url]');
    });
  });
});

describe('isValidUrl', () => {
  test('should work as a type guard', () => {
    const url = 'https://example.com';
    expect(isValidUrl(url)).toBe(true);
    
    const invalidUrl = 'not-a-url';
    expect(isValidUrl(invalidUrl)).toBe(false);
  });

  test('should accept options', () => {
    const httpUrl = 'http://example.com';
    expect(isValidUrl(httpUrl, { allowHttp: true })).toBe(true);
    expect(isValidUrl(httpUrl, { allowHttp: false })).toBe(false);
  });
});

describe('assertValidUrl', () => {
  test('should not throw for valid URLs', () => {
    expect(() => assertValidUrl('https://example.com')).not.toThrow();
  });

  test('should throw for invalid URLs', () => {
    expect(() => assertValidUrl('not-a-url')).toThrow('URL validation failed');
  });

  test('should include field name in error', () => {
    expect(() => assertValidUrl('not-a-url', 'Webhook URL')).toThrow('URL validation failed');
  });

  test('should accept options', () => {
    const httpUrl = 'http://example.com';
    expect(() => assertValidUrl(httpUrl, 'URL', { allowHttp: true })).not.toThrow();
    expect(() => assertValidUrl(httpUrl, 'URL', { allowHttp: false })).toThrow();
  });
});