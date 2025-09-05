#!/usr/bin/env node

/**
 * Error Handling Example
 * 
 * Demonstrates comprehensive error handling for all exception types:
 * - AuthenticationException
 * - ValidationException  
 * - RateLimitException
 * - NetworkError / MeruException
 * - Retry strategies and recovery
 */

import { MeruClient, AuthenticationException, ValidationException, RateLimitException, MeruException } from '../../dist/index.js';
import { createMeruConfig, exampleConfig } from '../config/config.js';
import { ExampleLogger } from '../utils/logger.js';
import { sleep, OperationTracker } from '../utils/helpers.js';

async function runErrorHandlingExample() {
  const logger = new ExampleLogger();
  const tracker = new OperationTracker();
  
  logger.header('Meru SDK - Error Handling Example');
  
  logger.info('This example demonstrates various error scenarios and recovery strategies');
  logger.info(`Using API endpoint: ${exampleConfig.baseUrl}`);
  
  // Initialize client with correct configuration
  const client = new MeruClient(createMeruConfig());
  
  try {
    logger.section('\n⚠️ ERROR HANDLING SCENARIOS');
    
    // 1. Test AuthenticationException
    logger.info('\n🔐 Testing Authentication Error...');
    try {
      const invalidClient = new MeruClient({
        ...createMeruConfig(),
        apiToken: 'invalid-token-12345'
      });
      
      await tracker.track('AuthenticationException → Invalid API token', async () => {
        return await invalidClient.addresses.list();
      });
      
    } catch (error: any) {
      if (error instanceof AuthenticationException) {
        logger.success('✅ AuthenticationException handled correctly');
        logger.info(`  Message: ${error.message}`);
        logger.info(`  Status: ${error.statusCode}`);
        logger.info('  Recommendation: Check your API token');
      } else {
        logger.error('Unexpected error type', error);
      }
    }

    // 2. Test ValidationException
    logger.info('\n🔍 Testing Validation Error...');
    try {
      await tracker.track('ValidationException → Invalid UUID format', async () => {
        return await client.addresses.get('invalid-uuid-format');
      });
      
    } catch (error: any) {
      if (error instanceof ValidationException) {
        logger.success('✅ ValidationException handled correctly');
        logger.info(`  Message: ${error.message}`);
        const errors = error.getAllErrorMessages?.() || [error.message];
        logger.info(`  Validation errors: ${errors.join(', ')}`);
      } else {
        logger.error('Unexpected error type', error);
      }
    }

    // 3. Test ValidationException for webhook URL
    logger.info('\n🌐 Testing Webhook URL Validation...');
    try {
      await tracker.track('ValidationException → Invalid webhook URL', async () => {
        return await client.addresses.create({
          webhookUrl: 'invalid-url-format',
          isPermanent: true
        });
      });
      
    } catch (error: any) {
      if (error instanceof ValidationException) {
        logger.success('✅ Webhook URL ValidationException handled correctly');
        logger.info(`  Message: ${error.message}`);
        const errors = error.getAllErrorMessages?.() || [error.message];
        logger.info(`  Security validation: ${errors.join(', ')}`);
      } else {
        logger.error('Unexpected error type', error);
      }
    }

    // 4. Test with HTTP URL in production (should be blocked)
    logger.info('\n🚨 Testing Security Validation...');
    try {
      await tracker.track('Security Validation → HTTP URL blocked', async () => {
        return await client.addresses.create({
          webhookUrl: 'http://insecure-webhook.com/test',
          isPermanent: true
        });
      });
      
    } catch (error: any) {
      if (error instanceof ValidationException) {
        logger.success('✅ Security validation working correctly');
        logger.info('  HTTP URLs are blocked in production for security');
        const errors = error.getAllErrorMessages?.() || [error.message];
        logger.info(`  Security error: ${errors.join(', ')}`);
      } else {
        logger.error('Unexpected error type', error);
      }
    }

    // 5. Test Rate Limiting Handling
    logger.info('\n⏱️ Testing Rate Limit Handling...');
    logger.info('Making rapid requests to potentially trigger rate limiting...');
    
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(
        client.addresses.list().catch(error => {
          if (error instanceof RateLimitException) {
            logger.success('✅ RateLimitException handled correctly');
            logger.info(`  Message: ${error.message}`);
            const retryAfter = error.getRetryAfterSeconds?.();
            if (retryAfter) {
              logger.info(`  Retry after: ${retryAfter} seconds`);
              logger.info(`  Retry date: ${error.getRetryAfterDate?.()?.toLocaleString()}`);
            }
            return { rateLimited: true };
          }
          throw error;
        })
      );
    }

    const results = await Promise.allSettled(rapidRequests);
    const rateLimitedCount = results.filter(r => 
      r.status === 'fulfilled' && (r.value as any)?.rateLimited
    ).length;
    
    if (rateLimitedCount > 0) {
      logger.info(`  ${rateLimitedCount}/10 requests were rate limited`);
    } else {
      logger.info('  No rate limiting detected (API has generous limits)');
    }

    // 6. Demonstrate retry logic with exponential backoff
    logger.info('\n🔄 Testing Retry Logic...');
    
    const retryOperation = async (maxRetries: number = 3) => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          attempt++;
          logger.info(`  Attempt ${attempt}/${maxRetries}`);
          
          // This might fail due to rate limiting or network issues
          const result = await client.addresses.list();
          logger.success(`  Success on attempt ${attempt}`);
          return result;
          
        } catch (error: any) {
          if (error instanceof RateLimitException && attempt < maxRetries) {
            const retryAfter = error.getRetryAfterSeconds?.() || 1;
            const waitTime = Math.min(retryAfter * 1000, 5000); // Max 5 seconds
            logger.warning(`  Rate limited, waiting ${waitTime}ms before retry...`);
            await sleep(waitTime);
            continue;
          }
          
          if (attempt >= maxRetries) {
            logger.error(`  Failed after ${maxRetries} attempts`, error);
            throw error;
          }
          
          // Exponential backoff for other errors
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warning(`  Error on attempt ${attempt}, retrying in ${backoffTime}ms...`);
          await sleep(backoffTime);
        }
      }
    };

    try {
      await tracker.track('Retry Logic → With exponential backoff', async () => {
        return await retryOperation(3);
      });
    } catch (error) {
      logger.info('Retry logic demonstration completed (may have failed)');
    }

    // 7. Test Network Error Handling
    logger.info('\n🌐 Testing Network Error Handling...');
    try {
      const networkClient = new MeruClient({
        ...createMeruConfig(),
        baseUrl: 'https://non-existent-api-endpoint-12345.com',
        timeout: 2000 // Short timeout
      });
      
      await tracker.track('Network Error → Invalid endpoint', async () => {
        return await networkClient.addresses.list();
      });
      
    } catch (error: any) {
      if (error instanceof MeruException) {
        logger.success('✅ Network error handled correctly');
        logger.info(`  Message: ${error.message}`);
        logger.info('  This demonstrates timeout and network error handling');
      } else {
        logger.info('Network error handled as expected');
      }
    }

    // 8. Demonstrate Graceful Degradation
    logger.section('\n🛡️ GRACEFUL DEGRADATION EXAMPLE');
    
    const gracefulOperation = async () => {
      try {
        // Try to get current usage
        const usage = await client.usage.get();
        return {
          success: true,
          data: usage,
          fallback: false
        };
      } catch (error: any) {
        // Graceful fallback
        logger.warning('Primary operation failed, using fallback data');
        return {
          success: false,
          data: {
            totalEmails: 0,
            successfulEmails: 0,
            failedWebhooks: 0,
            successRate: 0
          },
          fallback: true,
          error: error.message
        };
      }
    };

    const gracefulResult = await tracker.track('Graceful Degradation → Fallback strategy', gracefulOperation);
    
    if (gracefulResult.fallback) {
      logger.info('✅ Graceful degradation working - using fallback data');
    } else {
      logger.info('✅ Primary operation succeeded - no fallback needed');
    }

    // 9. Error Recovery Best Practices
    logger.section('\n📋 ERROR RECOVERY BEST PRACTICES');
    
    logger.info('✅ Always catch specific exception types first');
    logger.info('✅ Handle rate limiting with proper wait times');
    logger.info('✅ Implement exponential backoff for retries');
    logger.info('✅ Provide graceful degradation for non-critical failures');
    logger.info('✅ Log errors with enough context for debugging');
    logger.info('✅ Validate inputs before making API calls');
    logger.info('✅ Use timeouts to prevent hanging operations');
    logger.info('✅ Monitor error rates and patterns');

  } catch (error: any) {
    logger.error('Unexpected error in error handling demo', error);
  }

  // Show summary
  const stats = tracker.getStats();
  logger.summary(stats);
  
  logger.final('🎉 Error handling demonstration completed!');
  logger.info('The SDK provides robust error handling for all scenarios');
}

// Run the example
if (require.main === module) {
  runErrorHandlingExample().catch(console.error);
}

export { runErrorHandlingExample };