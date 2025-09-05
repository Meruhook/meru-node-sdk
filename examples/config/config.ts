import { config } from 'dotenv';
import path from 'path';

// Load .env file from examples directory
config({ path: path.join(__dirname, '..', '.env') });

export interface ExampleConfig {
  apiToken: string;
  baseUrl: string;
  webhookUrl: string;
  debug: boolean;
  timeout: number;
  environment: 'development' | 'staging' | 'production';
}

function validateConfig(): ExampleConfig {
  const apiToken = process.env.MERU_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Error: MERU_API_TOKEN is required');
    console.error('Please copy .env.example to .env and set your API token');
    process.exit(1);
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ Error: WEBHOOK_URL is required');
    console.error('Please set your webhook URL in the .env file');
    process.exit(1);
  }

  const baseUrl = process.env.MERU_BASE_URL || 'https://api.meruhook.com';
  const debug = process.env.DEBUG === 'true';
  const timeout = parseInt(process.env.TIMEOUT || '30000', 10);
  const environment = (process.env.NODE_ENV as any) || 'development';

  // Validate webhook URL format
  try {
    new URL(webhookUrl);
  } catch {
    console.error('❌ Error: WEBHOOK_URL must be a valid URL');
    process.exit(1);
  }

  return {
    apiToken,
    baseUrl,
    webhookUrl,
    debug,
    timeout,
    environment,
  };
}

export const exampleConfig = validateConfig();

export function createMeruConfig() {
  return {
    apiToken: exampleConfig.apiToken,
    baseUrl: exampleConfig.baseUrl,
    timeout: exampleConfig.timeout,
    debug: exampleConfig.debug,
  };
}