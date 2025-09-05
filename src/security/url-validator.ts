import { 
  ALLOWED_URL_SCHEMES,
  ALLOWED_URL_SCHEMES_DEV,
  BLOCKED_HOSTNAMES,
  SECURITY_LIMITS,
} from './constants.js';
import type { ValidationResult } from './input-validator.js';

export interface UrlValidationOptions {
  allowHttp?: boolean;
  allowPrivateNetworks?: boolean;
  maxLength?: number;
  requirePath?: boolean;
}

export class UrlValidator {
  /**
   * Comprehensive URL validation with security checks
   */
  static validateUrl(
    url: string,
    fieldName: string = 'URL',
    options: UrlValidationOptions = {}
  ): ValidationResult {
    const {
      allowHttp = false,
      allowPrivateNetworks = false,
      maxLength = SECURITY_LIMITS.MAX_URL_LENGTH,
      requirePath = false,
    } = options;

    const errors: string[] = [];

    // Basic validation
    if (!url || typeof url !== 'string') {
      errors.push(`${fieldName} must be a non-empty string`);
      return { isValid: false, errors };
    }

    // Length check
    if (url.length > maxLength) {
      errors.push(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      errors.push(`${fieldName} is not a valid URL format`);
      return { isValid: false, errors };
    }

    // Scheme validation
    const allowedSchemes = allowHttp ? ALLOWED_URL_SCHEMES_DEV : ALLOWED_URL_SCHEMES;
    const scheme = parsedUrl.protocol.slice(0, -1); // Remove trailing ':'
    if (!allowedSchemes.includes(scheme as any)) {
      errors.push(`${fieldName} must use ${allowedSchemes.join(' or ')} protocol`);
    }

    // Hostname security checks
    const hostnameValidation = this.validateHostname(
      parsedUrl.hostname, 
      `${fieldName} hostname`,
      { allowPrivateNetworks }
    );
    errors.push(...hostnameValidation.errors);

    // Path validation
    if (requirePath && (!parsedUrl.pathname || parsedUrl.pathname === '/')) {
      errors.push(`${fieldName} must include a path`);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.checkSuspiciousPatterns(url, fieldName);
    errors.push(...suspiciousPatterns);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate hostname for security issues (SSRF prevention)
   */
  static validateHostname(
    hostname: string,
    fieldName: string = 'hostname',
    options: { allowPrivateNetworks?: boolean } = {}
  ): ValidationResult {
    const { allowPrivateNetworks = false } = options;
    const errors: string[] = [];

    if (!hostname) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    const normalizedHostname = hostname.toLowerCase();

    // Check against blocked hostnames list
    for (const blocked of BLOCKED_HOSTNAMES) {
      if (normalizedHostname === blocked) {
        errors.push(`${fieldName} '${hostname}' is not allowed for security reasons`);
        break;
      }
    }

    // Private network checks
    if (!allowPrivateNetworks) {
      if (this.isPrivateNetwork(normalizedHostname)) {
        errors.push(`${fieldName} '${hostname}' points to a private network which is not allowed`);
      }

      if (this.isLoopback(normalizedHostname)) {
        errors.push(`${fieldName} '${hostname}' points to localhost which is not allowed`);
      }

      if (this.isMetadataService(normalizedHostname)) {
        errors.push(`${fieldName} '${hostname}' points to a metadata service which is not allowed`);
      }
    }

    // Domain name format validation
    if (!this.isValidDomainName(normalizedHostname) && !this.isValidIPAddress(normalizedHostname)) {
      errors.push(`${fieldName} '${hostname}' is not a valid domain name or IP address`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize URL by removing dangerous components
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      
      // Remove fragments and some query parameters that might be dangerous
      parsedUrl.hash = '';
      
      // Normalize the path
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/+/g, '/');
      
      // Remove authentication info if present
      parsedUrl.username = '';
      parsedUrl.password = '';
      
      return parsedUrl.toString();
    } catch {
      // If URL parsing fails, return empty string
      return '';
    }
  }

  /**
   * Extract safe hostname from URL for logging
   */
  static extractSafeHostname(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return '[invalid-url]';
    }
  }

  /**
   * Check if hostname points to private networks
   */
  private static isPrivateNetwork(hostname: string): boolean {
    // IPv4 private ranges
    return (
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname)
    );
  }

  /**
   * Check if hostname is loopback
   */
  private static isLoopback(hostname: string): boolean {
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    );
  }

  /**
   * Check if hostname points to cloud metadata services
   */
  private static isMetadataService(hostname: string): boolean {
    return (
      hostname === '169.254.169.254' || // AWS, Google Cloud, Azure
      hostname === '100.100.100.200' || // Alibaba Cloud
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.metadata.internal')
    );
  }

  /**
   * Basic domain name validation
   */
  private static isValidDomainName(hostname: string): boolean {
    // Basic domain name pattern
    const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    return domainPattern.test(hostname) && hostname.length <= 253;
  }

  /**
   * Basic IP address validation
   */
  private static isValidIPAddress(hostname: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(hostname)) {
      const parts = hostname.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Basic IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    return ipv6Pattern.test(hostname);
  }

  /**
   * Check for suspicious URL patterns
   */
  private static checkSuspiciousPatterns(url: string, fieldName: string): string[] {
    const errors: string[] = [];

    // Check for URL shorteners (which could hide the real destination)
    const shortenerDomains = [
      'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 
      'short.link', 'tiny.cc', 'is.gd', 'buff.ly'
    ];
    
    try {
      const parsedUrl = new URL(url);
      if (shortenerDomains.some(domain => parsedUrl.hostname.endsWith(domain))) {
        errors.push(`${fieldName} uses a URL shortener which is not allowed for security reasons`);
      }

      // Check for suspicious characters in URL
      if (url.includes('%') && /%[0-9a-f]{2}/gi.test(url)) {
        // Double encoding check (basic)
        const decoded = decodeURIComponent(url);
        if (decoded !== url && /%[0-9a-f]{2}/gi.test(decoded)) {
          errors.push(`${fieldName} appears to use double URL encoding which is suspicious`);
        }
      }

      // Check for overly long query strings (possible parameter pollution)
      if (parsedUrl.search.length > 2048) {
        errors.push(`${fieldName} has an unusually long query string`);
      }

      // Check for suspicious protocol handlers in query parameters
      const queryString = parsedUrl.search.toLowerCase();
      if (queryString.includes('javascript:') || queryString.includes('data:') || queryString.includes('file:')) {
        errors.push(`${fieldName} contains suspicious protocol handlers in query parameters`);
      }
    } catch {
      // URL parsing already failed, skip additional checks
    }

    return errors;
  }
}

/**
 * Type guard to check if a string is a valid URL
 */
export function isValidUrl(url: string, options?: UrlValidationOptions): url is string {
  const validation = UrlValidator.validateUrl(url, 'URL', options);
  return validation.isValid;
}

/**
 * Assert that a URL is valid, throwing an error if not
 */
export function assertValidUrl(url: string, fieldName?: string, options?: UrlValidationOptions): void {
  const validation = UrlValidator.validateUrl(url, fieldName, options);
  if (!validation.isValid) {
    throw new Error(`URL validation failed: ${validation.errors.join(', ')}`);
  }
}