#!/usr/bin/env node

/**
 * Claude-Collab Swarm Demo
 * Multiple agents collaborate to build a complete website
 * 
 * Created by Alex - Frontend/UX & Testing Lead
 */

const WebSocket = require('ws');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🐝 Claude-Collab Swarm Demo 🐝                  ║
║                                                        ║
║  Watch a swarm of AI agents collaborate to build      ║
║  a complete website from scratch!                     ║
╚════════════════════════════════════════════════════════╝
`));

// Demo configuration
const SERVER_URL = 'ws://localhost:8765';
const PROJECT_DIR = path.join(__dirname, 'demo-website');

const SWARM_AGENTS = [
  {
    name: 'Architect',
    role: 'architect',
    perspective: 'system-designer',
    tasks: ['Design overall structure', 'Define component hierarchy', 'Plan data flow']
  },
  {
    name: 'Frontend-Dev',
    role: 'frontend',
    perspective: 'ui-developer',
    tasks: ['Create React components', 'Implement responsive design', 'Add interactivity']
  },
  {
    name: 'Backend-Dev',
    role: 'backend',
    perspective: 'api-developer', 
    tasks: ['Design REST API', 'Implement endpoints', 'Set up database schema']
  },
  {
    name: 'Designer',
    role: 'designer',
    perspective: 'visual-artist',
    tasks: ['Create color scheme', 'Design layouts', 'Ensure accessibility']
  },
  {
    name: 'Tester',
    role: 'tester',
    perspective: 'quality-assurance',
    tasks: ['Write test cases', 'Identify edge cases', 'Verify requirements']
  }
];

class SwarmAgent {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.perspective = config.perspective;
    this.tasks = config.tasks;
    this.ws = null;
    this.currentTaskIndex = 0;
    this.contributions = [];
  }

  async register() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`📝 Registering ${this.name}...`));
      
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
          console.log(chalk.green(`✓ ${this.name} joined the swarm`));
          ws.close();
          resolve();
        } else if (message.type === 'register-failed' && message.reason === 'name-taken') {
          console.log(chalk.gray(`ℹ ${this.name} already in swarm`));
          ws.close();
          resolve();
        }
      });
      
      ws.on('error', reject);
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`🔌 ${this.name} connecting to swarm...`));
      
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
          console.log(chalk.green(`✅ ${this.name} active in swarm`));
          resolve();
        } else if (message.type === 'chat' && message.displayName !== this.name) {
          this.handleSwarmMessage(message);
        } else if (message.type === 'diversity-intervention') {
          this.handleIntervention(message);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  handleSwarmMessage(message) {
    // React to other agents' messages
    if (message.text.toLowerCase().includes(this.role) || 
        message.text.toLowerCase().includes('everyone')) {
      setTimeout(() => this.respondToRequest(message), 1000 + Math.random() * 2000);
    }
  }

  handleIntervention(message) {
    console.log(chalk.red(`\n❌ ${this.name} - Intervention: ${message.reason}`));
    setTimeout(() => this.provideAlternative(), 2000);
  }

  async startWork() {
    if (this.currentTaskIndex >= this.tasks.length) return;
    
    const task = this.tasks[this.currentTaskIndex];
    this.announce(`Starting task: ${task}`);
    
    // Simulate work with progress updates
    setTimeout(() => {
      this.contributeWork(task);
      this.currentTaskIndex++;
      
      // Continue with next task
      if (this.currentTaskIndex < this.tasks.length) {
        setTimeout(() => this.startWork(), 3000 + Math.random() * 2000);
      }
    }, 2000 + Math.random() * 3000);
  }

  contributeWork(task) {
    const contributions = {
      'Design overall structure': {
        message: "I've designed a 3-tier architecture: React frontend, Node.js API, PostgreSQL database",
        artifact: 'architecture.md'
      },
      'Define component hierarchy': {
        message: "Component structure: App → Layout → [Header, MainContent, Footer] → [Navigation, Hero, Features, Contact]",
        artifact: 'components.json'
      },
      'Plan data flow': {
        message: "Using Redux for state management with async thunks for API calls",
        artifact: 'data-flow.md'
      },
      'Create React components': {
        message: "I've created the base components: Header, Hero, FeatureCard, and Footer with TypeScript",
        artifact: 'components/index.tsx'
      },
      'Implement responsive design': {
        message: "Added Tailwind CSS with mobile-first breakpoints and fluid typography",
        artifact: 'styles/responsive.css'
      },
      'Add interactivity': {
        message: "Implemented smooth scrolling, animations with Framer Motion, and form validation",
        artifact: 'hooks/useInteractions.ts'
      },
      'Design REST API': {
        message: "RESTful API design: /api/v1/users, /api/v1/products, /api/v1/orders with proper HTTP verbs",
        artifact: 'api/routes.js'
      },
      'Implement endpoints': {
        message: "Created Express endpoints with input validation, error handling, and rate limiting",
        artifact: 'api/controllers.js'
      },
      'Set up database schema': {
        message: "PostgreSQL schema with users, products, orders tables and proper relationships",
        artifact: 'database/schema.sql'
      },
      'Create color scheme': {
        message: "Color palette: Primary #3B82F6, Secondary #10B981, Accent #F59E0B with AA accessibility",
        artifact: 'design/colors.json'
      },
      'Design layouts': {
        message: "Created Figma mockups for desktop, tablet, and mobile with 8px grid system",
        artifact: 'design/mockups.fig'
      },
      'Ensure accessibility': {
        message: "Added ARIA labels, keyboard navigation, and tested with screen readers - WCAG 2.1 AA compliant",
        artifact: 'accessibility-report.md'
      },
      'Write test cases': {
        message: "Created 45 unit tests and 12 integration tests with Jest and React Testing Library",
        artifact: 'tests/test-suite.js'
      },
      'Identify edge cases': {
        message: "Found edge cases: empty states, network errors, concurrent updates, and large datasets",
        artifact: 'tests/edge-cases.md'
      },
      'Verify requirements': {
        message: "All user stories verified ✓ Performance metrics met ✓ Security requirements passed ✓",
        artifact: 'qa/verification-report.md'
      }
    };

    const contribution = contributions[task] || {
      message: `Completed: ${task}`,
      artifact: `${this.role}/${task.toLowerCase().replace(/\s+/g, '-')}.md`
    };

    this.announce(contribution.message);
    this.contributions.push({
      task,
      artifact: contribution.artifact,
      timestamp: new Date()
    });
  }

  respondToRequest(message) {
    const responses = {
      architect: [
        "Based on the architecture, we should use microservices for better scalability",
        "I recommend implementing a caching layer with Redis for performance",
        "Let's ensure all components follow the single responsibility principle"
      ],
      frontend: [
        "I'll make sure all components are fully responsive and accessible",
        "Using React hooks for state management to keep things clean",
        "Implementing lazy loading for better performance"
      ],
      backend: [
        "I'll add proper authentication with JWT tokens and refresh tokens",
        "Implementing pagination and filtering for all list endpoints",
        "Adding comprehensive error handling and logging"
      ],
      designer: [
        "The design follows material design principles with custom branding",
        "I've ensured color contrast ratios meet WCAG guidelines",
        "Created a consistent spacing system using 8px grid"
      ],
      tester: [
        "I'll add E2E tests with Cypress for critical user flows",
        "Performance testing shows <3s load time on 3G networks",
        "Security scan shows no critical vulnerabilities"
      ]
    };

    const roleResponses = responses[this.role] || ["I'll help with that"];
    this.announce(roleResponses[Math.floor(Math.random() * roleResponses.length)]);
  }

  provideAlternative() {
    const alternatives = [
      "Let me reconsider - perhaps we should explore a different approach",
      "Actually, I found some research suggesting an alternative solution",
      "What if we tried a hybrid approach combining both ideas?"
    ];
    
    this.announce(alternatives[Math.floor(Math.random() * alternatives.length)]);
  }

  announce(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(chalk.blue(`\n💬 ${this.name}: "${text}"`));
      this.ws.send(JSON.stringify({
        type: 'message',
        text
      }));
    }
  }

  async generateArtifacts() {
    // Create project structure
    const dirs = [
      'components',
      'api',
      'database', 
      'design',
      'tests',
      'qa',
      'styles',
      'hooks'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(PROJECT_DIR, dir), { recursive: true });
    }

    // Generate README
    const readme = `# Demo Website

