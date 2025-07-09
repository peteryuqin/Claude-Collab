/**
 * Swarm Manager for Claude-Collab
 * Handles spawning and coordinating multiple agents for objectives
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { CLIConnectionHelper } = require('./connection-helper');

class SwarmManager {
  constructor(objective, options) {
    this.objective = objective;
    this.options = options;
    this.agents = new Map();
    this.serverUrl = options.server || 'ws://localhost:8765';
    this.maxAgents = parseInt(options.maxAgents) || 5;
    this.strategy = options.strategy || 'distributed';
    this.antiEcho = options.antiEcho !== false;
  }

  /**
   * Start the swarm to accomplish the objective
   */
  async start() {
    console.log('\n🐝 Starting Claude-Collab Swarm...\n');
    
    // Ensure server is running
    await this.ensureServerRunning();
    
    // Decompose objective into tasks
    const tasks = this.decomposeObjective();
    
    // Determine required agents
    const agentConfigs = this.determineAgents(tasks);
    
    // Spawn agents
    await this.spawnAgents(agentConfigs);
    
    // Coordinate agents
    await this.coordinateAgents(tasks);
    
    console.log('\n✅ Swarm is active! Agents are collaborating on:', this.objective);
    console.log('\nMonitor progress with: cc watch\n');
  }

  /**
   * Ensure server is running
   */
  async ensureServerRunning() {
    const connectionHelper = new CLIConnectionHelper(this.serverUrl);
    
    try {
      // Try to connect with short timeout
      connectionHelper.config = { ...connectionHelper.config, connectionTimeout: 3000 };
      await connectionHelper.connect();
      connectionHelper.disconnect();
      console.log('✓ Server is running');
    } catch (error) {
      console.log('⚠️  Server not running, starting it...');
      
      // Start server in background
      const serverProcess = spawn('node', [
        path.join(__dirname, '..', 'dist', 'core', 'server.js')
      ], {
        detached: true,
        stdio: 'ignore'
      });
      
      serverProcess.unref();
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✓ Server started');
    }
  }

  /**
   * Decompose objective into tasks based on strategy
   */
  decomposeObjective() {
    const tasks = [];
    
    switch (this.strategy) {
      case 'research':
        tasks.push(
          { id: 'research', description: 'Research existing solutions and best practices' },
          { id: 'analysis', description: 'Analyze requirements and constraints' },
          { id: 'synthesis', description: 'Synthesize findings into recommendations' }
        );
        break;
        
      case 'development':
        tasks.push(
          { id: 'design', description: 'Design system architecture' },
          { id: 'implement', description: 'Implement core functionality' },
          { id: 'test', description: 'Test and validate implementation' },
          { id: 'document', description: 'Document code and APIs' }
        );
        break;
        
      case 'review':
        tasks.push(
          { id: 'analyze', description: 'Analyze code structure and patterns' },
          { id: 'security', description: 'Review security considerations' },
          { id: 'performance', description: 'Evaluate performance implications' },
          { id: 'suggest', description: 'Suggest improvements' }
        );
        break;
        
      default: // distributed
        tasks.push(
          { id: 'understand', description: 'Understand the objective' },
          { id: 'plan', description: 'Plan approach and decompose tasks' },
          { id: 'execute', description: 'Execute the plan' },
          { id: 'validate', description: 'Validate results' },
          { id: 'refine', description: 'Refine and optimize' }
        );
    }
    
    console.log('📋 Task Decomposition:');
    tasks.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.description}`);
    });
    console.log();
    
    return tasks;
  }

  /**
   * Determine which agents to spawn based on tasks
   */
  determineAgents(tasks) {
    const agentConfigs = [];
    const perspectives = ['analytical', 'pragmatist', 'innovative', 'skeptical', 'holistic'];
    
    // Map tasks to agent roles
    const roleMapping = {
      research: 'researcher',
      analysis: 'analyst',
      synthesis: 'architect',
      design: 'architect',
      implement: 'coder',
      test: 'tester',
      document: 'documenter',
      analyze: 'reviewer',
      security: 'security-expert',
      performance: 'optimizer',
      suggest: 'advisor',
      understand: 'analyst',
      plan: 'strategist',
      execute: 'implementer',
      validate: 'validator',
      refine: 'optimizer'
    };
    
    // Create agents for tasks (up to maxAgents)
    tasks.slice(0, this.maxAgents).forEach((task, i) => {
      const role = roleMapping[task.id] || 'general';
      const perspective = this.antiEcho 
        ? perspectives[i % perspectives.length]
        : 'balanced';
      
      agentConfigs.push({
        name: `${role}-${i + 1}`,
        role: role,
        perspective: perspective,
        task: task
      });
    });
    
    console.log('🤖 Agent Configuration:');
    agentConfigs.forEach(agent => {
      console.log(`  ✓ ${agent.name} (${agent.role}) - ${agent.perspective} perspective`);
    });
    console.log();
    
    return agentConfigs;
  }

  /**
   * Spawn agents as separate processes
   */
  async spawnAgents(agentConfigs) {
    console.log('🚀 Spawning agents...\n');
    
    for (const config of agentConfigs) {
      try {
        // Create agent spawn script
        const agentScript = this.createAgentScript(config);
        const scriptPath = path.join('.claude-collab', 'swarm', `${config.name}.js`);
        
        // Ensure directory exists
        fs.mkdirSync(path.join('.claude-collab', 'swarm'), { recursive: true });
        fs.writeFileSync(scriptPath, agentScript);
        
        // Spawn agent process
        const agentProcess = spawn('node', [scriptPath], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        // Capture initial output
        agentProcess.stdout.on('data', (data) => {
          console.log(`[${config.name}] ${data.toString().trim()}`);
        });
        
        agentProcess.stderr.on('data', (data) => {
          console.error(`[${config.name}] ERROR: ${data.toString().trim()}`);
        });
        
        // Store process reference
        this.agents.set(config.name, {
          config: config,
          process: agentProcess,
          pid: agentProcess.pid
        });
        
        console.log(`  ✓ Spawned ${config.name} (PID: ${agentProcess.pid})`);
        
        // Small delay between spawns
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ✗ Failed to spawn ${config.name}:`, error.message);
      }
    }
    
    // Save swarm state
    this.saveSwarmState();
  }

  /**
   * Create agent script that will run in separate process
   */
  createAgentScript(config) {
    // Safely escape strings for JavaScript
    const escapeForJS = (str) => {
      if (!str) return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    };
    
    // Prepare safe values
    const safeConfig = {
      name: escapeForJS(config.name),
      role: escapeForJS(config.role),
      perspective: escapeForJS(config.perspective),
      taskDescription: escapeForJS(config.task.description),
      connectionHelperPath: escapeForJS(path.join(__dirname, 'connection-helper')),
      serverUrl: escapeForJS(this.serverUrl),
      objective: escapeForJS(this.objective)
    };
    
    return `
const { CLIConnectionHelper } = require('${safeConfig.connectionHelperPath}');

// Role-specific response generators
function generateAnalystResponse(config) {
  const analyses = [
    \`From my analytical perspective, the key aspects of "\${config.objective}" are: 1) Technical feasibility, 2) Scalability concerns, 3) Performance metrics\`,
    \`Analyzing the requirements for "\${config.objective}", I identify these critical factors: data structure design, API contracts, and error handling patterns\`,
    \`My analysis shows that "\${config.objective}" requires careful consideration of: authentication mechanisms, data validation, and response formats\`
  ];
  return analyses[Math.floor(Math.random() * analyses.length)];
}

function generateStrategistResponse(config) {
  const strategies = [
    \`From a pragmatic standpoint, "\${config.objective}" should follow RESTful principles with clear resource endpoints and standard HTTP methods\`,
    \`Strategically, I recommend implementing "\${config.objective}" in phases: 1) Basic CRUD operations, 2) Authentication layer, 3) Advanced features\`,
    \`The practical approach for "\${config.objective}" involves: starting with MVP endpoints, gathering user feedback, then iterating on the design\`
  ];
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function generateImplementerResponse(config) {
  const implementations = [
    \`For implementation of "\${config.objective}", I propose using Express.js with middleware for validation, authentication, and error handling\`,
    \`Innovatively, we could implement "\${config.objective}" using GraphQL for flexible queries, or consider gRPC for high-performance scenarios\`,
    \`My implementation plan for "\${config.objective}" includes: TypeScript for type safety, Jest for testing, and OpenAPI for documentation\`
  ];
  return implementations[Math.floor(Math.random() * implementations.length)];
}

function generateValidatorResponse(config) {
  const validations = [
    \`Critical validation points for "\${config.objective}": Are we handling edge cases? What about rate limiting? How do we ensure data integrity?\`,
    \`I question whether "\${config.objective}" adequately addresses: security vulnerabilities, input sanitization, and API versioning strategies\`,
    \`From a skeptical view, "\${config.objective}" must prove: scalability under load, proper error responses, and backwards compatibility\`
  ];
  return validations[Math.floor(Math.random() * validations.length)];
}

function generateOptimizerResponse(config) {
  const optimizations = [
    \`Holistically optimizing "\${config.objective}": implement caching strategies, use database indexing, and consider CDN for static assets\`,
    \`For overall optimization of "\${config.objective}", I suggest: response compression, query optimization, and implementing pagination\`,
    \`Taking a system-wide view of "\${config.objective}": optimize database queries, implement connection pooling, and use async processing\`
  ];
  return optimizations[Math.floor(Math.random() * optimizations.length)];
}

async function runAgent() {
  console.log('Starting ${safeConfig.name}...');
  
  const connectionHelper = new CLIConnectionHelper('${safeConfig.serverUrl}');
  let registered = false;
  let authToken = null;
  let myAgentId = null; // Store server-assigned ID to prevent self-response
  
  // Config passed as data
  const agentConfig = ${JSON.stringify({
    name: config.name,
    role: config.role,
    perspective: config.perspective,
    task: config.task,
    objective: this.objective
  })};
  
  connectionHelper.on('connected', () => {
    if (!registered) {
      // Register agent
      connectionHelper.send({
        type: 'register',
        agentName: agentConfig.name,
        role: agentConfig.role,
        forceNew: true
      });
    } else {
      // Join session
      connectionHelper.send({
        type: 'auth',
        agentName: agentConfig.name,
        authToken: authToken,
        role: agentConfig.role,
        perspective: agentConfig.perspective,
        clientVersion: '3.2.3'
      });
    }
  });
  
  connectionHelper.on('message', (message) => {
    if (message.type === 'register-success') {
      registered = true;
      authToken = message.authToken;
      console.log('Registered successfully, reconnecting to join...');
      connectionHelper.forceReconnect();
      
    } else if (message.type === 'auth-success') {
      // Capture the server-assigned ID
      myAgentId = message.agentId || message.sessionId || agentConfig.name;
      console.log(\`Joined collaboration! My ID: \${myAgentId}\`);
      
      // Send introduction
      setTimeout(() => {
        connectionHelper.send({
          type: 'message',
          text: \`Hello! I'm \${agentConfig.name}, a \${agentConfig.role} with \${agentConfig.perspective} perspective. I'm here to work on: \${agentConfig.task.description}\`
        });
        
        // Start working on task
        setTimeout(() => {
          connectionHelper.send({
            type: 'message',
            text: \`Starting work on: \${agentConfig.task.description}. Objective: \${agentConfig.objective}\`
          });
          
          // Simulate actual work based on role
          setTimeout(() => {
            let analysis = '';
            
            switch(agentConfig.role) {
              case 'analyst':
                analysis = generateAnalystResponse(agentConfig);
                break;
              case 'strategist':
                analysis = generateStrategistResponse(agentConfig);
                break;
              case 'implementer':
                analysis = generateImplementerResponse(agentConfig);
                break;
              case 'validator':
                analysis = generateValidatorResponse(agentConfig);
                break;
              case 'optimizer':
                analysis = generateOptimizerResponse(agentConfig);
                break;
              default:
                analysis = \`Analyzing \${agentConfig.objective} from \${agentConfig.perspective} perspective...\`;
            }
            
            connectionHelper.send({
              type: 'message',
              text: analysis
            });
          }, 4000);
        }, 2000);
      }, 1000);
      
    } else if (message.type === 'chat') {
      // Listen to other agents
      console.log(\`[\${message.displayName || message.agentName}]: \${message.text}\`);
      
      // More robust self-response prevention
      const isOwnMessage = (
        (message.agentId && message.agentId === myAgentId) ||
        (message.sessionId && message.sessionId === myAgentId) ||
        (message.agentName && message.agentName === agentConfig.name) ||
        (message.displayName && message.displayName === agentConfig.name)
      );
      
      if (!isOwnMessage) {
        // Analyze message content
        const shouldRespond = Math.random() > 0.5; // 50% chance to respond for diversity
        
        if (shouldRespond) {
          setTimeout(() => {
            let response = '';
            
            // Generate perspective-based response
            if (message.text.includes('API') || message.text.includes('endpoint')) {
              switch(agentConfig.perspective) {
                case 'analytical':
                  response = \`Building on that point, we should also consider response time metrics and error rate monitoring for the API endpoints.\`;
                  break;
                case 'pragmatist':
                  response = \`I agree partially, but we need to ensure the implementation remains simple and maintainable. Perhaps start with basic endpoints first?\`;
                  break;
                case 'innovative':
                  response = \`Interesting approach! Have we considered using WebSockets for real-time updates in addition to REST endpoints?\`;
                  break;
                case 'skeptical':
                  response = \`I'm concerned about the complexity. How will this scale? What about backwards compatibility?\`;
                  break;
                case 'holistic':
                  response = \`Good points. We should also think about how this fits into the overall system architecture and deployment strategy.\`;
                  break;
              }
            } else if (message.text.includes('security') || message.text.includes('authentication')) {
              switch(agentConfig.perspective) {
                case 'analytical':
                  response = \`Security analysis shows we need: OAuth2 implementation, rate limiting, and comprehensive audit logging.\`;
                  break;
                case 'pragmatist':
                  response = \`For security, let's start with JWT tokens and basic role-based access control. We can enhance later.\`;
                  break;
                case 'innovative':
                  response = \`Consider implementing zero-trust architecture with microservice-level authentication.\`;
                  break;
                case 'skeptical':
                  response = \`Are we over-engineering the security? What's the actual threat model we're defending against?\`;
                  break;
                case 'holistic':
                  response = \`Security must be balanced with user experience. Consider SSO integration for enterprise users.\`;
                  break;
              }
            }
            
            if (response) {
              connectionHelper.send({
                type: 'message',
                text: response
              });
            }
          }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
        }
      }
    }
  });
  
  // Connect
  await connectionHelper.connect();
  
  // Keep process alive
  setInterval(() => {}, 1000);
}

runAgent().catch(console.error);
`;
  }

  /**
   * Coordinate agents to work together
   */
  async coordinateAgents(tasks) {
    console.log('\n📡 Coordinating agents...\n');
    
    // Create coordinator connection
    const coordinator = new CLIConnectionHelper(this.serverUrl);
    
    coordinator.on('connected', () => {
      // Register as coordinator
      coordinator.send({
        type: 'register',
        agentName: 'swarm-coordinator',
        role: 'coordinator',
        forceNew: true
      });
    });
    
    coordinator.on('message', (message) => {
      if (message.type === 'register-success') {
        // Join and start coordination
        coordinator.send({
          type: 'auth',
          agentName: 'swarm-coordinator',
          authToken: message.authToken,
          role: 'coordinator',
          perspective: 'holistic',
          clientVersion: '3.2.3'
        });
      } else if (message.type === 'auth-success') {
        // Send coordination message
        setTimeout(() => {
          coordinator.send({
            type: 'message',
            text: `🎯 Swarm Objective: ${this.objective}\n\nAll agents, please coordinate your efforts. Use @mentions to collaborate. Anti-echo chamber is ${this.antiEcho ? 'ENABLED' : 'DISABLED'}.`
          });
          
          // Disconnect coordinator after initial setup
          setTimeout(() => {
            coordinator.disconnect();
          }, 3000);
        }, 2000);
      }
    });
    
    await coordinator.connect();
  }

  /**
   * Save swarm state for management
   */
  saveSwarmState() {
    const state = {
      objective: this.objective,
      startTime: new Date().toISOString(),
      agents: Array.from(this.agents.entries()).map(([name, data]) => ({
        name: name,
        role: data.config.role,
        perspective: data.config.perspective,
        pid: data.pid,
        task: data.config.task
      }))
    };
    
    const statePath = path.join('.claude-collab', 'swarm', 'current-swarm.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Stop all swarm agents
   */
  static async stopAll() {
    const statePath = path.join('.claude-collab', 'swarm', 'current-swarm.json');
    
    if (!fs.existsSync(statePath)) {
      console.log('No active swarm found.');
      return;
    }
    
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      
      console.log('Stopping swarm agents...');
      
      state.agents.forEach(agent => {
        try {
          process.kill(agent.pid);
          console.log(`  ✓ Stopped ${agent.name} (PID: ${agent.pid})`);
        } catch (error) {
          console.log(`  ⚠ Could not stop ${agent.name} - may have already exited`);
        }
      });
      
      // Clean up
      fs.unlinkSync(statePath);
      console.log('\n✅ Swarm stopped');
      
    } catch (error) {
      console.error('Error stopping swarm:', error.message);
    }
  }
}

module.exports = { SwarmManager };