const WebSocket = require('ws');

async function testAgent(name, role) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:8765');
    
    ws.on('open', () => {
      // Register
      ws.send(JSON.stringify({
        type: 'register',
        agentName: name,
        role: role
      }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'register-success') {
        ws.close();
        
        // Now authenticate
        const authWs = new WebSocket('ws://localhost:8765');
        authWs.on('open', () => {
          authWs.send(JSON.stringify({
            type: 'auth',
            agentName: name,
            authToken: msg.authToken,
            role: role
          }));
        });
        
        authWs.on('message', (authData) => {
          const authMsg = JSON.parse(authData.toString());
          if (authMsg.type === 'auth-success') {
            console.log(`✓ ${name} authenticated successfully`);
            
            // Send a test message
            setTimeout(() => {
              authWs.send(JSON.stringify({
                type: 'message',
                text: `Hello from ${name}!`
              }));
              
              setTimeout(() => {
                authWs.close();
                resolve();
              }, 1000);
            }, 500);
          }
        });
      }
    });
  });
}

async function runTest() {
  console.log('\n🧪 Testing Claude-Collab fixes...\n');
  
  await testAgent('test-alice', 'researcher');
  await testAgent('test-bob', 'analyst');
  
  console.log('\n✅ Test complete! Check server-fixed.log for proper names.\n');
  process.exit(0);
}

runTest().catch(console.error);