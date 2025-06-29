"use strict";
/**
 * Claude-Collab Terminal Dashboard
 * Real-time monitoring interface using blessed
 *
 * Created by Alex - Frontend/UX & Testing Lead
 */
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { CLIConnectionHelper } = require('../connection-helper');
const chalk = require('chalk');
const AgentList = require('./components/agent-list');
const MessageFeed = require('./components/message-feed');
const MetricsPanel = require('./components/metrics-panel');
const StatusBar = require('./components/status-bar');
const theme = require('./themes/default');
class TerminalDashboard {
    constructor(serverUrl = 'ws://localhost:8765') {
        this.serverUrl = serverUrl;
        this.connection = null;
        this.agents = new Map();
        this.messages = [];
        this.metrics = {
            overallDiversity: 0,
            agreementRate: 0,
            evidenceRate: 0,
            activeAgents: 0,
            messagesPerMinute: 0
        };
        this.setupScreen();
        this.setupLayout();
        this.bindKeyboard();
        this.connectToServer();
    }
    setupScreen() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Claude-Collab Monitor',
            fullUnicode: true,
            autoPadding: true,
            warning: true
        });
        // Apply theme
        this.screen.style = theme.screen;
    }
    setupLayout() {
        // Create grid layout
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen
        });
        // Top bar - connection status
        this.statusBar = new StatusBar(this.grid, {
            row: 0,
            col: 0,
            rowSpan: 1,
            colSpan: 12
        });
        // Left panel - agent list
        this.agentList = new AgentList(this.grid, {
            row: 1,
            col: 0,
            rowSpan: 7,
            colSpan: 4,
            label: ' 🤖 Active Agents '
        });
        // Center panel - message feed
        this.messageFeed = new MessageFeed(this.grid, {
            row: 1,
            col: 4,
            rowSpan: 7,
            colSpan: 8,
            label: ' 💬 Live Messages '
        });
        // Bottom panel - metrics
        this.metricsPanel = new MetricsPanel(this.grid, {
            row: 8,
            col: 0,
            rowSpan: 3,
            colSpan: 12,
            label: ' 📊 Diversity Metrics '
        });
        // Bottom bar - help text
        this.helpBox = this.grid.set(11, 0, 1, 12, blessed.box, {
            content: ' {bold}q{/bold} quit | {bold}r{/bold} refresh | {bold}f{/bold} filter | {bold}c{/bold} clear | {bold}↑↓{/bold} scroll | {bold}Tab{/bold} switch panel',
            tags: true,
            style: theme.helpBar
        });
        this.screen.render();
    }
    bindKeyboard() {
        // Quit
        this.screen.key(['q', 'C-c'], () => {
            this.cleanup();
            process.exit(0);
        });
        // Refresh
        this.screen.key(['r'], () => {
            this.refresh();
        });
        // Clear messages
        this.screen.key(['c'], () => {
            this.messageFeed.clear();
            this.screen.render();
        });
        // Tab between panels
        this.screen.key(['tab'], () => {
            this.focusNext();
        });
        // Filter dialog
        this.screen.key(['f'], () => {
            this.showFilterDialog();
        });
    }
    async connectToServer() {
        this.statusBar.setStatus('connecting', 'Connecting to server...');
        try {
            this.connection = new CLIConnectionHelper(this.serverUrl);
            this.connection.on('connected', () => {
                this.statusBar.setStatus('connected', `Connected to ${this.serverUrl}`);
                // Subscribe to dashboard updates
                this.connection.send({ type: 'subscribe-dashboard' });
            });
            this.connection.on('message', (message) => {
                this.handleServerMessage(message);
            });
            this.connection.on('disconnected', () => {
                this.statusBar.setStatus('disconnected', 'Disconnected from server');
            });
            this.connection.on('reconnecting', ({ attempt, maxAttempts }) => {
                this.statusBar.setStatus('reconnecting', `Reconnecting... (${attempt}/${maxAttempts})`);
            });
            this.connection.on('error', (error) => {
                this.statusBar.setStatus('error', `Error: ${error.message}`);
            });
            await this.connection.connect();
        }
        catch (error) {
            this.statusBar.setStatus('error', `Failed to connect: ${error.message}`);
        }
    }
    handleServerMessage(message) {
        switch (message.type) {
            case 'agent-list':
                this.updateAgents(message.agents);
                break;
            case 'chat':
                this.addMessage(message);
                break;
            case 'diversity-metrics':
                this.updateMetrics(message.metrics);
                break;
            case 'session-update':
                this.handleSessionUpdate(message);
                break;
            case 'task-update':
                this.messageFeed.addSystemMessage(`📋 Task ${message.event}: ${message.task.description}`);
                break;
        }
        this.screen.render();
    }
    updateAgents(agents) {
        this.agents.clear();
        agents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });
        this.agentList.update(Array.from(this.agents.values()));
        this.metrics.activeAgents = agents.length;
    }
    addMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = {
            ...message,
            timestamp,
            formatted: `[${timestamp}] ${message.displayName || message.agentName}: ${message.text}`
        };
        this.messages.push(formattedMessage);
        this.messageFeed.addMessage(formattedMessage);
        // Calculate messages per minute
        this.updateMessageRate();
    }
    updateMetrics(metrics) {
        this.metrics = { ...this.metrics, ...metrics };
        this.metricsPanel.update(this.metrics);
    }
    handleSessionUpdate(update) {
        const { event, session } = update;
        if (event === 'joined') {
            const agent = {
                id: session.id,
                agentId: session.agentId,
                name: session.displayName,
                role: session.role,
                perspective: session.perspective,
                status: 'active',
                joinedAt: new Date()
            };
            this.agents.set(session.id, agent);
            this.messageFeed.addSystemMessage(`✅ ${session.displayName} joined (${session.role})`);
        }
        else if (event === 'left') {
            this.agents.delete(session.id);
            this.messageFeed.addSystemMessage(`👋 ${session.displayName} left`);
        }
        this.agentList.update(Array.from(this.agents.values()));
    }
    updateMessageRate() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentMessages = this.messages.filter(m => new Date(m.timestamp).getTime() > oneMinuteAgo);
        this.metrics.messagesPerMinute = recentMessages.length;
    }
    focusNext() {
        const focusable = [this.agentList, this.messageFeed];
        const current = this.screen.focused;
        const currentIndex = focusable.findIndex(w => w.widget === current);
        const nextIndex = (currentIndex + 1) % focusable.length;
        focusable[nextIndex].focus();
    }
    showFilterDialog() {
        const dialog = blessed.prompt({
            parent: this.screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' Filter Messages ',
            tags: true,
            style: theme.dialog
        });
        dialog.input('Enter filter (agent name, role, or keyword):', '', (err, value) => {
            if (!err && value) {
                this.messageFeed.setFilter(value);
            }
            this.screen.render();
        });
    }
    refresh() {
        this.messageFeed.addSystemMessage('🔄 Refreshing...');
        if (this.connection && this.connection.connected) {
            this.connection.send({ type: 'request-dashboard-data' });
        }
    }
    cleanup() {
        if (this.connection) {
            this.connection.disconnect();
        }
    }
}
module.exports = TerminalDashboard;
//# sourceMappingURL=terminal-ui.js.map