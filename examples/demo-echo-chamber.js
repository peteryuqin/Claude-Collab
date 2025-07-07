const WebSocket = require('ws');

// Demo: Show anti-echo chamber in action
async function createAgent(name, role) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8765');
    let authToken = null;
    
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
        authToken = msg.authToken;
        ws.close();
        
        // Now authenticate
        const authWs = new WebSocket('ws://localhost:8765');
        authWs.on('open', () => {
          authWs.send(JSON.stringify({
            type: 'auth',
            agentName: name,
            authToken: authToken,
            role: role
          }));
        });
        
        authWs.on('message', (data) => {
          const authMsg = JSON.parse(data.toString());
          if (authMsg.type === 'auth-success') {
            console.log(`✓ ${name} connected`);
            resolve(authWs);
          }
        });
      } else if (msg.type === 'register-failed') {
        // Try with a unique name
        ws.send(JSON.stringify({
          type: 'register',
          agentName: name + '-' + Date.now(),
          role: role
        }));
      }
    });

    ws.on('error', reject);
  });
}

async function runEchoChamberDemo() {
  console.log('\n🎭 Claude-Collab Anti-Echo Chamber Demo\n');
  console.log('This demo shows how the system prevents echo chambers:\n');

  // Create agents
  const agent1 = await createAgent('alice-demo', 'researcher');
  const agent2 = await createAgent('bob-demo', 'analyst');
  const agent3 = await createAgent('charlie-demo', 'coder');

  const agents = [
    { ws: agent1, name: 'Alice' },
    { ws: agent2, name: 'Bob' },
    { ws: agent3, name: 'Charlie' }
  ];

  // Set up message handlers
  agents.forEach(({ ws, name }) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'chat' && msg.sender !== name) {
        console.log(`\n💬 ${msg.sender}: ${msg.text}`);
      } else if (msg.type === 'diversity-intervention') {
        console.log(`\n🚨 ${name} BLOCKED by diversity system!`);
        console.log(`   Reason: ${msg.reason}`);
        console.log(`   Required: ${msg.requiredAction}`);
        if (msg.suggestions) {
          console.log(`   Suggestions: ${msg.suggestions.join(', ')}`);
        }
      }
    });
  });

  // Scenario 1: Everyone agrees (should trigger intervention)
  console.log('\n--- Scenario 1: Echo Chamber Attempt ---');
  
  setTimeout(() => {
    agent1.send(JSON.stringify({
      type: 'message',
      text: 'I think we should use microservices for everything!'
    }));
  }, 1000);

  setTimeout(() => {
    agent2.send(JSON.stringify({
      type: 'message',
      text: 'I totally agree! Microservices are always the best choice!'
    }));
  }, 2000);

  setTimeout(() => {
    agent3.send(JSON.stringify({
      type: 'message',
      text: 'Yes, I completely agree with both of you!'
    }));
  }, 3000);

  // Scenario 2: Provide evidence
  setTimeout(() => {
    console.log('\n--- Scenario 2: Claims Without Evidence ---');
    agent1.send(JSON.stringify({
      type: 'message',
      text: 'Our performance will improve by 500% with this approach!'
    }));
  }, 5000);

  // Scenario 3: Better discussion with evidence
  setTimeout(() => {
    console.log('\n--- Scenario 3: Proper Discussion ---');
    agent2.send(JSON.stringify({
      type: 'message',
      text: 'Based on our benchmarks, microservices increased latency by 20ms',
      evidence: {
        source: 'Internal Performance Report Q3 2024',
        data: 'Average response time: 120ms (monolith) vs 140ms (microservices)'
      }
    }));
  }, 7000);

  setTimeout(() => {
    agent3.send(JSON.stringify({
      type: 'message',
      text: 'That\'s concerning. What about the scalability benefits?',
      evidence: {
        source: 'AWS Case Study',
        data: 'Horizontal scaling improved by 3x with microservices'
      }
    }));
  }, 8000);

  // End demo
  setTimeout(() => {
    console.log('\n\n✅ Demo complete!');
    console.log('\nKey takeaways:');
    console.log('- The system blocked echo chamber behavior');
    console.log('- Claims without evidence were challenged');
    console.log('- Diverse perspectives were enforced');
    console.log('- Evidence-based discussion was promoted\n');
    
    agents.forEach(({ ws }) => ws.close());
    process.exit(0);
  }, 10000);
}

runEchoChamberDemo().catch(console.error);