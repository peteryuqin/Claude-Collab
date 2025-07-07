const WebSocket = require('ws');

// Demo: Claude-Collab Swarm with Anti-Echo Chamber
class DemoAgent {
  constructor(name, role, perspective) {
    this.name = name;
    this.role = role;
    this.perspective = perspective;
    this.ws = null;
    this.authToken = null;
    this.agentId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:8765');
      
      this.ws.on('open', () => {
        console.log(`${this.name} connected`);
        // First register
        this.ws.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: this.role,
          forceNew: true
        }));
      });

      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'register-success') {
          this.authToken = msg.authToken;
          this.agentId = msg.agentId;
          console.log(`✓ ${this.name} registered (${msg.agentId.slice(-8)})`);
          
          // Now authenticate
          this.ws.close();
          this.authenticate(resolve);
        } else if (msg.type === 'auth-success') {
          console.log(`✓ ${this.name} authenticated`);
          resolve();
        } else if (msg.type === 'diversity-intervention') {
          console.log(`❌ ${this.name} blocked: ${msg.reason}`);
          console.log(`   Required: ${msg.requiredAction}`);
          this.handleIntervention(msg);
        } else if (msg.type === 'chat') {
          console.log(`💬 ${msg.sender}: ${msg.text}`);
        }
      });

      this.ws.on('error', reject);
    });
  }

  authenticate(callback) {
    this.ws = new WebSocket('ws://localhost:8765');
    
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({
        type: 'auth',
        agentName: this.name,
        authToken: this.authToken,
        role: this.role,
        perspective: this.perspective
      }));
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'auth-success') {
        callback();
      }
      this.handleMessage(msg);
    });
  }

  handleMessage(msg) {
    if (msg.type === 'diversity-intervention') {
      console.log(`\n🚨 ${this.name} - Diversity Intervention:`);
      console.log(`   Reason: ${msg.reason}`);
      console.log(`   Action: ${msg.requiredAction}`);
      this.handleIntervention(msg);
    } else if (msg.type === 'chat') {
      if (msg.sender !== this.name) {
        console.log(`\n💬 ${msg.sender}: ${msg.text}`);
      }
    }
  }

  handleIntervention(intervention) {
    // Respond to diversity intervention
    setTimeout(() => {
      if (intervention.requiredAction === 'provide-evidence') {
        this.sendMessage(
          `You're right, I should provide evidence. Here's data supporting my view...`,
          { source: 'Research Study XYZ', data: 'Statistical analysis shows...' }
        );
      } else if (intervention.requiredAction === 'consider-alternative') {
        this.sendMessage(
          `Good point. Let me consider the alternative perspective: ${intervention.suggestions[0]}`
        );
      }
    }, 1000);
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

  startDiscussion(topic) {
    setTimeout(() => {
      const perspectives = {
        optimist: `I believe ${topic} will revolutionize our industry!`,
        skeptic: `We should be cautious about ${topic}. There are risks.`,
        pragmatist: `Let's analyze ${topic} objectively with data.`,
        innovator: `${topic} opens new possibilities we haven't explored!`
      };
      
      const message = perspectives[this.perspective] || `My thoughts on ${topic}...`;
      this.sendMessage(message);
    }, Math.random() * 3000 + 1000);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Create demo swarm
async function runDemo() {
  console.log('\n🎭 Claude-Collab Anti-Echo Chamber Demo\n');
  
  const agents = [
    new DemoAgent('optimist-ai', 'analyst', 'optimist'),
    new DemoAgent('skeptic-ai', 'researcher', 'skeptic'),
    new DemoAgent('pragmatist-ai', 'coder', 'pragmatist'),
    new DemoAgent('innovator-ai', 'designer', 'innovator')
  ];

  // Connect all agents
  for (const agent of agents) {
    await agent.connect();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🚀 Starting discussion on "AI in Software Development"\n');

  // Start the discussion
  agents.forEach(agent => {
    agent.startDiscussion('AI in Software Development');
  });

  // Let the discussion run for 30 seconds
  setTimeout(() => {
    console.log('\n✅ Demo complete! Notice how:');
    console.log('- Agents were forced to provide evidence');
    console.log('- Echo chamber behavior was prevented');
    console.log('- Diverse perspectives were maintained\n');
    
    agents.forEach(agent => agent.close());
    process.exit(0);
  }, 30000);
}

// Run the demo
runDemo().catch(console.error);