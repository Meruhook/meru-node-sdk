/**
 * Configuration options for the Meru client
 */
export interface MeruClientConfig {
  /** API token for authentication */
  apiToken: string;
  /** Base URL for the API (default: https://api.meruhook.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum response size in bytes (default: 10MB) */
  maxResponseSize?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Number of retry attempts (default: 3) */
  times?: number;
  /** Delay between retries in milliseconds (default: 100) */
  delay?: number;
  /** Maximum delay between retries in milliseconds (default: 5000) */
  maxDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: Record<string, unknown> | null;
  query?: Record<string, string | number | boolean> | null;
  headers?: Record<string, string>;
}

/**
 * HTTP response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}