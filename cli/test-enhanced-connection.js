#!/usr/bin/env node

/**
 * Test script for enhanced connection stability
 * Run this to test the new connection features
 * 
 * Created by Alex - Connection Expert
 */

const { enhancedJoin } = require('./enhanced-join');

// Test configuration
const testAgent = process.argv[2] || 'test-agent';
const VERSION = '3.2.3';

console.log('🧪 Testing Enhanced Connection Stability\n');
console.log('This test will demonstrate:');
console.log('  ✅ Automatic reconnection on connection loss');
console.log('  ✅ Message queuing during disconnection');
console.log('  ✅ Graceful error handling');
console.log('  ✅ Connection health monitoring\n');

// Run the enhanced join
enhancedJoin(testAgent, {
  server: 'ws://localhost:8765',
  role: 'tester',
  perspective: 'quality-focused'
}, VERSION);

console.log('\n💡 Try these tests:');
console.log('  1. Stop the server (Ctrl+C) - watch it try to reconnect');
console.log('  2. Start the server again - see automatic reconnection');
console.log('  3. Send messages while disconnected - they\'ll be queued');
console.log('  4. Use "status" command to check connection health\n');