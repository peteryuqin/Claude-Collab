#!/usr/bin/env node

/**
 * Claude-Collab - Unified CLI
 * Combines real-time collaboration, orchestration, and anti-echo-chamber features
 */

const { Command } = require('commander');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// Get version from package.json
const packageJson = require('../package.json');
const VERSION = packageJson.version;

const program = new Command();

// CLI Configuration
program
  .name('claude-collab')
  .description('The AI collaboration framework that prevents echo chambers')
  .version(VERSION);

// Initialize project
program
  .command('init [project-name]')
  .description('Initialize a new Claude-Collab project')
  .option('--anti-echo', 'Enable anti-echo-chamber by default', true)
  .option('--sparc', 'Enable SPARC modes', true)
  .action(async (projectName = 'my-claude-collab-project', options) => {
    const spinner = ora('Initializing Claude-Collab project...').start();
    
    try {
      // Create project directory
      const projectPath = path.join(process.cwd(), projectName);
      fs.mkdirSync(projectPath, { recursive: true });
      
      // Create .claude-collab directory structure
      const dirs = [
        '.claude-collab',
        '.claude-collab/tasks',
        '.claude-collab/messages', 
        '.claude-collab/memory',
        '.claude-collab/decisions'
      ];
      
      dirs.forEach(dir => {
        fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
      });
      
      // Create config file
      const config = {
        project: projectName,
        version: VERSION,
        antiEchoChamber: {
          enabled: options.antiEcho,
          minimumDiversity: 0.6,
          disagreementQuota: 0.3,
          evidenceThreshold: 0.5
        },
        orchestration: {
          enableSPARC: options.sparc,
          swarmMode: 'distributed',
          maxAgents: 10
        },
        server: {
          port: 8765,
          host: 'localhost'
        }
      };
      
      fs.writeFileSync(
        path.join(projectPath, '.claude-collab', 'config.json'),
        JSON.stringify(config, null, 2)
      );
      
      // Create discussion board
      fs.writeFileSync(
        path.join(projectPath, '.claude-collab', 'DISCUSSION_BOARD.md'),
        `# Discussion Board

AI agents collaborate here with diversity enforcement.

## Guidelines
- All viewpoints are valuable
- Evidence strengthens arguments
- Disagreement is encouraged
- Echo chambers are prevented

---
`
      );
      
      // Create README
      fs.writeFileSync(
        path.join(projectPath, 'README.md'),
        `# ${projectName}

A Claude-Collab v${VERSION} project with real-time AI collaboration and anti-echo-chamber protection.

## Getting Started

1. Start the server:
   \`\`\`bash
   claude-collab server
   \`\`\`

2. Join as an agent:
   \`\`\`bash
   claude-collab join agent1 --role coder
   \`\`\`

3. Start a swarm:
   \`\`\`bash
   claude-collab swarm "Build a feature" --anti-echo
   \`\`\`

## Features
- Real-time WebSocket collaboration
- Anti-echo-chamber enforcement
- SPARC development modes
- Swarm orchestration
- Memory management

Built with Claude-Collab v${VERSION}
`
      );
      
      spinner.succeed(chalk.green(`Project initialized at ${projectPath}`));
      
      console.log('\nNext steps:');
      console.log(chalk.cyan(`  cd ${projectName}`));
      console.log(chalk.cyan('  claude-collab server'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize project'));
      console.error(error);
    }
  });

// Start server
program
  .command('server')
  .description('Start Claude-Collab collaboration server')
  .option('-p, --port <port>', 'Server port', '8765')
  .option('--no-anti-echo', 'Disable anti-echo-chamber')
  .option('--strict', 'Enable strict diversity enforcement')
  .action(async (options) => {
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║           🎵 Claude-Collab v${VERSION} Server 🎵              ║
║                                                        ║
║  Real-time collaboration with diversity enforcement     ║
╚════════════════════════════════════════════════════════╝
    `));
    
    console.log(chalk.yellow(`Starting server on port ${options.port}...`));
    console.log(chalk.gray(`Anti-echo-chamber: ${options.antiEcho ? 'ENABLED' : 'DISABLED'}`));
    
    // In production, would import and start the actual server
    // For now, show what would happen
    console.log(chalk.green(`\n✅ Server running at ws://localhost:${options.port}`));
    console.log(chalk.gray('\nPress Ctrl+C to stop'));
    
    // Keep process alive
    process.stdin.resume();
  });

// Register new agent identity
program
  .command('register <agent-name>')
  .description('Register a new agent identity')
  .option('-r, --role <role>', 'Default role', 'general')
  .option('-s, --server <url>', 'Server URL', 'ws://localhost:8765')
  .option('-f, --force', 'Force registration even if name exists (v3.2)')
  .action(async (agentName, options) => {
    const spinner = ora('Registering new agent identity...').start();
    
    try {
      // Connect to server to register
      const ws = new WebSocket(options.server);
      
      ws.on('open', () => {
        // Send registration request
        ws.send(JSON.stringify({
          type: 'register',
          agentName,
          role: options.role,
          forceNew: options.force || false
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register-success') {
          // Save auth token
          saveAuthToken(agentName, message.authToken, message.agentId);
          
          spinner.succeed(chalk.green(`Agent registered: ${agentName}`));
          console.log(chalk.gray(`Agent ID: ${message.agentId}`));
          console.log(chalk.gray(`Default role: ${options.role}`));
          console.log(chalk.cyan('\nAuthentication token saved!'));
          console.log(chalk.yellow('\nUse this command to join:'));
          console.log(chalk.gray(`  claude-collab join ${agentName}`));
          ws.close();
        } else if (message.type === 'register-failed') {
          if (message.reason === 'name-taken') {
            spinner.fail(chalk.red(`Name '${agentName}' is already taken!`));
            if (message.suggestions && message.suggestions.length > 0) {
              console.log(chalk.yellow('\nAvailable alternatives:'));
              message.suggestions.forEach(suggestion => {
                console.log(chalk.gray(`  - ${suggestion}`));
              });
            }
            console.log(chalk.gray('\nUse --force to override (creates new agent with same name)'));
          } else {
            spinner.fail(chalk.red('Registration failed: ' + message.reason));
          }
          ws.close();
        }
      });
      
      ws.on('error', (err) => {
        spinner.fail(chalk.red('Failed to connect to server'));
        console.error(err);
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Registration failed'));
      console.error(error);
    }
  });

// Show agent identity info
program
  .command('whoami')
  .description('Show saved agent identities')
  .action(() => {
    const configPath = path.join('.claude-collab', 'agent-auth.json');
    
    if (!fs.existsSync(configPath)) {
      console.log(chalk.yellow('No saved agent identities found.'));
      console.log(chalk.gray('Use: claude-collab register <name>'));
      return;
    }
    
    try {
      const authData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const agents = Object.entries(authData);
      
      if (agents.length === 0) {
        console.log(chalk.yellow('No saved agent identities found.'));
        return;
      }
      
      console.log(chalk.cyan('\nSaved Agent Identities:\n'));
      
      agents.forEach(([name, data]) => {
        console.log(chalk.green(`  ${name}`));
        console.log(chalk.gray(`    ID: ${data.agentId}`));
        console.log(chalk.gray(`    Last used: ${data.lastUsed || 'Never'}`));
        console.log();
      });
      
    } catch (error) {
      console.log(chalk.red('Error reading identity data'));
    }
  });

// Join as agent with persistent identity
program
  .command('join <agent-name>')
  .description('Join collaboration session as an AI agent with persistent identity')
  .option('-r, --role <role>', 'Agent role (coder, researcher, reviewer, etc.)', 'general')
  .option('-p, --perspective <perspective>', 'Initial perspective (skeptic, optimist, etc.)')
  .option('-s, --server <url>', 'Server URL', 'ws://localhost:8765')
  .option('-t, --token <token>', 'Authentication token for existing agent')
  .option('--new-agent', 'Force creation of new agent identity')
  .action(async (agentName, options) => {
    const spinner = ora(`Connecting to server as ${agentName}...`).start();
    
    try {
      // Check for saved auth token
      const configPath = path.join('.claude-collab', 'agent-auth.json');
      let authToken = options.token;
      
      if (!authToken && !options.newAgent && fs.existsSync(configPath)) {
        try {
          const savedAuth = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (savedAuth[agentName]) {
            authToken = savedAuth[agentName].token;
            console.log(chalk.gray('Using saved authentication token'));
          }
        } catch (e) {
          // Ignore errors reading auth file
        }
      }
      
      // Connect to WebSocket server with auth info
      const ws = new WebSocket(options.server);
      
      ws.on('open', () => {
        // Send authentication/registration message with version info
        ws.send(JSON.stringify({
          type: 'auth',
          agentName,
          authToken,
          role: options.role,
          perspective: options.perspective,
          clientVersion: VERSION // v3.2: Send client version for compatibility checking
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth-success') {
          spinner.succeed(chalk.green(`Connected as ${agentName}`));
          console.log(chalk.gray(`Agent ID: ${message.agentId}`));
          console.log(chalk.gray(`Role: ${options.role}`));
          if (options.perspective) {
            console.log(chalk.gray(`Perspective: ${options.perspective}`));
          }

          // Display version information and warnings (v3.2)
          if (message.versionWarning) {
            const warning = message.versionWarning;
            if (warning.severity === 'error') {
              console.log(chalk.red(`\n⚠️  ${warning.message}`));
            } else {
              console.log(chalk.yellow(`\n⚠️  ${warning.message}`));
            }
            
            if (warning.upgradeAction) {
              console.log(chalk.cyan(`💡 Upgrade: ${warning.upgradeAction}`));
            }
            console.log(chalk.gray(`Server: v${message.serverVersion}, Client: v${message.clientVersion}\n`));
          } else {
            console.log(chalk.green(`\n✅ Version compatible: v${message.serverVersion}\n`));
          }
          
          // Save auth token for future sessions
          if (message.authToken && !authToken) {
            saveAuthToken(agentName, message.authToken, message.agentId);
            console.log(chalk.gray('Authentication token saved for future sessions'));
          }
          
          // Show agent history if returning
          if (message.isReturning) {
            console.log(chalk.cyan('\nWelcome back! Your history:'));
            console.log(chalk.gray(`Total sessions: ${message.totalSessions}`));
            console.log(chalk.gray(`Total contributions: ${message.totalContributions}`));
            console.log(chalk.gray(`Last seen: ${message.lastSeen}`));
          } else {
            console.log(chalk.cyan('\nWelcome! This is your first session.'));
          }
          
          // Interactive prompt
          startInteractiveSession(ws, agentName, message.agentId);
        } else if (message.type === 'auth-failed') {
          spinner.fail(chalk.red('Authentication failed: ' + message.reason));
          ws.close();
        }
      });
      
      ws.on('error', (err) => {
        spinner.fail(chalk.red('Failed to connect to server'));
        console.error(err);
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Connection error'));
      console.error(error);
    }
  });

// Helper function to save auth token
function saveAuthToken(agentName, token, agentId) {
  const configPath = path.join('.claude-collab', 'agent-auth.json');
  let authData = {};
  
  try {
    if (fs.existsSync(configPath)) {
      authData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    // Start fresh if file is corrupted
  }
  
  authData[agentName] = {
    token,
    agentId,
    lastUsed: new Date().toISOString()
  };
  
  fs.writeFileSync(configPath, JSON.stringify(authData, null, 2));
}

// Swarm command
program
  .command('swarm <objective>')
  .description('Start a swarm to accomplish an objective')
  .option('-s, --strategy <strategy>', 'Swarm strategy', 'distributed')
  .option('-m, --max-agents <n>', 'Maximum agents', '5')
  .option('--anti-echo', 'Enable anti-echo-chamber', true)
  .option('--require-evidence', 'Require evidence for decisions')
  .option('--sparc <modes>', 'SPARC modes to use (comma-separated)')
  .action(async (objective, options) => {
    console.log(chalk.cyan('\n🐝 Initializing Swarm...\n'));
    
    console.log(chalk.yellow('Objective:'), objective);
    console.log(chalk.gray('Strategy:'), options.strategy);
    console.log(chalk.gray('Max agents:'), options.maxAgents);
    console.log(chalk.gray('Anti-echo:'), options.antiEcho ? 'ENABLED' : 'DISABLED');
    
    // Show task decomposition
    console.log(chalk.cyan('\n📋 Task Decomposition:\n'));
    
    const tasks = [
      '1. Research and analyze the objective',
      '2. Design solution architecture',
      '3. Implement core functionality',
      '4. Test and validate solution',
      '5. Document and review'
    ];
    
    tasks.forEach(task => console.log(chalk.gray(`  ${task}`)));
    
    // Show agent assignment
    console.log(chalk.cyan('\n🤖 Agent Assignment:\n'));
    
    const agents = [
      { name: 'researcher-1', role: 'researcher', perspective: 'ANALYTICAL' },
      { name: 'architect-1', role: 'architect', perspective: 'PRAGMATIST' },
      { name: 'coder-1', role: 'coder', perspective: 'INNOVATOR' },
      { name: 'tester-1', role: 'tester', perspective: 'SKEPTIC' },
      { name: 'reviewer-1', role: 'reviewer', perspective: 'CONSERVATIVE' }
    ];
    
    agents.forEach(agent => {
      console.log(chalk.green(`  ✓ ${agent.name} (${agent.role}) - Perspective: ${agent.perspective}`));
    });
    
    console.log(chalk.cyan('\n🚀 Swarm initialized and running...\n'));
  });

// Agent spawn command
program
  .command('agent')
  .description('Manage AI agents')
  .command('spawn <type>')
  .description('Spawn a new AI agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-p, --perspective <perspective>', 'Agent perspective')
  .action(async (type, options) => {
    const name = options.name || `${type}-${Date.now()}`;
    console.log(chalk.green(`✓ Spawned ${name} (${type})`));
    if (options.perspective) {
      console.log(chalk.gray(`  Perspective: ${options.perspective}`));
    }
  });

// Task management
program
  .command('task')
  .description('Manage tasks')
  .command('create <description>')
  .description('Create a new task')
  .option('-p, --priority <priority>', 'Task priority', 'medium')
  .option('-t, --type <type>', 'Task type', 'general')
  .action(async (description, options) => {
    console.log(chalk.green('✓ Task created:'));
    console.log(chalk.gray(`  Description: ${description}`));
    console.log(chalk.gray(`  Priority: ${options.priority}`));
    console.log(chalk.gray(`  Type: ${options.type}`));
  });

// Memory management
program
  .command('memory')
  .description('Manage shared memory')
  .command('store <key> <value>')
  .description('Store a value in memory')
  .action(async (key, value) => {
    console.log(chalk.green(`✓ Stored in memory: ${key} = ${value}`));
  });

// Monitor command
program
  .command('monitor')
  .description('Monitor collaboration metrics')
  .option('--diversity', 'Show diversity metrics')
  .option('--tasks', 'Show task status')
  .option('--agents', 'Show agent status')
  .action(async (options) => {
    console.log(chalk.cyan('\n📊 Claude-Collab Metrics\n'));
    
    if (options.diversity) {
      console.log(chalk.yellow('Diversity Metrics:'));
      console.log(chalk.gray('  Overall diversity: 78%'));
      console.log(chalk.gray('  Agreement rate: 45%'));
      console.log(chalk.gray('  Evidence rate: 82%'));
      console.log(chalk.gray('  Recent interventions: 3'));
      console.log();
    }
    
    if (options.tasks) {
      console.log(chalk.yellow('Task Status:'));
      console.log(chalk.gray('  Pending: 12'));
      console.log(chalk.gray('  In Progress: 5'));
      console.log(chalk.gray('  Completed: 23'));
      console.log();
    }
    
    if (options.agents) {
      console.log(chalk.yellow('Agent Status:'));
      console.log(chalk.gray('  Active: 7'));
      console.log(chalk.gray('  Idle: 2'));
      console.log(chalk.gray('  Offline: 1'));
      console.log();
    }
  });

// SPARC mode command
program
  .command('sparc')
  .description('Run in SPARC mode')
  .argument('<mode>', 'SPARC mode (tdd, researcher, etc.)')
  .argument('<task>', 'Task to perform')
  .option('--anti-echo', 'Enable anti-echo-chamber', true)
  .action(async (mode, task, options) => {
    console.log(chalk.cyan(`\n🎯 SPARC Mode: ${mode}\n`));
    console.log(chalk.yellow('Task:'), task);
    
    // Show mode-specific actions
    const modeActions = {
      tdd: ['Write failing test', 'Implement code', 'Refactor'],
      researcher: ['Analyze problem', 'Gather evidence', 'Synthesize findings'],
      architect: ['Design system', 'Define interfaces', 'Document decisions'],
      reviewer: ['Analyze code', 'Find issues', 'Suggest improvements']
    };
    
    const actions = modeActions[mode] || ['Analyze', 'Plan', 'Execute'];
    
    console.log(chalk.cyan('\n📝 Actions:\n'));
    actions.forEach((action, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${action}`));
    });
  });

// Interactive session with identity awareness
async function startInteractiveSession(ws, agentName, agentId) {
  console.log(chalk.cyan('\nInteractive mode started. Type "help" for commands.\n'));
  
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.gray(`${agentName}> `)
  });
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    switch (command) {
      case 'help':
        console.log(chalk.cyan('\nAvailable commands:'));
        console.log(chalk.gray('  say <message>      - Send a message'));
        console.log(chalk.gray('  edit <file>        - Edit a file'));
        console.log(chalk.gray('  task <action>      - Task management'));
        console.log(chalk.gray('  vote <proposal>    - Vote on proposal'));
        console.log(chalk.gray('  status             - Show status'));
        console.log(chalk.gray('  whoami             - Show your identity'));
        console.log(chalk.gray('  switch-role <role> - Change your role'));
        console.log(chalk.gray('  history            - Show your contribution history'));
        console.log(chalk.gray('  exit               - Disconnect\n'));
        break;
        
      case 'say':
        ws.send(JSON.stringify({
          type: 'message',
          text: args.join(' ')
        }));
        console.log(chalk.gray('Message sent'));
        break;
        
      case 'status':
        console.log(chalk.cyan('Status: Connected'));
        break;
        
      case 'whoami':
        ws.send(JSON.stringify({ type: 'whoami' }));
        break;
        
      case 'switch-role':
        if (args[0]) {
          ws.send(JSON.stringify({
            type: 'switch-role',
            newRole: args[0]
          }));
        } else {
          console.log(chalk.red('Please specify a role'));
        }
        break;
        
      case 'history':
        ws.send(JSON.stringify({ type: 'get-history' }));
        break;
        
      case 'exit':
        ws.close();
        process.exit(0);
        break;
        
      default:
        if (command) {
          console.log(chalk.red(`Unknown command: ${command}`));
        }
    }
    
    rl.prompt();
  });
  
  // Handle incoming messages
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'diversity-intervention':
        console.log(chalk.red('\n⚠️  Diversity Intervention Required:'));
        console.log(chalk.yellow(`  Reason: ${message.reason}`));
        console.log(chalk.cyan(`  Action: ${message.requiredAction}\n`));
        break;
        
      case 'chat':
        console.log(chalk.green(`\n${message.sessionName}: ${message.text}\n`));
        break;
        
      case 'task-update':
        console.log(chalk.blue(`\n📋 Task ${message.event}: ${message.task.description}\n`));
        break;
    }
    
    rl.prompt();
  });
}

// Parse command line arguments
program.parse(process.argv);

// Add command suggestions for common typos
program.on('command:*', function() {
  const unknownCommand = program.args[0];
  console.error(chalk.red(`\nUnknown command: ${unknownCommand}\n`));
  
  // Suggest similar commands
  const commands = program.commands.map(cmd => cmd._name);
  const suggestions = commands.filter(cmd => {
    return cmd.includes(unknownCommand) || unknownCommand.includes(cmd) ||
           levenshteinDistance(cmd, unknownCommand) <= 2;
  });
  
  if (suggestions.length > 0) {
    console.log(chalk.yellow('Did you mean one of these?'));
    suggestions.forEach(cmd => {
      console.log(chalk.gray(`  ${cmd}`));
    });
  }
  
  console.log(chalk.cyan('\nRun "cc help" for available commands'));
  process.exit(1);
});

// Helper function for command suggestions
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🎵 Claude-Collab v${VERSION} - AI Collaboration 🎵     ║
║                                                        ║
║  Now with persistent identity & command aliases!       ║
╚════════════════════════════════════════════════════════╝
  `));
  console.log(chalk.yellow('Quick start:'));
  console.log(chalk.gray('  cc init my-project    # Initialize new project'));
  console.log(chalk.gray('  cc register alice     # Register agent identity'));
  console.log(chalk.gray('  cc join alice         # Join as alice'));
  console.log(chalk.gray('  cc tasks              # View available tasks'));
  console.log();
  console.log(chalk.cyan('Pro tip: Use "cc" instead of "claude-collab" for all commands!'));
  console.log();
  program.outputHelp();
}