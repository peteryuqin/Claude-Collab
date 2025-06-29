#!/usr/bin/env node

/**
 * Claude-Collab Quick Start Demo
 * Shows real collaboration with anti-echo-chamber in action
 * 
 * Updated by Alex - Frontend/UX & Testing Lead
 */

const WebSocket = require('ws');
const chalk = require('chalk');
const { execSync } = require('child_process');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🎵 Claude-Collab Quick Start Demo 🎵            ║
║                                                        ║
║  Watch AI agents collaborate with diverse perspectives ║
║  and see echo chamber prevention in action!           ║
╚════════════════════════════════════════════════════════╝
`));

// Demo configuration
const SERVER_URL = 'ws://localhost:8765';
const AGENTS = [
  { name: 'Alice', role: 'architect', perspective: 'visionary' },
  { name: 'Bob', role: 'coder', perspective: 'pragmatist' },
  { name: 'Charlie', role: 'reviewer', perspective: 'skeptic' }
];

class DemoAgent {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.perspective = config.perspective;
    this.ws = null;
    this.authToken = null;
    this.agentId = null;
    this.messageQueue = [];
  }

  async register() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`\n📝 Registering ${this.name}...`));
      
      const ws = new WebSocket(SERVER_URL);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: this.role
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register-success') {
          this.authToken = message.authToken;
          this.agentId = message.agentId;
          console.log(chalk.green(`✓ ${this.name} registered (ID: ${this.agentId.slice(0, 8)}...)`));
          ws.close();
          resolve();
        } else if (message.type === 'register-failed') {
          if (message.reason === 'name-taken') {
            console.log(chalk.gray(`ℹ ${this.name} already registered, will use existing identity`));
            ws.close();
            resolve();
          } else {
            reject(new Error(message.reason));
          }
        }
      });
      
      ws.on('error', reject);
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`🔌 ${this.name} connecting...`));
      
      this.ws = new WebSocket(SERVER_URL);
      
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          type: 'auth',
          agentName: this.name,
          authToken: this.authToken,
          role: this.role,
          perspective: this.perspective,
          clientVersion: '3.2.3'
        }));
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth-success') {
          console.log(chalk.green(`✅ ${this.name} connected (${this.role}, ${this.perspective})`));
          resolve();
          
          // Process queued messages
          this.messageQueue.forEach(msg => this.say(msg));
          this.messageQueue = [];
        } else if (message.type === 'chat') {
          if (message.displayName !== this.name) {
            console.log(chalk.cyan(`\n💬 ${message.displayName}: "${message.text}"`));
          }
        } else if (message.type === 'diversity-intervention') {
          console.log(chalk.red(`\n❌ ${this.name} - Diversity Intervention!`));
          console.log(chalk.yellow(`   Reason: ${message.reason}`));
          console.log(chalk.yellow(`   Required: ${message.requiredAction}`));
          
          // Auto-revise message
          if (message.requiredAction.includes('disagree')) {
            setTimeout(() => this.disagree(), 2000);
          } else if (message.requiredAction.includes('evidence')) {
            setTimeout(() => this.provideEvidence(), 2000);
          }
        }
      });
      
      this.ws.on('error', reject);
      this.ws.on('close', () => {
        console.log(chalk.gray(`${this.name} disconnected`));
      });
    });
  }

  say(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(chalk.blue(`\n💬 ${this.name}: "${text}"`));
      this.ws.send(JSON.stringify({
        type: 'message',
        text
      }));
    } else {
      this.messageQueue.push(text);
    }
  }

  disagree() {
    const disagreements = [
      "Actually, I have a different perspective on this...",
      "I see your point, but have we considered the downsides?",
      "That might work, but here's an alternative approach...",
      "I'm skeptical about that. What about..."
    ];
    this.say(disagreements[Math.floor(Math.random() * disagreements.length)]);
  }

  provideEvidence() {
    const evidence = [
      "According to the documentation, we should consider...",
      "Based on performance benchmarks, this approach shows...",
      "Research indicates that this pattern can lead to...",
      "In my experience with similar systems..."
    ];
    this.say(evidence[Math.floor(Math.random() * evidence.length)]);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Main demo flow
async function runDemo() {
  try {
    // Check if server is running
    console.log(chalk.yellow('\n🔍 Checking server status...'));
    
    try {
      const testWs = new WebSocket(SERVER_URL);
      await new Promise((resolve, reject) => {
        testWs.on('open', () => {
          testWs.close();
          resolve();
        });
        testWs.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 2000);
      });
    } catch (error) {
      console.log(chalk.red('❌ Server not running!'));
      console.log(chalk.yellow('💡 Starting server for you...'));
      
      // Start server in background
      const serverProcess = require('child_process').spawn('cc', ['server'], {
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(chalk.green('✅ Server is running'));

    // Create and register agents
    const agents = AGENTS.map(config => new DemoAgent(config));
    
    for (const agent of agents) {
      await agent.register();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Connect all agents
    for (const agent of agents) {
      await agent.connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(chalk.cyan('\n🎬 Starting collaboration demo...\n'));

    // Scenario 1: Echo chamber attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    agents[0].say("I think we should use microservices for everything!");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    agents[1].say("Great idea! I completely agree!");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    agents[2].say("Yes, microservices are perfect for this!");
    
    // Wait for intervention
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scenario 2: Low evidence discussion
    await new Promise(resolve => setTimeout(resolve, 2000));
    agents[0].say("We should rewrite everything in a new language!");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    agents[1].say("Sounds good to me!");

    // Wait for interventions and responses
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log(chalk.green('\n\n✨ Demo Complete!'));
    console.log(chalk.yellow('\nKey Takeaways:'));
    console.log(chalk.gray('1. Claude-Collab prevents echo chambers automatically'));
    console.log(chalk.gray('2. Agents must provide evidence for claims'));
    console.log(chalk.gray('3. Diverse perspectives are enforced'));
    console.log(chalk.gray('4. Real-time interventions guide better discussions'));

    console.log(chalk.cyan('\n🚀 Try it yourself:'));
    console.log(chalk.gray('   cc server           # Start server'));
    console.log(chalk.gray('   cc watch            # Monitor in terminal'));
    console.log(chalk.gray('   cc join <name>      # Join as an agent'));

    // Cleanup
    agents.forEach(agent => agent.disconnect());
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n❌ Demo error:'), error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();