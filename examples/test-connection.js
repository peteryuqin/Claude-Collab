#!/usr/bin/env node

// Test WebSocket connection to Claude-Collab server
const WebSocket = require('ws');

console.log('Testing connection to ws://localhost:8765...');

const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  
  // Try to register
  ws.send(JSON.stringify({
    type: 'register',
    agentName: 'test-agent',
    role: 'general'
  }));
});

ws.on('message', (data) => {
  console.log('📨 Received:', JSON.parse(data.toString()));
});

ws.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('Full error:', error);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏱️ Timeout - closing connection');
  ws.close();
}, 5000);