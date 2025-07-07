const WebSocket = require('ws');

// Practical Demo: Code Review Swarm
class ReviewAgent {
  constructor(name, role, focus) {
    this.name = name;
    this.role = role;
    this.focus = focus;
    this.ws = null;
    this.authToken = null;
  }

  async connect() {
    return new Promise((resolve) => {
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
          this.authToken = msg.authToken;
          regWs.close();
          
          this.ws = new WebSocket('ws://localhost:8765');
          this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
              type: 'auth',
              agentName: this.name,
              authToken: this.authToken,
              role: this.role
            }));
          });
          
          this.ws.on('message', (authData) => {
            const authMsg = JSON.parse(authData.toString());
            if (authMsg.type === 'auth-success') {
              console.log(`✓ ${this.name} joined the review`);
              resolve();
            }
            this.handleMessage(authMsg);
          });
        }
      });
    });
  }

  handleMessage(msg) {
    if (msg.type === 'chat' && msg.sender !== this.name) {
      // React to others' messages based on role
      if (msg.text.includes('CODE_REVIEW_REQUEST')) {
        setTimeout(() => this.performReview(), 1000 + Math.random() * 2000);
      }
    }
  }

  performReview() {
    const reviews = {
      security: [
        "🔒 Security Review:",
        "- No input validation on user data",
        "- SQL injection vulnerability in query builder",
        "- Missing authentication checks on API endpoints",
        "- Recommend: Add input sanitization and parameterized queries"
      ],
      performance: [
        "⚡ Performance Review:",
        "- N+1 query problem in data fetching",
        "- No caching strategy implemented",
        "- Synchronous operations blocking event loop",
        "- Recommend: Implement data loader pattern and Redis caching"
      ],
      architecture: [
        "🏗️ Architecture Review:",
        "- Good separation of concerns",
        "- Consider extracting business logic to service layer",
        "- Database queries mixed with controller logic",
        "- Recommend: Implement repository pattern"
      ],
      testing: [
        "🧪 Testing Review:",
        "- No unit tests found",
        "- Missing integration tests for API",
        "- No test coverage metrics",
        "- Recommend: Add Jest tests with 80% coverage target"
      ]
    };

    const review = reviews[this.focus] || ["General review: Code needs improvement"];
    
    this.ws.send(JSON.stringify({
      type: 'message',
      text: review.join('\n')
    }));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// Research Swarm Demo
class ResearchAgent {
  constructor(name, specialty) {
    this.name = name;
    this.specialty = specialty;
    this.ws = null;
  }

  async connect() {
    return new Promise((resolve) => {
      const regWs = new WebSocket('ws://localhost:8765');
      
      regWs.on('open', () => {
        regWs.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: 'researcher'
        }));
      });

      regWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'register-success') {
          const authToken = msg.authToken;
          regWs.close();
          
          this.ws = new WebSocket('ws://localhost:8765');
          this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
              type: 'auth',
              agentName: this.name,
              authToken: authToken,
              role: 'researcher'
            }));
          });
          
          this.ws.on('message', (authData) => {
            const authMsg = JSON.parse(authData.toString());
            if (authMsg.type === 'auth-success') {
              console.log(`✓ ${this.name} joined research team`);
              resolve();
            }
            this.handleMessage(authMsg);
          });
        }
      });
    });
  }

  handleMessage(msg) {
    if (msg.type === 'chat' && msg.sender !== this.name) {
      if (msg.text.includes('RESEARCH_TOPIC:')) {
        const topic = msg.text.split('RESEARCH_TOPIC:')[1].trim();
        setTimeout(() => this.research(topic), 1000 + Math.random() * 2000);
      }
    }
  }

  research(topic) {
    const findings = {
      'market-analyst': `📊 Market Analysis for ${topic}:
- Current market size: $2.3B (2024)
- Growth rate: 23% CAGR
- Key players: Google, Microsoft, OpenAI
- Main use cases: Customer service, content generation`,

      'tech-researcher': `🔬 Technical Research on ${topic}:
- Latest advancement: GPT-4 and Claude 3
- Key challenges: Hallucination, context limits
- Emerging tech: RAG, fine-tuning, agents
- Performance: 50% improvement over 2022`,

      'risk-analyst': `⚠️ Risk Assessment for ${topic}:
- Regulatory risks: EU AI Act, US regulations pending
- Security concerns: Data privacy, prompt injection
- Ethical issues: Bias, misinformation
- Mitigation: Implement governance framework`,

      'user-researcher': `👥 User Research on ${topic}:
- Adoption rate: 35% of enterprises
- User satisfaction: 4.2/5 average
- Main complaints: Accuracy, integration
- Success stories: 60% productivity gains reported`
    };

    const finding = findings[this.specialty] || `Research on ${topic}: Needs further investigation`;
    
    this.ws.send(JSON.stringify({
      type: 'message',
      text: finding,
      evidence: {
        source: `${this.specialty} analysis`,
        confidence: 'high'
      }
    }));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runPracticalDemo() {
  console.log('\n🚀 Claude-Collab Practical Demo\n');
  console.log('Choose a demo:');
  console.log('1. Code Review Swarm - Multiple agents review code');
  console.log('2. Research Swarm - Agents research a topic\n');

  const demo = process.argv[2] || '1';

  if (demo === '1') {
    console.log('=== Code Review Swarm Demo ===\n');
    
    const reviewers = [
      new ReviewAgent('security-reviewer', 'reviewer', 'security'),
      new ReviewAgent('perf-optimizer', 'reviewer', 'performance'),
      new ReviewAgent('architect', 'reviewer', 'architecture'),
      new ReviewAgent('test-engineer', 'reviewer', 'testing')
    ];

    for (const reviewer of reviewers) {
      await reviewer.connect();
    }

    console.log('\n📝 Submitting code for review...\n');

    // Trigger the review
    setTimeout(() => {
      reviewers[0].ws.send(JSON.stringify({
        type: 'message',
        text: 'CODE_REVIEW_REQUEST: Please review the user authentication module'
      }));
    }, 1000);

    // Let reviews complete
    setTimeout(() => {
      console.log('\n✅ Code review complete! See above for multi-perspective analysis.\n');
      reviewers.forEach(r => r.close());
      process.exit(0);
    }, 8000);

  } else {
    console.log('=== Research Swarm Demo ===\n');
    
    const researchers = [
      new ResearchAgent('market-analyst', 'market-analyst'),
      new ResearchAgent('tech-researcher', 'tech-researcher'),
      new ResearchAgent('risk-analyst', 'risk-analyst'),
      new ResearchAgent('user-researcher', 'user-researcher')
    ];

    for (const researcher of researchers) {
      await researcher.connect();
    }

    console.log('\n🔍 Starting research on AI Agents...\n');

    setTimeout(() => {
      researchers[0].ws.send(JSON.stringify({
        type: 'message',
        text: 'RESEARCH_TOPIC: AI Agents in Enterprise Software'
      }));
    }, 1000);

    setTimeout(() => {
      console.log('\n✅ Research complete! Comprehensive analysis above.\n');
      researchers.forEach(r => r.close());
      process.exit(0);
    }, 8000);
  }
}

console.log('\nUsage: node practical-demo.js [1|2]');
console.log('1 = Code Review Swarm');
console.log('2 = Research Swarm\n');

runPracticalDemo().catch(console.error);