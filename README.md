# Meru Node.js SDK

A comprehensive Node.js/TypeScript SDK for the Meru email webhook service API. This SDK provides a fluent, type-safe interface for managing temporary and permanent email addresses that forward incoming emails to configured webhook URLs.

## Features

- 🚀 **Type-safe**: Full TypeScript support with strict typing
- 🔄 **Auto-retry**: Configurable retry logic with exponential backoff
- ⚡ **Modern**: Built with latest Node.js features using native fetch
- 🛡️ **Error handling**: Comprehensive error handling with custom exceptions
- 📦 **Zero dependencies**: No external HTTP libraries required
- 🧪 **Well tested**: Comprehensive test suite with Bun test
- 📖 **Great DX**: Excellent developer experience with IDE autocompletion

## Installation

```bash
# Using npm
npm install @meruhook/node-sdk

# Using yarn
yarn add @meruhook/node-sdk

# Using pnpm
pnpm add @meruhook/node-sdk

# Using bun
bun add @meruhook/node-sdk
```

## Quick Start

```typescript
import { MeruClient } from '@meruhook/node-sdk';

// Initialize the client
const client = new MeruClient({
  apiToken: 'your-api-token-here',
  baseUrl: 'https://api.meruhook.com', // optional
  timeout: 30000, // optional, 30 seconds default
  debug: false, // optional, enables request logging
});

// Create a new email address
const address = await client.addresses.create({
  webhookUrl: 'https://your-app.com/webhook',
  isPermanent: true,
});

console.log(`Created address: ${address.address}`);

// List all your addresses
const addresses = await client.addresses.list();
console.log(`You have ${addresses.length} addresses`);

// Get usage statistics
const usage = await client.usage.get();
console.log(`Emails received this month: ${usage.totalEmails}`);

// Get billing information
const billing = await client.billing.get();
console.log(`Current month cost: $${billing.currentCost}`);
```

## Configuration

### Environment Variables

You can use environment variables to configure the client:

```bash
MERU_API_TOKEN=your-api-token-here
MERU_BASE_URL=https://api.meruhook.com
MERU_TIMEOUT=30000
MERU_DEBUG=false
```

### Configuration Object

```typescript
const client = new MeruClient({
  apiToken: process.env.MERU_API_TOKEN!,
  baseUrl: process.env.MERU_BASE_URL,
  timeout: 30000,
  retry: {
    times: 3,           // Number of retry attempts
    delay: 100,         // Initial delay in milliseconds
    maxDelay: 5000,     // Maximum delay between retries
    backoffMultiplier: 2, // Exponential backoff multiplier
  },
  debug: false,
});
```

## API Reference

### Address Management

```typescript
// Create a new address
const address = await client.addresses.create({
  webhookUrl: 'https://your-app.com/webhook',
  isPermanent: true, // false for temporary addresses
});

// Alternative syntax
const address = await client.addresses.create('https://your-app.com/webhook', true);

// List all addresses
const addresses = await client.addresses.list();

// Get specific address
const address = await client.addresses.get('addr_123');

// Update address
const updated = await client.addresses.update('addr_123', {
  webhookUrl: 'https://new-webhook.com',
  isEnabled: false,
});

// Delete address
await client.addresses.delete('addr_123');

// Convenience methods
await client.addresses.enable('addr_123');
await client.addresses.disable('addr_123');
await client.addresses.updateWebhookUrl('addr_123', 'https://new-webhook.com');
```

### Usage Statistics

```typescript
// Get current month usage
const usage = await client.usage.get();
console.log({
  totalEmails: usage.totalEmails,
  successfulEmails: usage.successfulEmails,
  failedWebhooks: usage.failedWebhooks,
  successRate: usage.successRate,
});

// Get usage events (audit trail)
const events = await client.usage.events(100); // limit: 100

// Get usage for specific period
const januaryUsage = await client.usage.period('2024-01');

// Convenience methods
const lastMonth = await client.usage.previousMonth();
const specificMonth = await client.usage.forMonth(2024, 1);
```

### Billing Information

```typescript
// Get billing summary
const billing = await client.billing.get();
console.log({
  currentCost: billing.currentCost,
  projectedCost: billing.projectedCost,
  hasSpendingLimit: billing.spendingLimit.hasLimit,
  isOverLimit: billing.spendingLimit.isOverLimit,
});

// Get detailed breakdown
const breakdown = await client.billing.breakdown();

// Convenience methods
const isOverLimit = await client.billing.isOverSpendingLimit();
const remaining = await client.billing.getRemainingBudget();
const projected = await client.billing.getProjectedCost();
```

### Account Overview

```typescript
// Get complete account overview
const overview = await client.account.overview();
console.log({
  addresses: overview.addresses,
  usage: overview.usage,
  billing: overview.billing,
  summary: overview.summary,
});

// Get quick summary
const summary = await client.account.summary();

// Convenience methods
const isHealthy = await client.account.isHealthy();
const activeCount = await client.account.getActiveAddressCount();
const monthlyEmails = await client.account.getCurrentMonthEmailCount();
const monthlyCost = await client.account.getCurrentMonthCost();
```

## Error Handling

The SDK provides comprehensive error handling with specific exception types:

