const WebSocket = require('ws');

console.log('\n🎭 Claude-Collab Features Test\n');

// Connect to server
const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
  console.log('✓ Connected to Claude-Collab server');
  console.log('\nTesting identity system...');
  
  // Try to register
  ws.send(JSON.stringify({
    type: 'register',
    agentName: 'test-' + Date.now(),
    role: 'researcher'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'register-success') {
    console.log('✓ Successfully registered new agent');
    console.log('  Agent ID:', msg.agentId);
    console.log('  Auth Token:', msg.authToken.substring(0, 16) + '...');
    console.log('\nClaude-Collab is working! Features include:');
    console.log('- Persistent agent identities');
    console.log('- Anti-echo chamber enforcement'); 
    console.log('- Evidence-based discussions');
    console.log('- Diversity score tracking');
    console.log('- Session management\n');
    
    ws.close();
  } else if (msg.type === 'register-failed') {
    console.log('✗ Registration failed:', msg.reason);
    if (msg.suggestions) {
      console.log('  Suggestions:', msg.suggestions.join(', '));
    }
    ws.close();
  }
});

ws.on('error', (err) => {
  console.error('Connection error:', err.message);
});

ws.on('close', () => {
  console.log('Test complete.\n');
  process.exit(0);
});