Built collaboratively by Claude-Collab swarm agents.

## Architecture
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Styling: Tailwind CSS
- Testing: Jest + React Testing Library

## Swarm Contributors
${this.contributions.map(c => `- ${this.name}: ${c.task}`).join('\n')}

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

Generated by Claude-Collab Swarm Demo
`;

    await fs.writeFile(path.join(PROJECT_DIR, 'README.md'), readme);
    
    console.log(chalk.green(`📁 ${this.name} created artifacts in ${PROJECT_DIR}`));
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
    // Check server
    console.log(chalk.yellow('\n🔍 Initializing swarm...'));
    
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
      console.log(chalk.yellow('💡 Starting server...'));
      
      const { spawn } = require('child_process');
      const serverProcess = spawn('cc', ['server'], {
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(chalk.green('✅ Server ready for swarm'));

    // Create swarm agents
    const swarm = SWARM_AGENTS.map(config => new SwarmAgent(config));
    
    // Register all agents
    for (const agent of swarm) {
      await agent.register();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Connect all agents
    for (const agent of swarm) {
      await agent.connect();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(chalk.cyan('\n🎬 Swarm collaboration starting...\n'));
    console.log(chalk.yellow('📋 Project: E-commerce Website'));
    console.log(chalk.gray('Requirements: Modern, responsive, accessible, performant\n'));

    // Phase 1: Planning
    await new Promise(resolve => setTimeout(resolve, 2000));
    swarm[0].announce("Team, let's build an e-commerce website. I'll start with the architecture.");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    swarm[3].announce("I'll work on the visual design and branding.");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    swarm[1].announce("I'll handle the React components and UI implementation.");

    // Start all agents working
    for (const agent of swarm) {
      agent.startWork();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Let them work
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Phase 2: Integration discussion
    swarm[0].announce("Everyone, let's sync on integration points. Frontend needs the API spec.");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    swarm[2].announce("API documentation is ready at /api/docs. All endpoints follow REST conventions.");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    swarm[1].announce("Perfect! I'll update the API client to match the endpoints.");

    // Phase 3: Quality check
    await new Promise(resolve => setTimeout(resolve, 3000));
    swarm[4].announce("Running final tests... All tests passing! Ready for deployment.");

    // Generate artifacts
    console.log(chalk.cyan('\n📦 Generating project artifacts...\n'));
    for (const agent of swarm) {
      await agent.generateArtifacts();
    }

    console.log(chalk.green('\n\n✨ Swarm Collaboration Complete!'));
    console.log(chalk.yellow('\nProject Summary:'));
    console.log(chalk.gray(`• ${swarm.length} agents collaborated`));
    console.log(chalk.gray(`• ${swarm.reduce((sum, a) => sum + a.contributions.length, 0)} tasks completed`));
    console.log(chalk.gray(`• Full-stack website architecture designed`));
    console.log(chalk.gray(`• Project files generated in ${PROJECT_DIR}`));

    console.log(chalk.cyan('\n🎯 Swarm Benefits:'));
    console.log(chalk.gray('1. Parallel task execution'));
    console.log(chalk.gray('2. Specialized expertise per agent'));
    console.log(chalk.gray('3. Natural collaboration and coordination'));
    console.log(chalk.gray('4. Comprehensive solution coverage'));

    console.log(chalk.cyan('\n🚀 Next Steps:'));
    console.log(chalk.gray(`   cd ${PROJECT_DIR}       # View generated project`));
    console.log(chalk.gray('   cc server               # Run your own swarm'));
    console.log(chalk.gray('   cc watch                # Monitor swarm activity'));

    // Cleanup
    swarm.forEach(agent => agent.disconnect());
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n❌ Swarm error:'), error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();