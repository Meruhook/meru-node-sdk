#!/usr/bin/env node

/**
 * Basic Account Operations Example
 * 
 * Demonstrates all 6 account methods:
 * - overview() - Get complete account overview
 * - summary() - Get account summary
 * - isHealthy() - Check account health
 * - getActiveAddressCount() - Get active address count
 * - getCurrentMonthEmailCount() - Get current month email count
 * - getCurrentMonthCost() - Get current month cost
 */

import { MeruClient } from '../../dist/index.js';
import { createMeruConfig, exampleConfig } from '../config/config.js';
import { ExampleLogger } from '../utils/logger.js';
import { formatAccountHealth, formatMoney, formatCount, OperationTracker } from '../utils/helpers.js';

async function runAccountExample() {
  const logger = new ExampleLogger();
  const tracker = new OperationTracker();
  
  logger.header('Meru SDK - Account Operations Example');
  
  // Initialize client
  const client = new MeruClient(createMeruConfig());
  logger.info(`Using API endpoint: ${exampleConfig.baseUrl}`);
  
  try {
    logger.section('\n👤 ACCOUNT OPERATIONS (6 methods)');
    
    // 1. Get complete account overview
    const overview = await tracker.track('overview() → Complete account overview', async () => {
      return await client.account.overview();
    });
    logger.info(`Account overview: ${formatAccountHealth(overview)}`);
    logger.json('Account Overview', {
      addresses: {
        total: overview.addresses.length,
        active: overview.addresses.filter(addr => addr.isEnabled).length,
        permanent: overview.addresses.filter(addr => addr.isPermanent).length,
        temporary: overview.addresses.filter(addr => !addr.isPermanent).length
      },
      usage: {
        totalEmails: overview.usage.totalEmails,
        successfulEmails: overview.usage.successfulEmails,
        successRate: overview.usage.successRate + '%'
      },
      billing: {
        currentCost: formatMoney(overview.billing.currentCost),
        projectedCost: formatMoney(overview.billing.projectedCost),
        isOverLimit: overview.billing.spendingLimit.isOverLimit
      },
      summary: overview.summary
    });

    // 2. Get account summary
    const summary = await tracker.track('summary() → Account summary', async () => {
      return await client.account.summary();
    });
    logger.info(`Summary retrieved: ${summary.activeAddresses} addresses, ${formatCount(summary.emailsThisMonth)} emails this month`);

    // 3. Check account health
    const isHealthy = await tracker.track('isHealthy() → Check account health', async () => {
      return await client.account.isHealthy();
    });
    const healthStatus = isHealthy ? '🟢 Healthy' : '🔴 Needs attention';
    logger.info(`Account health: ${healthStatus}`);

    // 4. Get active address count
    const activeCount = await tracker.track('getActiveAddressCount() → Active address count', async () => {
      return await client.account.getActiveAddressCount();
    });
    logger.info(`Active addresses: ${formatCount(activeCount)}`);

    // 5. Get current month email count
    const emailCount = await tracker.track('getCurrentMonthEmailCount() → Current month emails', async () => {
      return await client.account.getCurrentMonthEmailCount();
    });
    logger.info(`Emails this month: ${formatCount(emailCount)}`);

    // 6. Get current month cost
    const monthlyCost = await tracker.track('getCurrentMonthCost() → Current month cost', async () => {
      return await client.account.getCurrentMonthCost();
    });
    logger.info(`Cost this month: ${formatMoney(monthlyCost)}`);

    // Additional account insights
    logger.section('\n📊 ACCOUNT INSIGHTS');
    
    // Address utilization
    if (overview.addresses.length > 0) {
      const activePercentage = (activeCount / overview.addresses.length) * 100;
      logger.info(`Address utilization: ${activePercentage.toFixed(1)}% of addresses are active`);
      
      const permanentCount = overview.addresses.filter(addr => addr.isPermanent).length;
      const temporaryCount = overview.addresses.length - permanentCount;
      logger.info(`Address types: ${permanentCount} permanent, ${temporaryCount} temporary`);
      
      // Show most recent addresses
      const recentAddresses = overview.addresses
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      
      if (recentAddresses.length > 0) {
        logger.info('Recent addresses:');
        recentAddresses.forEach(addr => {
          const age = Math.floor((Date.now() - new Date(addr.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const status = addr.isEnabled ? '🟢' : '🔴';
          logger.info(`  ${status} ${addr.address} (${age} days old)`);
        });
      }
    }

    // Email efficiency
    if (overview.usage.totalEmails > 0) {
      const emailsPerAddress = activeCount > 0 ? overview.usage.totalEmails / activeCount : 0;
      logger.info(`Email efficiency: ${emailsPerAddress.toFixed(1)} emails per active address`);
      
      const failureRate = 100 - overview.usage.successRate;
      if (failureRate > 10) {
        logger.warning(`⚠️  High failure rate: ${failureRate.toFixed(1)}% of emails failed`);
      } else {
        logger.info(`Email reliability: ${overview.usage.successRate}% success rate`);
      }
    }

    // Cost efficiency
    if (overview.usage.totalEmails > 0 && overview.billing.currentCost > 0) {
      const costPerEmail = overview.billing.currentCost / overview.usage.totalEmails;
      logger.info(`Cost efficiency: ${formatMoney(costPerEmail)} per email`);
    }

    // Account status summary
    const issues = [];
    if (!isHealthy) issues.push('Over spending limit');
    if (activeCount === 0) issues.push('No active addresses');
    if (overview.usage.successRate < 90) issues.push('Low email success rate');
    
    if (issues.length > 0) {
      logger.warning(`Account issues: ${issues.join(', ')}`);
    } else {
      logger.info('✅ Account is operating optimally');
    }

    // Growth insights
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthProgress = dayOfMonth / daysInMonth;
    
    if (overview.billing.projectedCost > 0 && monthProgress > 0.1) {
      const projectedEmails = overview.usage.totalEmails / monthProgress;
      const projectedGrowth = ((projectedEmails - overview.usage.totalEmails) / overview.usage.totalEmails) * 100;
      
      if (projectedGrowth > 50) {
        logger.info(`📈 Projected growth: ${formatCount(Math.round(projectedEmails))} emails by month-end (+${projectedGrowth.toFixed(0)}%)`);
      }
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
    } else if (error.name === 'MeruException') {
      logger.error(`API Error: ${error.message}`);
      if (error.statusCode) {
        logger.error(`Status Code: ${error.statusCode}`);
      }
    } else {
      // Network or other errors
      logger.error(`Network/Connection Error: ${error.message}`);
      if (error.message.includes('certificate')) {
        logger.error('SSL Certificate issue detected. This is common with test environments.');
        logger.error('For local testing, consider using NODE_TLS_REJECT_UNAUTHORIZED=0');
      }
      if (error.code) {
        logger.error(`Error Code: ${error.code}`);
      }
    }

    // Debug: Show raw response structure
    logger.error('Raw error for debugging:', JSON.stringify(error, null, 2));
  }

  // Show summary
  const stats = tracker.getStats();
  logger.summary(stats);
  
  if (stats.successful === 6) {
    logger.final('🎉 All account operations completed successfully!');
  } else {
    logger.final(`⚠️  ${stats.successful}/6 operations completed successfully`);
  }
}

// Run the example
if (require.main === module) {
  runAccountExample().catch(console.error);
}

export { runAccountExample };