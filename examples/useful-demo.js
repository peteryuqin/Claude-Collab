const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Practical Use Case: Development Task Breakdown
class TaskAgent {
  constructor(name, role, expertise) {
    this.name = name;
    this.role = role;
    this.expertise = expertise;
    this.ws = null;
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
          const authToken = msg.authToken;
          regWs.close();
          
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
              console.log(`✓ ${this.name} ready`);
              resolve();
            }
          });
        }
      });
    });
  }

  async analyzeTask(task) {
    const analyses = {
      'architect': {
        text: `📐 Architecture Analysis:
- Break into microservices: auth, user-mgmt, notifications
- Use event-driven architecture for loose coupling
- Implement API gateway for unified interface
- Consider CQRS for read/write optimization`,
        subtasks: [
          'Design service boundaries',
          'Define API contracts',
          'Create event schemas',
          'Plan data flow'
        ]
      },
      'backend-dev': {
        text: `⚙️ Backend Implementation Plan:
- Framework: Node.js with Express/Fastify
- Database: PostgreSQL for users, Redis for sessions
- Authentication: JWT with refresh tokens
- Need rate limiting and input validation`,
        subtasks: [
          'Set up project structure',
          'Implement user CRUD operations',
          'Build authentication middleware',
          'Create API endpoints'
        ]
      },
      'frontend-dev': {
        text: `🎨 Frontend Approach:
- React with TypeScript for type safety
- State management: Zustand or Context API
- Form handling: React Hook Form + Zod
- UI library: Tailwind CSS + Radix UI`,
        subtasks: [
          'Create component architecture',
          'Build authentication flow',
          'Implement user dashboard',
          'Add responsive design'
        ]
      },
      'devops': {
        text: `🚀 DevOps Strategy:
- Containerize with Docker
- CI/CD: GitHub Actions
- Deploy to AWS ECS or Kubernetes
- Monitoring: Prometheus + Grafana`,
        subtasks: [
          'Write Dockerfiles',
          'Set up CI/CD pipelines',
          'Configure infrastructure',
          'Implement monitoring'
        ]
      },
      'security': {
        text: `🔒 Security Considerations:
- OWASP Top 10 compliance needed
- Implement proper CORS policies
- Add SQL injection prevention
- Use bcrypt for password hashing`,
        subtasks: [
          'Security audit checklist',
          'Implement input sanitization',
          'Set up security headers',
          'Add penetration testing'
        ]
      }
    };

    const analysis = analyses[this.expertise];
    
    // Send analysis
    this.ws.send(JSON.stringify({
      type: 'task',
      action: 'analyze',
      content: analysis.text
    }));

    // Create subtasks
    setTimeout(() => {
      analysis.subtasks.forEach((subtask, i) => {
        setTimeout(() => {
          this.ws.send(JSON.stringify({
            type: 'task',
            action: 'create',
            title: subtask,
            description: `${this.expertise}: ${subtask}`,
            assignee: this.name,
            priority: i === 0 ? 'high' : 'medium'
          }));
        }, i * 500);
      });
    }, 1000);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runUsefulDemo() {
  console.log('\n🛠️ Claude-Collab Practical Use Case');
  console.log('=================================\n');
  console.log('Project: Build a User Management System\n');
  console.log('Swarm will analyze and break down the task...\n');

  // Create specialist agents
  const agents = [
    new TaskAgent('sophia-architect', 'architect', 'architect'),
    new TaskAgent('ben-backend', 'coder', 'backend-dev'),
    new TaskAgent('fiona-frontend', 'coder', 'frontend-dev'),
    new TaskAgent('derek-devops', 'analyst', 'devops'),
    new TaskAgent('sam-security', 'reviewer', 'security')
  ];

  // Connect all agents
  for (const agent of agents) {
    await agent.connect();
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📋 Starting collaborative analysis...\n');

  // Each agent analyzes the task
  for (let i = 0; i < agents.length; i++) {
    setTimeout(() => {
      agents[i].analyzeTask('User Management System');
    }, i * 2000);
  }

  // After analysis, show the results
  setTimeout(() => {
    console.log('\n✅ Task Analysis Complete!\n');
    console.log('📁 Check these files for results:');
    console.log('- .claude-collab/DISCUSSION_BOARD.md - All analyses');
    console.log('- .claude-collab/tasks/ - Created subtasks\n');
    
    // Create a summary
    const boardPath = path.join('.claude-collab', 'DISCUSSION_BOARD.md');
    if (fs.existsSync(boardPath)) {
      const content = fs.readFileSync(boardPath, 'utf-8');
      const lines = content.split('\n');
      const recentMessages = lines.slice(-100).join('\n');
      
      const summaryPath = path.join('.claude-collab', 'TASK_BREAKDOWN.md');
      fs.writeFileSync(summaryPath, `# User Management System - Task Breakdown

Generated by Claude-Collab Swarm

## Collaborative Analysis

${recentMessages}

## Summary

The swarm has analyzed the user management system from multiple perspectives:

1. **Architecture** - Microservices design with event-driven patterns
2. **Backend** - Node.js/Express with PostgreSQL and Redis
3. **Frontend** - React with TypeScript and modern state management
4. **DevOps** - Containerized deployment with CI/CD
5. **Security** - OWASP compliance and security best practices

Each specialist created specific subtasks in the tasks folder.
`);
      
      console.log(`📄 Summary saved to: ${summaryPath}\n`);
    }
    
    agents.forEach(agent => agent.close());
    process.exit(0);
  }, 12000);
}

runUsefulDemo().catch(console.error);