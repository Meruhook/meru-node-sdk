# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-09-05

### Added

- Initial release of the Meru Node.js SDK
- Full TypeScript support with comprehensive type definitions
- Core `MeruClient` class with configuration options
- Address management resource with CRUD operations
- Usage statistics and events resource
- Billing information resource
- Account overview resource
- HTTP client with automatic retry logic and exponential backoff
- Comprehensive error handling with custom exception classes:
  - `MeruException` (base exception)
  - `AuthenticationException`
  - `ValidationException`
  - `RateLimitException`
- Data transformation utilities for API response mapping
- Request builder classes for all API endpoints
- Comprehensive test suite using Bun test
- Support for both CommonJS and ESM modules
- Zero external dependencies (uses native fetch API)
- Built-in request timeout and retry configuration
- Debug logging support
- Complete documentation and examples

### API Coverage

#### Address Management
- `addresses.list()` - List all addresses
- `addresses.create()` - Create new address
- `addresses.get()` - Get specific address
- `addresses.update()` - Update address
- `addresses.delete()` - Delete address
- `addresses.enable()` - Enable address
- `addresses.disable()` - Disable address
- `addresses.updateWebhookUrl()` - Update webhook URL

#### Usage Statistics
- `usage.get()` - Get current month usage
- `usage.events()` - Get usage events (audit trail)
- `usage.period()` - Get usage for specific period
- `usage.forMonth()` - Get usage for specific month
- `usage.previousMonth()` - Get previous month usage

#### Billing Information
- `billing.get()` - Get billing summary
- `billing.breakdown()` - Get detailed cost breakdown
- `billing.isOverSpendingLimit()` - Check spending limit status
- `billing.getRemainingBudget()` - Get remaining budget
- `billing.getProjectedCost()` - Get projected monthly cost

#### Account Overview
- `account.overview()` - Get complete account overview
- `account.summary()` - Get account summary
- `account.isHealthy()` - Check account health
- `account.getActiveAddressCount()` - Get active address count
- `account.getCurrentMonthEmailCount()` - Get current month email count
- `account.getCurrentMonthCost()` - Get current month cost

### Developer Experience

- Full IDE autocomplete and IntelliSense support
- Type-safe request parameters and responses
- Comprehensive error handling with detailed error information
- Flexible configuration options
- Multiple import/export patterns supported
- Detailed documentation with code examples
- Migration guide from Laravel SDK