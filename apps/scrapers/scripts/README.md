# Scraper Scripts

This directory contains utility scripts for the scraper service.

## OpenRouter Test Script

The `test-openrouter.js` script tests if the OpenRouter integration is working correctly.

### Usage

```bash
# Using npm script
npm run test:openrouter <worker-url> <meridian-secret-key>

# Direct execution
node scripts/test-openrouter.js <worker-url> <meridian-secret-key>
```

### Example

```bash
npm run test:openrouter https://meridian-production.alceos.workers.dev your-secret-key
```

### What it does

1. Makes a request to the `/test-openrouter` endpoint
2. Verifies that OpenRouter can successfully process a simple prompt
3. Returns the result of the test

This is useful for verifying that the OpenRouter integration is working correctly before deploying the full workflow changes. 