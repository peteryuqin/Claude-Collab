"use strict";
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
        }
        catch (error) {
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
                tasks.push({ id: 'research', description: 'Research existing solutions and best practices' }, { id: 'analysis', description: 'Analyze requirements and constraints' }, { id: 'synthesis', description: 'Synthesize findings into recommendations' });
                break;
            case 'development':
                tasks.push({ id: 'design', description: 'Design system architecture' }, { id: 'implement', description: 'Implement core functionality' }, { id: 'test', description: 'Test and validate implementation' }, { id: 'document', description: 'Document code and APIs' });
                break;
            case 'review':
                tasks.push({ id: 'analyze', description: 'Analyze code structure and patterns' }, { id: 'security', description: 'Review security considerations' }, { id: 'performance', description: 'Evaluate performance implications' }, { id: 'suggest', description: 'Suggest improvements' });
                break;
            default: // distributed
                tasks.push({ id: 'understand', description: 'Understand the objective' }, { id: 'plan', description: 'Plan approach and decompose tasks' }, { id: 'execute', description: 'Execute the plan' }, { id: 'validate', description: 'Validate results' }, { id: 'refine', description: 'Refine and optimize' });
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
            }
            catch (error) {
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
            if (!str)
                return '';
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

async function runAgent() {
  console.log('Starting ${safeConfig.name}...');
  
  const connectionHelper = new CLIConnectionHelper('${safeConfig.serverUrl}');
  let registered = false;
  let authToken = null;
  
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
      console.log('Joined collaboration!');
      
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
        }, 2000);
      }, 1000);
      
    } else if (message.type === 'broadcast') {
      // Listen to other agents
      console.log(\`[\${message.agentName}]: \${message.text}\`);
      
      // Simple response logic
      if (message.text.includes(agentConfig.name)) {
        setTimeout(() => {
          connectionHelper.send({
            type: 'message',
            text: \`Acknowledged! Working on \${agentConfig.task.description}...\`
          });
        }, 1000);
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
            }
            else if (message.type === 'auth-success') {
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
                }
                catch (error) {
                    console.log(`  ⚠ Could not stop ${agent.name} - may have already exited`);
                }
            });
            // Clean up
            fs.unlinkSync(statePath);
            console.log('\n✅ Swarm stopped');
        }
        catch (error) {
            console.error('Error stopping swarm:', error.message);
        }
    }
}
module.exports = { SwarmManager };
//# sourceMappingURL=swarm-manager.js.map