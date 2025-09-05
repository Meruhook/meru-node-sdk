#!/usr/bin/env node

/**
 * Webhook Receiver Server Example
 * 
 * A complete Express.js server that demonstrates:
 * - Receiving webhooks from Meru
 * - Signature verification for security
 * - Request logging and validation
 * - Proper response handling
 * - Error handling and recovery
 */

import express from 'express';
import crypto from 'crypto';
import { exampleConfig } from '../config/config.js';

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3000;

// Middleware to capture raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Store webhook events for demonstration
const webhookEvents: any[] = [];

// Webhook signature verification
function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Handle both 'sha256=' prefixed and non-prefixed signatures
    const providedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Main webhook endpoint
app.post('/webhook', (req, res) => {
  const startTime = Date.now();
  const signature = req.headers['x-meru-signature'] as string;
  const timestamp = req.headers['x-meru-timestamp'] as string;
  const eventType = req.headers['x-meru-event'] as string;
  
  console.log('\n🔔 Webhook Received');
  console.log('━'.repeat(50));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Event Type: ${eventType || 'unknown'}`);
  console.log(`Signature: ${signature ? '✅ Present' : '❌ Missing'}`);
  console.log(`Content-Type: ${req.headers['content-type']}`);
  console.log(`Content-Length: ${req.headers['content-length']} bytes`);
  
  try {
    // Verify webhook signature (if secret is configured)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValidSignature = verifyWebhookSignature(req.body, signature, webhookSecret);
      
      if (!isValidSignature) {
        console.log('❌ Invalid webhook signature');
        return res.status(401).json({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed'
        });
      }
      console.log('✅ Signature verified');
    } else if (webhookSecret) {
      console.log('⚠️  Signature missing but secret configured');
    } else {
      console.log('ℹ️  No signature verification (WEBHOOK_SECRET not set)');
    }

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch (parseError) {
      console.log('❌ Invalid JSON payload');
      return res.status(400).json({
        error: 'Invalid JSON',
        message: 'Webhook payload is not valid JSON'
      });
    }

    // Log the webhook data
    console.log('\n📄 Webhook Payload:');
    console.log(JSON.stringify(payload, null, 2));

    // Store the event for demonstration
    const webhookEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: eventType || 'unknown',
      payload: payload,
      headers: {
        signature: signature ? '***redacted***' : null,
        timestamp: timestamp,
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      },
      processingTime: Date.now() - startTime,
      verified: !!(webhookSecret && signature)
    };

    webhookEvents.push(webhookEvent);

    // Keep only last 100 events
    if (webhookEvents.length > 100) {
      webhookEvents.splice(0, webhookEvents.length - 100);
    }

    // Process different event types
    switch (eventType) {
      case 'email.received':
        console.log('📧 Processing email received event');
        handleEmailReceived(payload);
        break;
      case 'email.failed':
        console.log('❌ Processing email failed event');
        handleEmailFailed(payload);
        break;
      case 'address.created':
        console.log('🆕 Processing address created event');
        handleAddressCreated(payload);
        break;
      case 'address.deleted':
        console.log('🗑️ Processing address deleted event');
        handleAddressDeleted(payload);
        break;
      default:
        console.log(`🔍 Processing unknown event type: ${eventType}`);
        handleUnknownEvent(payload, eventType);
    }

    const processingTime = Date.now() - startTime;
    console.log(`⚡ Processing completed in ${processingTime}ms`);
    console.log('━'.repeat(50));

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      eventId: webhookEvent.id,
      processingTime: processingTime
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('💥 Webhook processing error:', error);
    console.log(`❌ Processing failed in ${processingTime}ms`);
    console.log('━'.repeat(50));

    res.status(500).json({
      error: 'Processing failed',
      message: error.message || 'Internal server error',
      processingTime: processingTime
    });
  }
});

// Event handlers
function handleEmailReceived(payload: any) {
  console.log(`  From: ${payload.from || 'unknown'}`);
  console.log(`  To: ${payload.to || 'unknown'}`);
  console.log(`  Subject: ${payload.subject || 'no subject'}`);
  console.log(`  Address ID: ${payload.addressId || 'unknown'}`);
  
  // Your email processing logic here
  // Example: Store in database, send notifications, etc.
}

function handleEmailFailed(payload: any) {
  console.log(`  Error: ${payload.error || 'unknown error'}`);
  console.log(`  Address ID: ${payload.addressId || 'unknown'}`);
  console.log(`  Retry Count: ${payload.retryCount || 0}`);
  
  // Your failure handling logic here
  // Example: Alert administrators, retry logic, etc.
}

function handleAddressCreated(payload: any) {
  console.log(`  Address: ${payload.address || 'unknown'}`);
  console.log(`  Address ID: ${payload.id || 'unknown'}`);
  console.log(`  Type: ${payload.isPermanent ? 'Permanent' : 'Temporary'}`);
  
  // Your address creation logic here
  // Example: Update local database, send welcome email, etc.
}

function handleAddressDeleted(payload: any) {
  console.log(`  Address ID: ${payload.id || 'unknown'}`);
  console.log(`  Address: ${payload.address || 'unknown'}`);
  
  // Your address deletion logic here
  // Example: Clean up local database, send notification, etc.
}

function handleUnknownEvent(payload: any, eventType: string) {
  console.log(`  Unknown event type: ${eventType}`);
  console.log(`  Payload keys: ${Object.keys(payload).join(', ')}`);
  
  // Log unknown events for investigation
  console.warn('⚠️  Received unknown event type - consider updating webhook handler');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    webhookEvents: webhookEvents.length
  });
});

// Webhook events dashboard
app.get('/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const events = webhookEvents.slice(-limit).reverse();
  
  res.json({
    events: events,
    total: webhookEvents.length,
    showing: events.length
  });
});

// Simple dashboard HTML
app.get('/', (req, res) => {
  const recentEvents = webhookEvents.slice(-10).reverse();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Meru Webhook Receiver</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 1rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .stat { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 6px; }
        .stat h3 { margin: 0; color: #007acc; }
        .event { border-left: 4px solid #007acc; padding: 1rem; margin: 0.5rem 0; background: #f8f9fa; }
        .timestamp { color: #666; font-size: 0.9em; }
        .payload { background: #2d3748; color: #f7fafc; padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 0.9em; }
        .refresh { background: #007acc; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>🔔 Meru Webhook Receiver</h1>
                <p>Real-time webhook monitoring and processing dashboard</p>
            </div>
        </div>
        
        <div class="card">
            <h2>📊 Statistics</h2>
            <div class="stats">
                <div class="stat">
                    <h3>${webhookEvents.length}</h3>
                    <p>Total Events</p>
                </div>
                <div class="stat">
                    <h3>${Math.round(process.uptime())}s</h3>
                    <p>Uptime</p>
                </div>
                <div class="stat">
                    <h3>${process.env.WEBHOOK_SECRET ? '✅' : '❌'}</h3>
                    <p>Signature Verification</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>🕒 Recent Events</h2>
            <button class="refresh" onclick="window.location.reload()">Refresh</button>
            ${recentEvents.length > 0 
              ? recentEvents.map(event => `
                <div class="event">
                    <h4>${event.eventType} <span class="timestamp">(${new Date(event.timestamp).toLocaleString()})</span></h4>
                    <p><strong>Event ID:</strong> ${event.id}</p>
                    <p><strong>Processing Time:</strong> ${event.processingTime}ms</p>
                    <p><strong>Verified:</strong> ${event.verified ? '✅ Yes' : '❌ No'}</p>
                    <details>
                        <summary>View Payload</summary>
                        <pre class="payload">${JSON.stringify(event.payload, null, 2)}</pre>
                    </details>
                </div>
              `).join('')
              : '<p>No webhook events received yet. Send a webhook to see it appear here!</p>'
            }
        </div>
        
        <div class="card">
            <h2>🛠️ Configuration</h2>
            <p><strong>Webhook URL:</strong> <code>http://localhost:${PORT}/webhook</code></p>
            <p><strong>Health Check:</strong> <code>http://localhost:${PORT}/health</code></p>
            <p><strong>Events API:</strong> <code>http://localhost:${PORT}/events</code></p>
            ${process.env.WEBHOOK_SECRET 
              ? '<p><strong>Security:</strong> ✅ Signature verification enabled</p>' 
              : '<p><strong>Security:</strong> ⚠️ Set WEBHOOK_SECRET environment variable to enable signature verification</p>'
            }
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => window.location.reload(), 30000);
    </script>
</body>
</html>`;

  res.send(html);
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('💥 Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'Unknown error occurred'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log('\n🚀 Meru Webhook Receiver Server Started');
  console.log('━'.repeat(50));
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 Events API: http://localhost:${PORT}/events`);
  console.log(`🔒 Signature Verification: ${process.env.WEBHOOK_SECRET ? 'ENABLED' : 'DISABLED'}`);
  console.log('━'.repeat(50));
  console.log('✅ Server is ready to receive webhooks!');
  console.log('💡 Tip: Set WEBHOOK_SECRET environment variable for signature verification');
  
  if (!process.env.WEBHOOK_SECRET) {
    console.log('⚠️  WARNING: Running without signature verification');
    console.log('   Set WEBHOOK_SECRET=your-secret-key for production use');
  }
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

export default app;