```typescript
import {
  MeruException,
  AuthenticationException,
  ValidationException,
  RateLimitException,
} from '@meruhook/node-sdk';

try {
  const address = await client.addresses.create({
    webhookUrl: 'invalid-url',
    isPermanent: true,
  });
} catch (error) {
  if (error instanceof AuthenticationException) {
    console.error('Authentication failed:', error.message);
    // Handle authentication error
  } else if (error instanceof ValidationException) {
    console.error('Validation errors:', error.getAllErrorMessages());
    // Handle validation errors
    const emailErrors = error.getFieldErrors('email');
  } else if (error instanceof RateLimitException) {
    const retryAfter = error.getRetryAfterSeconds();
    console.error(`Rate limited. Retry after ${retryAfter} seconds`);
    // Handle rate limiting
  } else if (error instanceof MeruException) {
    console.error('API error:', error.getErrorDetails());
    // Handle other API errors
  } else {
    console.error('Unexpected error:', error);
    // Handle unexpected errors
  }
}
```

## TypeScript Support

The SDK is built with TypeScript and provides comprehensive type definitions:

```typescript
import type {
  Address,
  Usage,
  Billing,
  AccountOverview,
  CreateAddressRequest,
  UpdateAddressRequest,
  MeruClientConfig,
} from '@meruhook/node-sdk';

// All API responses are fully typed
const address: Address = await client.addresses.get('addr_123');
const usage: Usage = await client.usage.get();

// Request parameters are type-safe
const params: CreateAddressRequest = {
  webhookUrl: 'https://example.com/webhook',
  isPermanent: true,
};

const newAddress = await client.addresses.create(params);
```

## Security

The Meru Node.js SDK is built with security as a top priority. It includes comprehensive security measures to protect against common vulnerabilities.

### Security Features

#### 🔒 **Input Validation & Sanitization**
- All webhook URLs are validated to ensure they use HTTPS in production
- UUID format validation for all address IDs
- Header injection prevention through strict character filtering
- JSON bomb protection with configurable size and depth limits
- Private network and localhost blocking to prevent SSRF attacks

#### 🛡️ **Token Security**
- API tokens are automatically masked in debug logs
- Sensitive headers are never logged
- Authorization information is redacted from URLs in logs
- Configurable token redaction for enhanced privacy

#### ⚡ **Rate Limiting & Performance**
- Intelligent rate limiting with automatic Retry-After header respect
- Exponential backoff with jitter for optimal retry behavior
- Request queuing during rate limit periods
- Configurable response size limits (default: 10MB)

#### 🌐 **URL Security**
- HTTPS enforcement for all production webhooks
- URL shortener detection and blocking
- Metadata service hostname blocking (AWS, GCP, Azure)
- Query parameter validation and sanitization

### Security Configuration

```typescript
const client = new MeruClient({
  apiToken: process.env.MERU_API_TOKEN!,
  baseUrl: 'https://api.meruhook.com',
  maxResponseSize: 10 * 1024 * 1024, // 10MB limit
  timeout: 30000,
  debug: false, // Enables secure logging when true
});
```

### Security Best Practices

#### 🔑 **API Token Management**
```typescript
// ✅ Good: Use environment variables
const client = new MeruClient({
  apiToken: process.env.MERU_API_TOKEN!
});

// ❌ Bad: Hard-code tokens
const client = new MeruClient({
  apiToken: 'sk_live_abc123...'
});
```

#### 🌍 **Webhook URL Validation**
```typescript
// ✅ Good: HTTPS URLs for production
await client.addresses.create({
  webhookUrl: 'https://your-app.com/webhook',
  isPermanent: true
});

// ❌ Bad: HTTP URLs in production
await client.addresses.create({
  webhookUrl: 'http://your-app.com/webhook', // Will be rejected
  isPermanent: true
});
```

#### 🔒 **Environment-Specific Configuration**
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const client = new MeruClient({
  apiToken: process.env.MERU_API_TOKEN!,
  baseUrl: isDevelopment 
    ? 'http://localhost:8080' // OK in development
    : 'https://api.meruhook.com', // HTTPS enforced in production
  debug: isDevelopment // Only enable debug logging in development
});
```

#### 🛡️ **Webhook Verification**
```typescript
// Always verify webhook authenticity in production
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Security Headers

When deploying your application, ensure these security headers are set:

```nginx
# nginx configuration
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'";
```

### Error Handling & Security

The SDK provides specific exception types that help maintain security:

```typescript
import {
  AuthenticationException,
  ValidationException,
  RateLimitException,
} from '@meruhook/node-sdk';

try {
  await client.addresses.create({
    webhookUrl: 'https://your-app.com/webhook'
  });
} catch (error) {
  if (error instanceof ValidationException) {
    // Handle validation errors - these indicate potential security issues
    console.error('Security validation failed:', error.getAllErrorMessages());
  } else if (error instanceof RateLimitException) {
    // Handle rate limiting gracefully
    const retryAfter = error.getRetryAfterSeconds();
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

### Security Audit

The SDK includes built-in security auditing tools:

```bash
# Run security audit
bun run security:audit

# Check for security issues in code
bun run lint:security

# Run comprehensive security checks
bun run precommit
```

### Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email security details to: security@meruhook.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)

We will respond within 24 hours and provide regular updates on the resolution progress.

## Development

### Prerequisites

- Node.js 18+ or Bun 1.0+
- TypeScript 5.0+

### Setup

```bash
# Clone the repository
git clone https://github.com/meruhook/node-sdk.git
cd node-sdk

# Install dependencies
bun install

# Run type checking
bun run type-check

# Run tests
bun test

# Build the project
bun run build
```

### Testing

The SDK includes comprehensive tests using Bun test:

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/address-resource.test.ts
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`bun test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.meruhook.com)
- 🐛 [Issue Tracker](https://github.com/meruhook/node-sdk/issues)
- 💬 [Discussions](https://github.com/meruhook/node-sdk/discussions)
- 📧 [Email Support](mailto:support@meruhook.com)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

---

Built with ❤️ by the Meru team.