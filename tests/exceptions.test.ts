import { describe, it, expect } from 'bun:test';
import {
  MeruException,
  AuthenticationException,
  ValidationException,
  RateLimitException,
} from '../src/exceptions/index.js';
import type { ApiResponse, ApiErrorResponse } from '../src/types/client.js';

describe('Exceptions', () => {
  const mockResponse: ApiResponse<ApiErrorResponse> = {
    data: {
      message: 'Test error message',
      errors: {
        email: ['Email is required'],
        name: ['Name must be at least 3 characters']
      },
      code: 'VALIDATION_ERROR'
    },
    status: 422,
    statusText: 'Unprocessable Entity',
    headers: { 'content-type': 'application/json' }
  };

  describe('MeruException', () => {
    it('should create base exception', () => {
      const error = new MeruException('Test error');
      
      expect(error.name).toBe('MeruException');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
    });

    it('should create exception from response', () => {
      const error = MeruException.fromResponse(mockResponse);
      
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(422);
      expect(error.response).toEqual(mockResponse);
    });

    it('should get error details', () => {
      const error = MeruException.fromResponse(mockResponse);
      const details = error.getErrorDetails();
      
      expect(details).toMatchObject({
        message: 'Test error message',
        statusCode: 422,
        errors: mockResponse.data.errors,
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('AuthenticationException', () => {
    it('should create authentication exception', () => {
      const error = new AuthenticationException();
      
      expect(error.name).toBe('AuthenticationException');
      expect(error.message).toBe('Authentication failed');
    });

    it('should create authentication exception from response', () => {
      const authResponse = {
        ...mockResponse,
        status: 401,
        data: { message: 'Unauthorized' }
      };
      
      const error = AuthenticationException.fromResponse(authResponse);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ValidationException', () => {
    it('should create validation exception', () => {
      const error = new ValidationException('Validation failed', mockResponse);
      
      expect(error.name).toBe('ValidationException');
      expect(error.validationErrors).toEqual(mockResponse.data.errors);
    });

    it('should get field errors', () => {
      const error = ValidationException.fromResponse(mockResponse);
      
      expect(error.getFieldErrors('email')).toEqual(['Email is required']);
      expect(error.getFieldErrors('nonexistent')).toBeUndefined();
    });

    it('should get all error messages', () => {
      const error = ValidationException.fromResponse(mockResponse);
      const messages = error.getAllErrorMessages();
      
      expect(messages).toContain('Email is required');
      expect(messages).toContain('Name must be at least 3 characters');
      expect(messages).toHaveLength(2);
    });
  });

  describe('RateLimitException', () => {
    it('should create rate limit exception', () => {
      const error = new RateLimitException('Rate limited', undefined, 60);
      
      expect(error.name).toBe('RateLimitException');
      expect(error.retryAfter).toBe(60);
    });

    it('should create rate limit exception from response', () => {
      const rateLimitResponse = {
        ...mockResponse,
        status: 429,
        data: { message: 'Too many requests' },
        headers: { 'retry-after': '120' }
      };
      
      const error = RateLimitException.fromResponse(rateLimitResponse);
      
      expect(error.message).toBe('Too many requests');
      expect(error.getRetryAfterSeconds()).toBe(120);
    });

    it('should get retry after date', () => {
      const error = new RateLimitException('Rate limited', undefined, 60);
      const retryDate = error.getRetryAfterDate();
      
      expect(retryDate).toBeInstanceOf(Date);
      expect(retryDate!.getTime()).toBeGreaterThan(Date.now());
    });
  });
});