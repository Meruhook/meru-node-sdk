// Example: Basic usage of the Meru Node.js SDK
// This example demonstrates the main features of the SDK

import { MeruClient } from '@meruhook/node-sdk';

async function main() {
  // Initialize the client
  const client = new MeruClient({
    apiToken: process.env.MERU_API_TOKEN || 'your-api-token-here',
    baseUrl: 'https://api.meruhook.com',
    timeout: 30000,
    debug: process.env.NODE_ENV === 'development',
    retry: {
      times: 3,
      delay: 100,
    },
  });

  try {
    console.log('🚀 Meru SDK Example\n');

    // Create a new email address
    console.log('📧 Creating a new email address...');
    const newAddress = await client.addresses.create({
      webhookUrl: 'https://your-app.com/webhook',
      isPermanent: true,
    });
    console.log(`✅ Created: ${newAddress.address}\n`);

    // List all addresses
    console.log('📋 Listing all addresses...');
    const addresses = await client.addresses.list();
    console.log(`📊 Found ${addresses.length} addresses:`);
    addresses.forEach(addr => {
      console.log(`  - ${addr.address} (${addr.isEnabled ? 'enabled' : 'disabled'})`);
    });
    console.log();

    // Get usage statistics
    console.log('📈 Getting usage statistics...');
    const usage = await client.usage.get();
    console.log(`📊 Usage Summary:`);
    console.log(`  - Total emails: ${usage.totalEmails}`);
    console.log(`  - Success rate: ${usage.successRate.toFixed(2)}%`);
    console.log(`  - Today's emails: ${usage.todayEmails}`);
    console.log(`  - Projected monthly: ${usage.projectedMonthly}\n`);

    // Get billing information
    console.log('💰 Getting billing information...');
    const billing = await client.billing.get();
    console.log(`💳 Billing Summary:`);
    console.log(`  - Current cost: $${billing.currentCost.toFixed(2)}`);
    console.log(`  - Projected cost: $${billing.projectedCost.toFixed(2)}`);
    console.log(`  - Has spending limit: ${billing.spendingLimit.hasLimit ? 'Yes' : 'No'}`);
    if (billing.spendingLimit.hasLimit) {
      console.log(`  - Spending limit: $${billing.spendingLimit.limit}`);
      console.log(`  - Remaining budget: $${billing.spendingLimit.remainingBudget?.toFixed(2) || 'N/A'}`);
    }
    console.log();

    // Get account overview
    console.log('🏠 Getting account overview...');
    const overview = await client.account.overview();
    console.log(`📋 Account Summary:`);
    console.log(`  - Total addresses: ${overview.summary.totalAddresses}`);
    console.log(`  - Active addresses: ${overview.summary.activeAddresses}`);
    console.log(`  - Emails this month: ${overview.summary.emailsThisMonth}`);
    console.log(`  - Cost this month: $${overview.summary.costThisMonth.toFixed(2)}`);
    console.log(`  - Account healthy: ${overview.summary.isOverSpendingLimit ? 'No (over limit)' : 'Yes'}\n`);

    // Update an address
    console.log('⚙️  Updating address...');
    const updatedAddress = await client.addresses.update(newAddress.id, {
      isEnabled: false,
    });
    console.log(`✅ Address updated: ${updatedAddress.address} is now ${updatedAddress.isEnabled ? 'enabled' : 'disabled'}\n`);

    // Convenience methods
    console.log('🔄 Using convenience methods...');
    
    // Re-enable the address
    await client.addresses.enable(newAddress.id);
    console.log('✅ Address re-enabled');

    // Update webhook URL
    await client.addresses.updateWebhookUrl(newAddress.id, 'https://new-webhook.example.com');
    console.log('✅ Webhook URL updated');

    // Get usage events
    const events = await client.usage.events(10);
    console.log(`📅 Recent ${events.length} usage events:`);
    events.forEach(event => {
      console.log(`  - ${event.eventType} at ${event.timestamp.toISOString()}`);
    });

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    
    // Handle specific error types
    if (error.name === 'AuthenticationException') {
      console.error('🔐 Authentication failed - check your API token');
    } else if (error.name === 'ValidationException') {
      console.error('📝 Validation errors:', error.getAllErrorMessages());
    } else if (error.name === 'RateLimitException') {
      console.error('🚦 Rate limited - retry after', error.getRetryAfterSeconds(), 'seconds');
    }
  }
}

// Run the example
main().catch(console.error);