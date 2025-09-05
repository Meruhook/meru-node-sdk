import { 
  UUID_REGEX, 
  SECURITY_LIMITS, 
  HEADER_INJECTION_PATTERNS,
  ALLOWED_URL_SCHEMES,
  ALLOWED_URL_SCHEMES_DEV,
  BLOCKED_HOSTNAMES,
} from './constants.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationOptions {
  allowHttp?: boolean;
  maxLength?: number;
  required?: boolean;
}

export class InputValidator {
  /**
   * Validate a UUID format
   */
  static validateUuid(input: string, fieldName: string = 'ID'): ValidationResult {
    const errors: string[] = [];
    
    if (!input) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    if (typeof input !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return { isValid: false, errors };
    }

    if (input.length > SECURITY_LIMITS.MAX_ADDRESS_ID_LENGTH) {
      errors.push(`${fieldName} exceeds maximum length of ${SECURITY_LIMITS.MAX_ADDRESS_ID_LENGTH}`);
    }

    if (!UUID_REGEX.test(input)) {
      errors.push(`${fieldName} must be a valid UUID format`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a webhook URL
   */
  static validateWebhookUrl(url: string, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const { allowHttp = false, required = true } = options;

    if (!url) {
      if (required) {
        errors.push('Webhook URL is required');
      }
      return { isValid: !required, errors };
    }

    if (typeof url !== 'string') {
      errors.push('Webhook URL must be a string');
      return { isValid: false, errors };
    }

    if (url.length > SECURITY_LIMITS.MAX_WEBHOOK_URL_LENGTH) {
      errors.push(`Webhook URL exceeds maximum length of ${SECURITY_LIMITS.MAX_WEBHOOK_URL_LENGTH}`);
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      errors.push('Webhook URL is not a valid URL');
      return { isValid: false, errors };
    }

    // Validate scheme
    const allowedSchemes = allowHttp ? ALLOWED_URL_SCHEMES_DEV : ALLOWED_URL_SCHEMES;
    if (!allowedSchemes.includes(parsedUrl.protocol.slice(0, -1) as any)) {
      errors.push(`Webhook URL must use ${allowedSchemes.join(' or ')} protocol`);
    }

    // Check for dangerous hostnames (SSRF prevention)
    if (this.isBlockedHostname(parsedUrl.hostname)) {
      errors.push('Webhook URL hostname is not allowed for security reasons');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate base URL configuration
   */
  static validateBaseUrl(url: string, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const { allowHttp = false, required = true } = options;

    if (!url) {
      if (required) {
        errors.push('Base URL is required');
      }
      return { isValid: !required, errors };
    }

    if (typeof url !== 'string') {
      errors.push('Base URL must be a string');
      return { isValid: false, errors };
    }

    if (url.length > SECURITY_LIMITS.MAX_URL_LENGTH) {
      errors.push(`Base URL exceeds maximum length of ${SECURITY_LIMITS.MAX_URL_LENGTH}`);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      errors.push('Base URL is not a valid URL');
      return { isValid: false, errors };
    }

    const allowedSchemes = allowHttp ? ALLOWED_URL_SCHEMES_DEV : ALLOWED_URL_SCHEMES;
    if (!allowedSchemes.includes(parsedUrl.protocol.slice(0, -1) as any)) {
      errors.push(`Base URL must use ${allowedSchemes.join(' or ')} protocol`);
    }

    // Ensure URL ends with API endpoint structure
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      parsedUrl.pathname = '/';
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate header values for injection attacks
   */
  static validateHeaderValue(value: string, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${fieldName} header must be a string`);
      return { isValid: false, errors };
    }

    if (value.length > SECURITY_LIMITS.MAX_HEADER_VALUE_LENGTH) {
      errors.push(`${fieldName} header exceeds maximum length of ${SECURITY_LIMITS.MAX_HEADER_VALUE_LENGTH}`);
    }

    for (const pattern of HEADER_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        errors.push(`${fieldName} header contains invalid characters`);
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate timeout values
   */
  static validateTimeout(timeout: number): ValidationResult {
    const errors: string[] = [];

    if (typeof timeout !== 'number' || isNaN(timeout)) {
      errors.push('Timeout must be a valid number');
      return { isValid: false, errors };
    }

    if (timeout < SECURITY_LIMITS.MIN_REQUEST_TIMEOUT) {
      errors.push(`Timeout must be at least ${SECURITY_LIMITS.MIN_REQUEST_TIMEOUT}ms`);
    }

    if (timeout > SECURITY_LIMITS.MAX_REQUEST_TIMEOUT) {
      errors.push(`Timeout cannot exceed ${SECURITY_LIMITS.MAX_REQUEST_TIMEOUT}ms`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input by removing dangerous characters
   */
  static sanitizeString(input: string, maxLength?: number): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length if specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate JSON string for parsing safety
   */
  static validateJsonString(jsonString: string): ValidationResult {
    const errors: string[] = [];

    if (typeof jsonString !== 'string') {
      errors.push('Input must be a string');
      return { isValid: false, errors };
    }

    if (jsonString.length > SECURITY_LIMITS.MAX_RESPONSE_SIZE) {
      errors.push(`JSON string exceeds maximum size of ${SECURITY_LIMITS.MAX_RESPONSE_SIZE} bytes`);
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (this.getObjectDepth(parsed) > SECURITY_LIMITS.MAX_JSON_DEPTH) {
        errors.push(`JSON depth exceeds maximum of ${SECURITY_LIMITS.MAX_JSON_DEPTH}`);
      }
    } catch {
      errors.push('Invalid JSON format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if hostname should be blocked for security reasons
   */
  private static isBlockedHostname(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase();
    
    for (const blocked of BLOCKED_HOSTNAMES) {
      if (blocked.includes('/')) {
        // CIDR notation - simplified check for common private ranges
        const basePart = blocked.split('/')[0];
        if (basePart && normalizedHostname.startsWith(basePart)) {
          return true;
        }
      } else if (normalizedHostname === blocked) {
        return true;
      }
    }

    // Block private IP ranges (simplified)
    if (/^10\./.test(normalizedHostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(normalizedHostname) ||
        /^192\.168\./.test(normalizedHostname)) {
      return true;
    }

    return false;
  }

  /**
   * Get the depth of an object/array for JSON bomb protection
   */
  private static getObjectDepth(obj: any, depth: number = 0): number {
    if (depth > SECURITY_LIMITS.MAX_JSON_DEPTH) {
      return depth;
    }

    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    if (Array.isArray(obj)) {
      let maxDepth = depth;
      for (const item of obj) {
        const itemDepth = this.getObjectDepth(item, depth + 1);
        maxDepth = Math.max(maxDepth, itemDepth);
      }
      return maxDepth;
    }

    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      const valueDepth = this.getObjectDepth(value, depth + 1);
      maxDepth = Math.max(maxDepth, valueDepth);
    }

    return maxDepth;
  }
}

/**
 * Validation decorator for methods
 */
export function validateInput<T extends any[]>(
  validator: (args: T) => ValidationResult
): MethodDecorator {
  return function (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: T) {
      const validation = validator(args);
      if (!validation.isValid) {
        throw new Error(`Validation failed for ${String(propertyKey)}: ${validation.errors.join(', ')}`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}