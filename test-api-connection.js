#!/usr/bin/env node

// Test script to verify API endpoints are accessible

const apiEndpoints = [
  { url: '/api/chat', method: 'GET' },
  { url: '/api/chat/orchestrate', method: 'POST', body: { message: 'test' } },
  { url: '/api/health', method: 'GET' }
];

async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.url}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (endpoint.body) {
    options.body = JSON.stringify(endpoint.body);
  }
  
  try {
    console.log(`Testing ${endpoint.method} ${url}...`);
    const response = await fetch(url, options);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 200));
    }
    
    return response.status;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  
  console.log(`\n🔍 Testing API endpoints at: ${baseUrl}\n`);
  console.log('Environment variables:');
  console.log(`  NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || '(not set)'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
  
  for (const endpoint of apiEndpoints) {
    await testEndpoint(baseUrl, endpoint);
    console.log('');
  }
  
  console.log('\n✅ API connection test complete!\n');
  console.log('If you see 404 errors, make sure:');
  console.log('1. The Next.js server is running (npm run dev)');
  console.log('2. Environment variables are set correctly');
  console.log('3. The API routes exist in /app/api/');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}