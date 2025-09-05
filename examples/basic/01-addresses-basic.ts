#!/usr/bin/env node

/**
 * Basic Address Operations Example
 * 
 * Demonstrates all 8 address methods:
 * - list() - List all addresses
 * - create() - Create new addresses
 * - get() - Get address details
 * - update() - Update address properties
 * - delete() - Delete an address
 * - enable() - Enable an address
 * - disable() - Disable an address
 * - updateWebhookUrl() - Update webhook URL
 */

import { MeruClient } from '../../dist/index.js';
import { createMeruConfig, exampleConfig } from '../config/config.js';
import { ExampleLogger } from '../utils/logger.js';
import { formatAddress, createTestAddress, OperationTracker } from '../utils/helpers.js';

async function runAddressesExample() {
  const logger = new ExampleLogger();
  const tracker = new OperationTracker();
  
  logger.header('Meru SDK - Address Operations Example');
  
  // Initialize client
  const client = new MeruClient(createMeruConfig());
  logger.info(`Using API endpoint: ${exampleConfig.baseUrl}`);
  logger.info(`Debug mode: ${exampleConfig.debug ? 'ON' : 'OFF'}`);
  
  let createdAddressId: string | null = null;
  
  try {
    // 1. List all addresses
    logger.section('\n📧 ADDRESS OPERATIONS (8 methods)');
    
    const addresses = await tracker.track('list() → List all addresses', async () => {
      return await client.addresses.list();
    });
    logger.info(`Found ${addresses.length} existing addresses`);
    if (addresses.length > 0) {
      addresses.slice(0, 3).forEach(addr => {
        logger.info(`  • ${formatAddress(addr)}`);
      });
    }

    // 2. Create a new address
    const testParams = createTestAddress(exampleConfig.webhookUrl);
    const newAddress = await tracker.track('create() → Create new address', async () => {
      return await client.addresses.create(testParams);
    });
    createdAddressId = newAddress.id;
    logger.info(`Created: ${formatAddress(newAddress)}`);

    // 3. Get the created address
    const retrievedAddress = await tracker.track('get() → Retrieve address details', async () => {
      return await client.addresses.get(createdAddressId!);
    });
    logger.info(`Retrieved: ${formatAddress(retrievedAddress)}`);

    // 4. Update the address (change webhook URL)
    const updatedWebhookUrl = `${exampleConfig.webhookUrl}/updated`;
    const updatedAddress = await tracker.track('update() → Update address properties', async () => {
      return await client.addresses.update(createdAddressId!, {
        webhookUrl: updatedWebhookUrl,
        isEnabled: true
      });
    });
    logger.info(`Updated webhook URL: ${updatedAddress.webhookUrl}`);

    // 5. Disable the address
    const disabledAddress = await tracker.track('disable() → Disable address', async () => {
      return await client.addresses.disable(createdAddressId!);
    });
    logger.info(`Disabled: ${formatAddress(disabledAddress)}`);

    // 6. Enable the address
    const enabledAddress = await tracker.track('enable() → Enable address', async () => {
      return await client.addresses.enable(createdAddressId!);
    });
    logger.info(`Enabled: ${formatAddress(enabledAddress)}`);

    // 7. Update webhook URL directly
    const finalWebhookUrl = `${exampleConfig.webhookUrl}/final`;
    const finalAddress = await tracker.track('updateWebhookUrl() → Update webhook URL', async () => {
      return await client.addresses.updateWebhookUrl(createdAddressId!, finalWebhookUrl);
    });
    logger.info(`Final webhook URL: ${finalAddress.webhookUrl}`);

    // 8. Delete the address
    await tracker.track('delete() → Delete address', async () => {
      return await client.addresses.delete(createdAddressId!);
    });
    logger.info(`Deleted address: ${createdAddressId}`);
    createdAddressId = null; // Mark as deleted

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
  } finally {
    // Clean up - delete the address if it still exists
    if (createdAddressId) {
      try {
        await client.addresses.delete(createdAddressId);
        logger.info(`Cleaned up address: ${createdAddressId}`);
      } catch (error) {
        logger.warning(`Failed to clean up address: ${createdAddressId}`);
      }
    }
  }

  // Show summary
  const stats = tracker.getStats();
  logger.summary(stats);
  
  if (stats.successful === 8) {
    logger.final('🎉 All address operations completed successfully!');
  } else {
    logger.final(`⚠️  ${stats.successful}/8 operations completed successfully`);
  }
}

// Run the example
if (require.main === module) {
  runAddressesExample().catch(console.error);
}

export { runAddressesExample };