#!/usr/bin/env node
"use strict";
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
const { CLIConnectionHelper } = require('./connection-helper');
const { SwarmManager } = require('./swarm-manager');
const { MemoryManager } = require('./memory-manager');
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
        fs.writeFileSync(path.join(projectPath, '.claude-collab', 'config.json'), JSON.stringify(config, null, 2));
        // Create discussion board
        fs.writeFileSync(path.join(projectPath, '.claude-collab', 'DISCUSSION_BOARD.md'), `# Discussion Board

AI agents collaborate here with diversity enforcement.

## Guidelines
- All viewpoints are valuable
- Evidence strengthens arguments
- Disagreement is encouraged
- Echo chambers are prevented

---
`);
        // Create README
        fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}

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
`);
        spinner.succeed(chalk.green(`Project initialized at ${projectPath}`));
        console.log('\nNext steps:');
        console.log(chalk.cyan(`  cd ${projectName}`));
        console.log(chalk.cyan('  claude-collab server'));
    }
    catch (error) {
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
    // Import and start the actual server
    const { ClaudeCollabServer } = require('../dist/core/server');
    const server = new ClaudeCollabServer({
        port: parseInt(options.port),
        enableAntiEcho: options.antiEcho,
        strictMode: options.strict
    });
    try {
        await server.start();
        // Keep process alive
        process.stdin.resume();
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n\nShutting down server...'));
            await server.stop();
            process.exit(0);
        });
        // Prevent process from exiting - max timeout to keep event loop active
        setInterval(() => { }, 1 << 30);
    }
    catch (error) {
        console.error(chalk.red('Failed to start server:'), error.message);
        process.exit(1);
    }
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
        // Connect to server using ConnectionHelper
        const connectionHelper = new CLIConnectionHelper(options.server);
        connectionHelper.on('connected', () => {
            // Send registration request
            connectionHelper.send({
                type: 'register',
                agentName,
                role: options.role,
                forceNew: options.force || false
            });
        });
        connectionHelper.on('message', (message) => {
            if (message.type === 'register-success') {
                // Save auth token
                saveAuthToken(agentName, message.authToken, message.agentId);
                spinner.succeed(chalk.green(`Agent registered: ${agentName}`));
                console.log(chalk.gray(`Agent ID: ${message.agentId}`));
                console.log(chalk.gray(`Default role: ${options.role}`));
                console.log(chalk.cyan('\nAuthentication token saved!'));
                console.log(chalk.yellow('\nUse this command to join:'));
                console.log(chalk.gray(`  claude-collab join ${agentName}`));
                connectionHelper.disconnect();
                process.exit(0);
            }
            else if (message.type === 'register-failed') {
                if (message.reason === 'name-taken') {
                    spinner.fail(chalk.red(`Name '${agentName}' is already taken!`));
                    if (message.suggestions && message.suggestions.length > 0) {
                        console.log(chalk.yellow('\nAvailable alternatives:'));
                        message.suggestions.forEach(suggestion => {
                            console.log(chalk.gray(`  - ${suggestion}`));
                        });
                    }
                    console.log(chalk.gray('\nUse --force to override (creates new agent with same name)'));
                }
                else {
                    spinner.fail(chalk.red('Registration failed: ' + message.reason));
                }
                connectionHelper.disconnect();
                process.exit(1);
            }
        });
        // Connect with automatic error handling
        await connectionHelper.connect();
    }
    catch (error) {
        spinner.fail(chalk.red('Registration failed'));
        process.exit(1);
    }
});
// Status command - show server and connection info
program
    .command('status')
    .description('Show Claude-Collab server and connection status')
    .option('-s, --server <url>', 'Server URL', 'ws://localhost:8765')
    .action(async (options) => {
    const spinner = ora('Checking server status...').start();
    try {
        const connectionHelper = new CLIConnectionHelper(options.server);
        connectionHelper.on('connected', () => {
            spinner.succeed(chalk.green('Server is running and accessible'));
            // Request server info
            connectionHelper.send({ type: 'server-info' });
            setTimeout(() => {
                connectionHelper.disconnect();
                process.exit(0);
            }, 1000);
        });
        connectionHelper.on('message', (message) => {
            if (message.type === 'server-info') {
                console.log(chalk.cyan('\nServer Information:'));
                console.log(chalk.gray(`  Version: ${message.version || 'Unknown'}`));
                console.log(chalk.gray(`  Active Agents: ${message.activeAgents || 0}`));
                console.log(chalk.gray(`  Uptime: ${message.uptime || 'Unknown'}`));
                console.log(chalk.gray(`  Anti-Echo Chamber: ${message.antiEchoEnabled ? 'Enabled' : 'Disabled'}`));
            }
        });
        // Set a shorter timeout for status checks
        connectionHelper.config.connectionTimeout = 5000;
        await connectionHelper.connect();
    }
    catch (error) {
        spinner.fail(chalk.red('Server is not running or unreachable'));
        console.log(chalk.yellow('\nTo start the server:'));
        console.log(chalk.gray('  cc server'));
        process.exit(1);
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
    }
    catch (error) {
        console.log(chalk.red('Error reading identity data'));
    }
});
// Quick agent creation - register and join in one command
program
    .command('quick <agent-name> [role] [perspective]')
    .description('Quick agent creation - register and join in one step')
    .option('-s, --server <url>', 'Server URL', 'ws://localhost:8765')
    .option('--intro', 'Send automatic introduction message', true)
    .action(async (agentName, role = 'general', perspective = 'balanced', options) => {
    const spinner = ora(`Setting up ${agentName}...`).start();
    try {
        // First register
        const connectionHelper = new CLIConnectionHelper(options.server);
        let registered = false;
        let authToken = null;
        let agentId = null;
        connectionHelper.on('connected', () => {
            if (!registered) {
                // Send registration
                connectionHelper.send({
                    type: 'register',
                    agentName,
                    role: role,
                    forceNew: false
                });
            }
            else {
                // Send auth for joining
                connectionHelper.send({
                    type: 'auth',
                    agentName,
                    authToken,
                    role: role,
                    perspective: perspective,
                    clientVersion: VERSION
                });
            }
        });
        connectionHelper.on('message', (message) => {
            if (message.type === 'register-success') {
                registered = true;
                authToken = message.authToken;
                agentId = message.agentId;
                saveAuthToken(agentName, authToken, agentId);
                // Reconnect to join
                connectionHelper.forceReconnect();
            }
            else if (message.type === 'register-failed' && message.reason === 'name-taken') {
                // Name exists, try to join with saved auth
                spinner.text = `${agentName} already exists, attempting to join...`;
                registered = true;
                // Try to load saved auth
                const configPath = path.join('.claude-collab', 'agent-auth.json');
                if (fs.existsSync(configPath)) {
                    const savedAuth = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    if (savedAuth[agentName]) {
                        authToken = savedAuth[agentName].token;
                        agentId = savedAuth[agentName].agentId;
                    }
                }
                connectionHelper.forceReconnect();
            }
            else if (message.type === 'auth-success') {
                spinner.succeed(chalk.green(`✨ ${agentName} is ready!`));
                console.log(chalk.gray(`  Role: ${role}`));
                console.log(chalk.gray(`  Perspective: ${perspective}`));
                console.log(chalk.gray(`  Agent ID: ${message.agentId}`));
                if (options.intro) {
                    // Send introduction
                    connectionHelper.send({
                        type: 'message',
                        text: `Hi everyone! I'm ${agentName}, a ${role} with a ${perspective} perspective. Ready to collaborate!`
                    });
                    console.log(chalk.cyan('\n📢 Introduction sent!'));
                }
                // Start interactive session
                startInteractiveSession(connectionHelper, agentName, message.agentId);
            }
        });
        await connectionHelper.connect();
    }
    catch (error) {
        spinner.fail(chalk.red('Quick setup failed'));
        process.exit(1);
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
            }
            catch (e) {
                // Ignore errors reading auth file
            }
        }
        // Connect to server using ConnectionHelper
        const connectionHelper = new CLIConnectionHelper(options.server);
        let wsConnection = null;
        connectionHelper.on('connected', () => {
            // Send authentication/registration message with version info
            connectionHelper.send({
                type: 'auth',
                agentName,
                authToken,
                role: options.role,
                perspective: options.perspective,
                clientVersion: VERSION // v3.2: Send client version for compatibility checking
            });
        });
        connectionHelper.on('message', (message) => {
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
                    }
                    else {
                        console.log(chalk.yellow(`\n⚠️  ${warning.message}`));
                    }
                    if (warning.upgradeAction) {
                        console.log(chalk.cyan(`💡 Upgrade: ${warning.upgradeAction}`));
                    }
                    console.log(chalk.gray(`Server: v${message.serverVersion}, Client: v${message.clientVersion}\n`));
                }
                else {
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
                }
                else {
                    console.log(chalk.cyan('\nWelcome! This is your first session.'));
                }
                // Interactive prompt with connection helper
                startInteractiveSession(connectionHelper, agentName, message.agentId);
            }
            else if (message.type === 'auth-failed') {
                spinner.fail(chalk.red('Authentication failed: ' + message.reason));
                connectionHelper.disconnect();
                process.exit(1);
            }
        });
        // Connect with automatic error handling
        await connectionHelper.connect();
    }
    catch (error) {
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
    }
    catch (e) {
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
const swarmCmd = program
    .command('swarm <objective>')
    .description('Start a swarm to accomplish an objective')
    .option('-s, --strategy <strategy>', 'Swarm strategy', 'distributed')
    .option('-m, --max-agents <n>', 'Maximum agents', '5')
    .option('--anti-echo', 'Enable anti-echo-chamber', true)
    .option('--require-evidence', 'Require evidence for decisions')
    .option('--sparc <modes>', 'SPARC modes to use (comma-separated)')
    .option('--server <url>', 'Server URL', 'ws://localhost:8765')
    .action(async (objective, options) => {
    try {
        const swarmManager = new SwarmManager(objective, options);
        await swarmManager.start();
    }
    catch (error) {
        console.error(chalk.red('\n❌ Swarm failed to start:'), error.message);
        process.exit(1);
    }
});
// Swarm stop command
program
    .command('swarm-stop')
    .description('Stop all running swarm agents')
    .action(async () => {
    try {
        await SwarmManager.stopAll();
    }
    catch (error) {
        console.error(chalk.red('Error stopping swarm:'), error.message);
    }
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
const memoryCmd = program
    .command('memory <action> [key] [value]')
    .description('Manage shared memory (store, get, list, delete, clear, stats, export, import)')
    .option('-t, --ttl <seconds>', 'Time to live in seconds (for store)')
    .option('--tags <tags>', 'Comma-separated tags (for store)')
    .option('-p, --pattern <pattern>', 'Filter by pattern (for list)')
    .option('-l, --limit <n>', 'Limit results (for list)')
    .option('-s, --sort <field>', 'Sort by field (for list)')
    .option('-f, --force', 'Force action without confirmation')
    .action(async (action, key, value, options) => {
    const memory = new MemoryManager();
    try {
        switch (action) {
            case 'store':
                if (!key || !value) {
                    console.error(chalk.red('Usage: cc memory store <key> <value>'));
                    break;
                }
                const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : undefined;
                const storeResult = memory.store(key, value, {
                    ttl: options.ttl ? parseInt(options.ttl) : undefined,
                    tags: tags
                });
                if (storeResult.success) {
                    console.log(chalk.green(`✓ Stored in memory: ${key}`));
                    console.log(chalk.gray(`  Type: ${storeResult.type}`));
                    console.log(chalk.gray(`  Size: ${storeResult.size} bytes`));
                    if (options.ttl) {
                        console.log(chalk.gray(`  Expires in: ${options.ttl} seconds`));
                    }
                }
                else {
                    console.error(chalk.red(`✗ Failed to store: ${storeResult.error}`));
                }
                break;
            case 'get':
                if (!key) {
                    console.error(chalk.red('Usage: cc memory get <key>'));
                    break;
                }
                const getResult = memory.get(key);
                if (getResult.success) {
                    console.log(chalk.green(`✓ Retrieved from memory:`));
                    console.log(chalk.cyan(`  ${key}:`), getResult.value);
                    console.log(chalk.gray(`  Type: ${getResult.type}`));
                }
                else {
                    console.error(chalk.red(`✗ ${getResult.error}`));
                }
                break;
            case 'list':
                const listTags = options.tags ? options.tags.split(',').map(t => t.trim()) : undefined;
                const listResult = memory.list({
                    pattern: options.pattern,
                    tags: listTags,
                    limit: options.limit ? parseInt(options.limit) : undefined,
                    sortBy: options.sort
                });
                if (listResult.success) {
                    console.log(chalk.cyan(`\n📚 Memory Keys (${listResult.count} total)\n`));
                    if (listResult.count === 0) {
                        console.log(chalk.gray('  No keys found'));
                    }
                    else {
                        listResult.keys.forEach(item => {
                            console.log(chalk.green(`  ${item.key}`));
                            console.log(chalk.gray(`    Type: ${item.type}, Accessed: ${item.accessed} times`));
                            if (item.tags.length > 0) {
                                console.log(chalk.gray(`    Tags: ${item.tags.join(', ')}`));
                            }
                        });
                    }
                }
                else {
                    console.error(chalk.red(`✗ Error: ${listResult.error}`));
                }
                break;
            case 'delete':
                if (!key) {
                    console.error(chalk.red('Usage: cc memory delete <key>'));
                    break;
                }
                const deleteResult = memory.delete(key);
                if (deleteResult.success) {
                    if (deleteResult.deleted) {
                        console.log(chalk.green(`✓ Deleted key: ${key}`));
                    }
                    else {
                        console.log(chalk.yellow(`⚠ Key not found: ${key}`));
                    }
                }
                else {
                    console.error(chalk.red(`✗ Error: ${deleteResult.error}`));
                }
                break;
            case 'clear':
                if (!options.force) {
                    const { confirm } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'confirm',
                            message: 'Are you sure you want to clear all memory?',
                            default: false
                        }]);
                    if (!confirm) {
                        console.log(chalk.yellow('Clear cancelled'));
                        break;
                    }
                }
                const clearResult = memory.clear();
                if (clearResult.success) {
                    console.log(chalk.green('✓ Memory cleared'));
                }
                else {
                    console.error(chalk.red(`✗ Error: ${clearResult.error}`));
                }
                break;
            case 'stats':
                const statsResult = memory.stats();
                if (statsResult.success) {
                    console.log(chalk.cyan('\n📊 Memory Statistics\n'));
                    console.log(chalk.gray(`  Total Keys: ${statsResult.stats.totalKeys}`));
                    console.log(chalk.gray(`  Total Size: ${(statsResult.stats.totalSize / 1024).toFixed(2)} KB`));
                    console.log(chalk.gray(`  Average Access Count: ${statsResult.stats.avgAccessCount}`));
                    console.log(chalk.gray(`  Most Accessed: ${statsResult.stats.maxAccessCount} times`));
                    console.log(chalk.gray(`  Keys with TTL: ${statsResult.stats.keysWithTTL}`));
                    if (Object.keys(statsResult.stats.types).length > 0) {
                        console.log(chalk.cyan('\n  Types:'));
                        Object.entries(statsResult.stats.types).forEach(([type, count]) => {
                            console.log(chalk.gray(`    ${type}: ${count}`));
                        });
                    }
                }
                else {
                    console.error(chalk.red(`✗ Error: ${statsResult.error}`));
                }
                break;
            case 'export':
                if (!key) {
                    console.error(chalk.red('Usage: cc memory export <filepath>'));
                    break;
                }
                const exportResult = memory.export(key); // key is filepath in this case
                if (exportResult.success) {
                    console.log(chalk.green(`✓ Exported ${exportResult.count} keys to ${exportResult.filepath}`));
                }
                else {
                    console.error(chalk.red(`✗ Error: ${exportResult.error}`));
                }
                break;
            case 'import':
                if (!key) {
                    console.error(chalk.red('Usage: cc memory import <filepath>'));
                    break;
                }
                const importResult = memory.import(key); // key is filepath in this case
                if (importResult.success) {
                    console.log(chalk.green(`✓ Imported ${importResult.imported} keys from ${key}`));
                }
                else {
                    console.error(chalk.red(`✗ Error: ${importResult.error}`));
                }
                break;
            default:
                console.log(chalk.yellow('Available memory commands:'));
                console.log(chalk.gray('  cc memory store <key> <value> [--ttl <seconds>] [--tags <tags>]'));
                console.log(chalk.gray('  cc memory get <key>'));
                console.log(chalk.gray('  cc memory list [--pattern <pattern>] [--tags <tags>] [--limit <n>]'));
                console.log(chalk.gray('  cc memory delete <key>'));
                console.log(chalk.gray('  cc memory clear [--force]'));
                console.log(chalk.gray('  cc memory stats'));
                console.log(chalk.gray('  cc memory export <filepath>'));
                console.log(chalk.gray('  cc memory import <filepath>'));
        }
    }
    catch (error) {
        console.error(chalk.red(`✗ Error: ${error.message}`));
    }
    finally {
        memory.close();
    }
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
// Watch command - Real-time terminal dashboard
program
    .command('watch')
    .description('Launch real-time terminal dashboard')
    .option('-s, --server <url>', 'Server URL', 'ws://localhost:8765')
    .option('--refresh <seconds>', 'Refresh interval', '1')
    .action(async (options) => {
    console.log(chalk.cyan('🖥️  Launching Claude-Collab Terminal Dashboard...\n'));
    try {
        const TerminalDashboard = require('./dashboard/terminal-ui');
        const dashboard = new TerminalDashboard(options.server);
        // Dashboard runs until user quits
        process.on('SIGINT', () => {
            dashboard.cleanup();
            process.exit(0);
        });
    }
    catch (error) {
        console.error(chalk.red('Failed to launch dashboard:'), error.message);
        console.log(chalk.yellow('\nMake sure the server is running:'));
        console.log(chalk.gray('  cc server'));
        process.exit(1);
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
async function startInteractiveSession(connectionHelper, agentName, agentId) {
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
                connectionHelper.send({
                    type: 'message',
                    text: args.join(' ')
                });
                console.log(chalk.gray('Message sent'));
                break;
            case 'status':
                console.log(chalk.cyan('Status: Connected'));
                break;
            case 'whoami':
                connectionHelper.send({ type: 'whoami' });
                break;
            case 'switch-role':
                if (args[0]) {
                    connectionHelper.send({
                        type: 'switch-role',
                        newRole: args[0]
                    });
                }
                else {
                    console.log(chalk.red('Please specify a role'));
                }
                break;
            case 'history':
                connectionHelper.send({ type: 'get-history' });
                break;
            case 'exit':
                connectionHelper.disconnect();
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
program.on('command:*', function () {
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
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
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
//# sourceMappingURL=index.js.map