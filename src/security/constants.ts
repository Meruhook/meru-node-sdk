export const SECURITY_LIMITS = {
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_JSON_DEPTH: 100,
  MAX_URL_LENGTH: 2048,
  MAX_HEADER_VALUE_LENGTH: 8192,
  MAX_WEBHOOK_URL_LENGTH: 2048,
  MAX_ADDRESS_ID_LENGTH: 64,
  MAX_REQUEST_TIMEOUT: 60000, // 60 seconds
  MIN_REQUEST_TIMEOUT: 1000,  // 1 second
} as const;

export const ALLOWED_URL_SCHEMES = ['https'] as const;
export const ALLOWED_URL_SCHEMES_DEV = ['https', 'http'] as const;

export const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS metadata
  '10.0.0.0/8',
  '172.16.0.0/12', 
  '192.168.0.0/16',
] as const;

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export const HEADER_INJECTION_PATTERNS = [
  /[\r\n]/,
  /\x00/,
  /[\x01-\x1f\x7f]/,
] as const;

export const TOKEN_REDACTION = {
  SHOW_CHARS: 4,
  REPLACEMENT: '*',
} as const;

export const RATE_LIMIT_DEFAULTS = {
  MAX_RETRY_AFTER: 300, // 5 minutes max retry wait
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY: 30000, // 30 seconds max delay
} as const;