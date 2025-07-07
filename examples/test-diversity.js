const WebSocket = require('ws');

class TestAgent {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.ws = null;
  }

  async connect() {
    return new Promise((resolve) => {
      // Register first
      const regWs = new WebSocket('ws://localhost:8765');
      
      regWs.on('open', () => {
        regWs.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: this.role
        }));
      });

      regWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'register-success') {
          const authToken = msg.authToken;
          regWs.close();
          
          // Now authenticate
          this.ws = new WebSocket('ws://localhost:8765');
          
          this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
              type: 'auth',
              agentName: this.name,
              authToken: authToken,
              role: this.role
            }));
          });
          
          this.ws.on('message', (authData) => {
            const authMsg = JSON.parse(authData.toString());
            
            if (authMsg.type === 'auth-success') {
              console.log(`✓ ${this.name} connected`);
              resolve();
            } else if (authMsg.type === 'diversity-intervention') {
              console.log(`\n🚨 ${this.name} - DIVERSITY INTERVENTION:`);
              console.log(`   Reason: ${authMsg.reason}`);
              console.log(`   Required: ${authMsg.requiredAction}`);
              if (authMsg.suggestions) {
                console.log(`   Suggestions: ${authMsg.suggestions.join(', ')}`);
              }
            } else if (authMsg.type === 'chat') {
              if (authMsg.sender !== this.name) {
                console.log(`💬 ${authMsg.sender}: ${authMsg.text}`);
              }
            }
          });
        }
      });
    });
  }

  sendMessage(text, evidence = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message',
        text: text,
        evidence: evidence
      }));
    }
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function testDiversity() {
  console.log('\n🧪 Testing Claude-Collab Diversity System...\n');

  const alice = new TestAgent('diversity-alice', 'researcher');
  const bob = new TestAgent('diversity-bob', 'analyst');
  const charlie = new TestAgent('diversity-charlie', 'coder');

  await alice.connect();
  await bob.connect();
  await charlie.connect();

  console.log('\n--- Test 1: Echo Chamber (everyone agrees) ---');
  
  setTimeout(() => {
    alice.sendMessage('We should definitely use microservices!');
  }, 1000);

  setTimeout(() => {
    bob.sendMessage('I completely agree with Alice!');
  }, 2000);

  setTimeout(() => {
    charlie.sendMessage('Yes, I agree with both of you!');
  }, 3000);

  console.log('\n--- Test 2: Unsupported Claims ---');
  
  setTimeout(() => {
    alice.sendMessage('This will improve performance by 500%!');
  }, 5000);

  console.log('\n--- Test 3: Evidence-Based Discussion ---');
  
  setTimeout(() => {
    bob.sendMessage(
      'Actually, our tests show 20% slower response times with microservices',
      { source: 'Benchmark Report', data: '120ms vs 144ms average' }
    );
  }, 7000);

  // Clean up
  setTimeout(() => {
    console.log('\n✅ Test complete!\n');
    alice.close();
    bob.close();
    charlie.close();
    process.exit(0);
  }, 10000);
}

testDiversity().catch(console.error);