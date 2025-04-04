#!/usr/bin/env node

/**
 * Simple script to test the OpenRouter integration
 * 
 * Usage:
 *   node test-openrouter.js <worker-url> <meridian-secret-key>
 * 
 * Example:
 *   node test-openrouter.js https://meridian-production.alceos.workers.dev your-secret-key
 */

const [,, workerUrl, secretKey] = process.argv;

if (!workerUrl || !secretKey) {
  console.error('Usage: node test-openrouter.js <worker-url> <meridian-secret-key>');
  process.exit(1);
}

async function testOpenRouter() {
  try {
    console.log(`Testing OpenRouter integration at ${workerUrl}...`);
    
    const response = await fetch(`${workerUrl}/test-openrouter?token=${secretKey}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ OpenRouter integration is working correctly!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ OpenRouter integration test failed:');
      console.error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error testing OpenRouter integration:');
    console.error(error.message);
  }
}

testOpenRouter(); 