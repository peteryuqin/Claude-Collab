"use strict";
/**
 * Enhanced Join Command with Connection Stability
 * Uses ConnectionWrapper for automatic reconnection and better error handling
 *
 * Created by Alex - Connection Expert
 */
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const ConnectionWrapper = require('./connection-wrapper');
async function enhancedJoin(agentName, options, VERSION) {
    let spinner = ora(`Connecting to server as ${agentName}...`).start();
    let connection = null;
    let rl = null;
    let isAuthenticated = false;
    try {
        // Check for saved auth token
        const configPath = path.join('.claude-collab', 'agent-auth.json');
        let authToken = options.token;
        if (!authToken && !options.newAgent && fs.existsSync(configPath)) {
            try {
                const savedAuth = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (savedAuth[agentName]) {
                    authToken = savedAuth[agentName].token;
                    console.log(chalk.gray('\nUsing saved authentication token'));
                }
            }
            catch (e) {
                // Ignore errors reading auth file
            }
        }
        // Create connection with auto-reconnect
        connection = new ConnectionWrapper({
            url: options.server,
            enableAutoReconnect: true,
            maxReconnectAttempts: 10,
            initialReconnectDelay: 1000,
            maxReconnectDelay: 30000
        });
        // Connection event handlers
        connection.on('connecting', ({ url }) => {
            if (isAuthenticated) {
                console.log(chalk.yellow('\n🔄 Reconnecting to server...'));
            }
        });
        connection.on('connected', ({ reconnected }) => {
            if (reconnected && isAuthenticated) {
                console.log(chalk.green('✅ Reconnected successfully!'));
                // Re-authenticate after reconnection
                connection.send({
                    type: 'auth',
                    agentName,
                    authToken,
                    role: options.role,
                    perspective: options.perspective,
                    clientVersion: VERSION
                });
            }
            else if (!isAuthenticated) {
                // First connection - send auth
                connection.send({
                    type: 'auth',
                    agentName,
                    authToken,
                    role: options.role,
                    perspective: options.perspective,
                    clientVersion: VERSION
                });
            }
        });
        connection.on('serverUnavailable', ({ message, suggestion }) => {
            if (!isAuthenticated) {
                spinner.fail(chalk.red(message));
                console.log(chalk.yellow(`💡 ${suggestion}`));
            }
            else {
                console.log(chalk.red(`\n❌ ${message}`));
                console.log(chalk.yellow(`💡 ${suggestion}`));
            }
        });
        connection.on('reconnecting', ({ attempt, maxAttempts, delay }) => {
            console.log(chalk.yellow(`\n🔄 Reconnection attempt ${attempt}/${maxAttempts} in ${delay / 1000}s...`));
        });
        connection.on('reconnectFailed', ({ attempts }) => {
            console.log(chalk.red(`\n❌ Failed to reconnect after ${attempts} attempts`));
            console.log(chalk.yellow('💡 Please check if the server is running and try again'));
            process.exit(1);
        });
        connection.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                // Handle gracefully - connection wrapper will retry
            }
            else if (!isAuthenticated) {
                spinner.fail(chalk.red('Connection error: ' + error.message));
            }
            else {
                console.log(chalk.red('\n❌ Connection error: ' + error.message));
            }
        });
        connection.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'auth-success') {
                isAuthenticated = true;
                spinner.succeed(chalk.green(`Connected as ${agentName}`));
                console.log(chalk.gray(`Agent ID: ${message.agentId}`));
                console.log(chalk.gray(`Role: ${options.role}`));
                if (options.perspective) {
                    console.log(chalk.gray(`Perspective: ${options.perspective}`));
                }
                // Display version information and warnings
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
                    authToken = message.authToken; // Update for reconnections
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
                // Start interactive session with enhanced connection
                startEnhancedInteractiveSession(connection, agentName, message.agentId);
            }
            else if (message.type === 'auth-failed') {
                isAuthenticated = false;
                spinner.fail(chalk.red('Authentication failed: ' + message.reason));
                connection.disconnect();
                process.exit(1);
            }
            else if (isAuthenticated) {
                // Handle other message types
                handleIncomingMessage(message);
            }
        });
        connection.on('disconnected', ({ code, reason }) => {
            if (code === 1000) {
                // Clean disconnect
                console.log(chalk.yellow('\n👋 Disconnected from server'));
                process.exit(0);
            }
            else if (isAuthenticated && connection.config.enableAutoReconnect) {
                console.log(chalk.yellow(`\n⚠️  Connection lost (${reason || 'unknown reason'})`));
            }
        });
        // Connect to server
        await connection.connect();
    }
    catch (error) {
        if (spinner)
            spinner.fail(chalk.red('Failed to establish connection'));
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
    }
}
function startEnhancedInteractiveSession(connection, agentName, agentId) {
    console.log(chalk.cyan('\nInteractive mode started. Type "help" for commands.\n'));
    console.log(chalk.green('✨ Connection is protected with auto-reconnect!'));
    const readline = require('readline');
    const rl = readline.createInterface({
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
                console.log(chalk.gray('  status             - Show connection status'));
                console.log(chalk.gray('  whoami             - Show your identity'));
                console.log(chalk.gray('  reconnect          - Force reconnection'));
                console.log(chalk.gray('  exit               - Disconnect\n'));
                break;
            case 'say':
                if (args.length > 0) {
                    connection.send({
                        type: 'message',
                        text: args.join(' ')
                    });
                    console.log(chalk.gray('Message sent'));
                }
                else {
                    console.log(chalk.red('Please provide a message'));
                }
                break;
            case 'status':
                const state = connection.isConnected ? 'Connected' : 'Disconnected';
                const health = connection.isConnected ? chalk.green(state) : chalk.red(state);
                console.log(chalk.cyan('Status: ') + health);
                if (connection.reconnectAttempts > 0) {
                    console.log(chalk.gray(`Reconnect attempts: ${connection.reconnectAttempts}`));
                }
                break;
            case 'whoami':
                connection.send({ type: 'whoami' });
                break;
            case 'reconnect':
                console.log(chalk.yellow('Forcing reconnection...'));
                connection.ws.close();
                break;
            case 'exit':
                connection.disconnect();
                process.exit(0);
                break;
            default:
                if (command) {
                    console.log(chalk.red(`Unknown command: ${command}`));
                }
        }
        rl.prompt();
    });
    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
        console.log(chalk.yellow('\n\nGracefully disconnecting...'));
        connection.disconnect();
        process.exit(0);
    });
}
function handleIncomingMessage(message) {
    switch (message.type) {
        case 'chat':
            console.log(chalk.green(`\n💬 ${message.displayName || message.sessionName}: ${message.text}\n`));
            break;
        case 'identity-card':
            displayIdentityCard(message.card);
            break;
        case 'diversity-intervention':
            console.log(chalk.red('\n⚠️  Diversity Intervention Required:'));
            console.log(chalk.yellow(`  Reason: ${message.reason}`));
            console.log(chalk.cyan(`  Action: ${message.requiredAction}\n`));
            break;
        case 'task-update':
            console.log(chalk.blue(`\n📋 Task ${message.event}: ${message.task.description}\n`));
            break;
        case 'session-update':
            if (message.event === 'joined') {
                console.log(chalk.green(`\n✅ ${message.session.displayName} joined the session\n`));
            }
            else if (message.event === 'left') {
                console.log(chalk.yellow(`\n👋 ${message.session.displayName} left the session\n`));
            }
            break;
        case 'diversity-metrics':
            console.log(chalk.cyan('\n📊 Diversity Metrics Update:'));
            console.log(chalk.gray(`  Overall diversity: ${(message.metrics.overallDiversity * 100).toFixed(1)}%`));
            console.log(chalk.gray(`  Agreement rate: ${(message.metrics.agreementRate * 100).toFixed(1)}%`));
            break;
    }
}
function displayIdentityCard(card) {
    console.log(chalk.cyan('\n🆔 Identity Card\n'));
    console.log(chalk.green(`Name: ${card.displayName}`));
    console.log(chalk.gray(`ID: ${card.agentId}`));
    console.log(chalk.gray(`Role: ${card.currentRole}`));
    console.log(chalk.gray(`Perspective: ${card.currentPerspective || 'None'}`));
    console.log(chalk.gray(`Member since: ${card.daysSinceJoined} days ago`));
    if (card.rank) {
        console.log(chalk.yellow(`\nRank: ${card.rank.title} (Level ${card.rank.level})`));
    }
    if (card.badges && card.badges.length > 0) {
        console.log(chalk.cyan('\nBadges:'));
        card.badges.forEach(badge => console.log(`  ${badge}`));
    }
    console.log(chalk.cyan('\nStats:'));
    console.log(chalk.gray(`  Sessions: ${card.stats.totalSessions}`));
    console.log(chalk.gray(`  Messages: ${card.stats.totalMessages}`));
    console.log(chalk.gray(`  Tasks: ${card.stats.totalTasks}`));
    console.log(chalk.gray(`  Edits: ${card.stats.totalEdits}`));
    if (card.recommendations && card.recommendations.length > 0) {
        console.log(chalk.yellow('\nRecommendations:'));
        card.recommendations.forEach(rec => console.log(chalk.gray(`  • ${rec}`)));
    }
    console.log();
}
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
module.exports = { enhancedJoin };
//# sourceMappingURL=enhanced-join.js.map