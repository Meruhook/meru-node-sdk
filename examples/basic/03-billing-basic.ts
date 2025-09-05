#!/usr/bin/env node

/**
 * Basic Billing Operations Example
 * 
 * Demonstrates all 5 billing methods:
 * - get() - Get current billing status and costs
 * - breakdown() - Get detailed cost breakdown
 * - isOverSpendingLimit() - Check spending limit status
 * - getRemainingBudget() - Get remaining budget
 * - getProjectedCost() - Get projected month-end cost
 */

import { MeruClient } from '../../dist/index.js';
import { createMeruConfig, exampleConfig } from '../config/config.js';
import { ExampleLogger } from '../utils/logger.js';
import { formatBilling, formatMoney, OperationTracker } from '../utils/helpers.js';

async function runBillingExample() {
  const logger = new ExampleLogger();
  const tracker = new OperationTracker();
  
  logger.header('Meru SDK - Billing Operations Example');
  
  // Initialize client
  const client = new MeruClient(createMeruConfig());
  logger.info(`Using API endpoint: ${exampleConfig.baseUrl}`);
  
  try {
    logger.section('\n💰 BILLING OPERATIONS (5 methods)');
    
    // 1. Get current billing status
    const billing = await tracker.track('get() → Current billing status', async () => {
      return await client.billing.get();
    });
    logger.info(`Current billing: ${formatBilling(billing)}`);
    logger.json('Billing Summary', {
      currentCost: formatMoney(billing.currentCost),
      projectedCost: formatMoney(billing.projectedCost),
      spendingLimit: {
        hasLimit: billing.spendingLimit.hasLimit,
        isOverLimit: billing.spendingLimit.isOverLimit,
        remainingBudget: billing.spendingLimit.remainingBudget 
          ? formatMoney(billing.spendingLimit.remainingBudget) 
          : null
      }
    });

    // 2. Get detailed cost breakdown
    const breakdown = await tracker.track('breakdown() → Detailed cost breakdown', async () => {
      return await client.billing.breakdown();
    });
    logger.info(`Cost breakdown retrieved successfully`);
    logger.json('Cost Breakdown', {
      baseCost: formatMoney(breakdown.baseCost),
      overageCost: formatMoney(breakdown.overageCost),
      addonCost: formatMoney(breakdown.addonCost),
      totalCost: formatMoney(breakdown.totalCost),
      usageBreakdown: {
        includedEmails: breakdown.usageBreakdown.includedEmails,
        usedEmails: breakdown.usageBreakdown.usedEmails,
        overageEmails: breakdown.usageBreakdown.overageEmails,
        remainingIncluded: breakdown.usageBreakdown.remainingIncluded
      }
    });

    logger.info('Cost components:');
    logger.info(`  • Base Plan: ${formatMoney(breakdown.baseCost)}`);
    if (breakdown.overageCost > 0) {
      logger.info(`  • Overage: ${formatMoney(breakdown.overageCost)} (${breakdown.usageBreakdown.overageEmails} emails)`);
    }
    if (breakdown.addonCost > 0) {
      logger.info(`  • Add-ons: ${formatMoney(breakdown.addonCost)}`);
    }

    // 3. Check spending limit status
    const isOverLimit = await tracker.track('isOverSpendingLimit() → Check spending limit', async () => {
      return await client.billing.isOverSpendingLimit();
    });
    const limitStatus = isOverLimit ? '🔴 Over spending limit' : '🟢 Within spending limit';
    logger.info(`Spending status: ${limitStatus}`);

    // 4. Get remaining budget
    const remainingBudget = await tracker.track('getRemainingBudget() → Get remaining budget', async () => {
      return await client.billing.getRemainingBudget();
    });
    if (remainingBudget !== null) {
      const budgetStatus = remainingBudget > 0 
        ? `🟢 ${formatMoney(remainingBudget)} remaining`
        : '🔴 Budget exceeded';
      logger.info(`Budget status: ${budgetStatus}`);
    } else {
      logger.info('Budget status: 🔄 No spending limit set');
    }

    // 5. Get projected cost
    const projectedCost = await tracker.track('getProjectedCost() → Get projected cost', async () => {
      return await client.billing.getProjectedCost();
    });
    logger.info(`Projected month-end cost: ${formatMoney(projectedCost)}`);

    // Additional billing insights
    logger.section('\n📊 BILLING INSIGHTS');
    
    // Cost analysis
    const currentProgress = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedCost = projectedCost * currentProgress;
    const actualVsExpected = billing.currentCost - expectedCost;
    
    if (Math.abs(actualVsExpected) > 0.01) {
      const trend = actualVsExpected > 0 ? 'above' : 'below';
      logger.info(`Spending trend: Running ${formatMoney(Math.abs(actualVsExpected))} ${trend} expected pace`);
    } else {
      logger.info('Spending trend: On track with expected monthly pace');
    }

    // Budget warnings
    if (billing.spendingLimit.hasLimit && remainingBudget !== null) {
      const budgetUtilization = ((billing.currentCost) / (billing.currentCost + remainingBudget)) * 100;
      
      if (budgetUtilization > 90) {
        logger.warning(`⚠️  High budget utilization: ${budgetUtilization.toFixed(1)}%`);
      } else if (budgetUtilization > 75) {
        logger.info(`Budget utilization: ${budgetUtilization.toFixed(1)}%`);
      } else {
        logger.info(`Budget utilization: ${budgetUtilization.toFixed(1)}% (healthy)`);
      }
    }

    // Cost breakdown analysis
    logger.info(`Usage analysis:`);
    const utilizationRate = breakdown.usageBreakdown.includedEmails > 0 
      ? (breakdown.usageBreakdown.usedEmails / breakdown.usageBreakdown.includedEmails * 100)
      : 0;
    logger.info(`  • Plan utilization: ${utilizationRate.toFixed(1)}% (${breakdown.usageBreakdown.usedEmails}/${breakdown.usageBreakdown.includedEmails} emails)`);
    
    if (breakdown.usageBreakdown.overageEmails > 0) {
      logger.warning(`  • Overage emails: ${breakdown.usageBreakdown.overageEmails} (${formatMoney(breakdown.overageCost)})`);
    } else {
      logger.info(`  • Remaining included emails: ${breakdown.usageBreakdown.remainingIncluded}`);
    }
    
    // Show cost component breakdown
    const basePortion = (breakdown.baseCost / breakdown.totalCost * 100);
    logger.info(`  • Base plan: ${basePortion.toFixed(1)}% of total cost`);
    
    if (breakdown.overageCost > 0) {
      const overagePortion = (breakdown.overageCost / breakdown.totalCost * 100);
      logger.info(`  • Overage: ${overagePortion.toFixed(1)}% of total cost`);
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
    logger.final('🎉 All billing operations completed successfully!');
  } else {
    logger.final(`⚠️  ${stats.successful}/5 operations completed successfully`);
  }
}

// Run the example
if (require.main === module) {
  runBillingExample().catch(console.error);
}

export { runBillingExample };