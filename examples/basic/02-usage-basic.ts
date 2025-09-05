#!/usr/bin/env node

/**
 * Basic Usage Operations Example
 * 
 * Demonstrates all 5 usage methods:
 * - get() - Get current month usage summary
 * - events() - Get recent usage events
 * - period() - Get usage for specific period
 * - forMonth() - Get usage for specific year/month
 * - previousMonth() - Get previous month usage
 */

import { MeruClient } from '../../dist/index.js';
import { createMeruConfig, exampleConfig } from '../config/config.js';
import { ExampleLogger } from '../utils/logger.js';
import { formatUsage, formatCount, getCurrentMonth, getPreviousMonth, OperationTracker } from '../utils/helpers.js';

async function runUsageExample() {
  const logger = new ExampleLogger();
  const tracker = new OperationTracker();
  
  logger.header('Meru SDK - Usage Operations Example');
  
  // Initialize client
  const client = new MeruClient(createMeruConfig());
  logger.info(`Using API endpoint: ${exampleConfig.baseUrl}`);
  
  try {
    logger.section('\n📊 USAGE OPERATIONS (5 methods)');
    
    // 1. Get current month usage
    const currentUsage = await tracker.track('get() → Current month usage', async () => {
      return await client.usage.get();
    });
    logger.info(`Current month: ${formatUsage(currentUsage)}`);
    logger.json('Current Usage Details', {
      totalEmails: currentUsage.totalEmails,
      successfulEmails: currentUsage.successfulEmails,
      failedWebhooks: currentUsage.failedWebhooks,
      successRate: currentUsage.successRate + '%',
      period: getCurrentMonth()
    });

    // 2. Get recent usage events (audit trail)
    const events = await tracker.track('events() → Recent usage events', async () => {
      return await client.usage.events(20); // Get last 20 events
    });
    logger.info(`Retrieved ${formatCount(events.length)} recent events`);
    if (events.length > 0) {
      logger.info('Recent events:');
      events.slice(0, 5).forEach(event => {
        const timestamp = new Date(event.timestamp).toLocaleString();
        logger.info(`  • ${timestamp}: ${event.type} - ${event.details}`);
      });
      if (events.length > 5) {
        logger.info(`  ... and ${events.length - 5} more events`);
      }
    }

    // 3. Get usage for specific period (current month)
    const currentPeriod = getCurrentMonth();
    const periodUsage = await tracker.track(`period() → Usage for ${currentPeriod}`, async () => {
      return await client.usage.period(currentPeriod);
    });
    logger.info(`${currentPeriod}: ${formatUsage(periodUsage)}`);

    // 4. Get usage for specific year/month (previous month)
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const prevYear = prevMonth.getFullYear();
    const prevMonthNum = prevMonth.getMonth() + 1;
    
    const monthlyUsage = await tracker.track(`forMonth() → Usage for ${prevYear}-${prevMonthNum}`, async () => {
      return await client.usage.forMonth(prevYear, prevMonthNum);
    });
    logger.info(`${prevYear}-${prevMonthNum.toString().padStart(2, '0')}: ${formatUsage(monthlyUsage)}`);

    // 5. Get previous month usage (convenience method)
    const previousUsage = await tracker.track('previousMonth() → Previous month usage', async () => {
      return await client.usage.previousMonth();
    });
    logger.info(`Previous month: ${formatUsage(previousUsage)}`);

    // Additional insights
    logger.section('\n📈 USAGE INSIGHTS');
    
    // Compare current vs previous month
    if (currentUsage.totalEmails > 0 && previousUsage.totalEmails > 0) {
      const change = ((currentUsage.totalEmails - previousUsage.totalEmails) / previousUsage.totalEmails) * 100;
      const trend = change > 0 ? '📈 up' : change < 0 ? '📉 down' : '➡️ unchanged';
      logger.info(`Email volume: ${trend} ${Math.abs(change).toFixed(1)}% vs last month`);
      
      const successRateChange = currentUsage.successRate - previousUsage.successRate;
      const successTrend = successRateChange > 0 ? '📈 improved' : successRateChange < 0 ? '📉 declined' : '➡️ stable';
      logger.info(`Success rate: ${successTrend} (${currentUsage.successRate}% vs ${previousUsage.successRate}%)`);
    }

    // Show event activity
    if (events.length > 0) {
      const eventTypes = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info('Event breakdown:');
      Object.entries(eventTypes).forEach(([type, count]) => {
        logger.info(`  • ${type}: ${count} events`);
      });
    }

  } catch (error: any) {
    logger.error('Operation failed', error);
    
    // Show detailed error information
    if (error.name === 'ValidationException') {
      logger.error('Validation Error Details:', error.getAllErrorMessages?.() || error.message);
    } else if (error.name === 'AuthenticationException') {
      logger.error('Authentication failed - check your API token');
    } else if (error.name === 'RateLimitException') {
      const retryAfter = error.getRetryAfterSeconds?.();
      logger.error(`Rate limited. Retry after ${retryAfter} seconds`);
    }
  }

  // Show summary
  const stats = tracker.getStats();
  logger.summary(stats);
  
  if (stats.successful === 5) {
    logger.final('🎉 All usage operations completed successfully!');
  } else {
    logger.final(`⚠️  ${stats.successful}/5 operations completed successfully`);
  }
}

// Run the example
if (require.main === module) {
  runUsageExample().catch(console.error);
}

export { runUsageExample };