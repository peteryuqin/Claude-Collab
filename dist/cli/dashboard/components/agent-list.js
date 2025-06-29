"use strict";
/**
 * Agent List Component for Terminal Dashboard
 * Shows active agents with their status and roles
 */
const blessed = require('blessed');
const contrib = require('blessed-contrib');
class AgentList {
    constructor(grid, options) {
        this.options = options;
        this.widget = grid.set(options.row, options.col, options.rowSpan, options.colSpan, blessed.list, {
            label: options.label || ' Active Agents ',
            border: { type: 'line' },
            style: {
                border: { fg: 'cyan' },
                selected: { bg: 'blue', bold: true },
                item: { fg: 'white' },
                header: { fg: 'bright-cyan', bold: true }
            },
            keys: true,
            vi: true,
            mouse: true,
            scrollbar: {
                bg: 'blue',
                fg: 'red'
            },
            tags: true,
            interactive: true
        });
        this.agents = [];
        this.setupEvents();
    }
    setupEvents() {
        this.widget.on('select', (item, index) => {
            const agent = this.agents[index];
            if (agent) {
                this.showAgentDetails(agent);
            }
        });
    }
    update(agents) {
        this.agents = agents;
        const items = agents.map(agent => this.formatAgent(agent));
        // Add header
        items.unshift('{bold}{cyan-fg}Name         Role        Status{/}');
        items.unshift('');
        this.widget.setItems(items);
        this.widget.screen.render();
    }
    formatAgent(agent) {
        const name = this.truncate(agent.name || agent.agentName, 12);
        const role = this.truncate(agent.role || 'general', 10);
        const status = this.getStatusIcon(agent.status);
        const perspective = agent.perspective ? ` [${agent.perspective}]` : '';
        return `${status} ${name.padEnd(12)} ${role.padEnd(10)}${perspective}`;
    }
    getStatusIcon(status) {
        switch (status) {
            case 'active':
            case 'connected':
                return '{green-fg}●{/}';
            case 'busy':
                return '{yellow-fg}●{/}';
            case 'idle':
                return '{gray-fg}●{/}';
            case 'disconnected':
                return '{red-fg}●{/}';
            default:
                return '{white-fg}●{/}';
        }
    }
    truncate(str, length) {
        if (!str)
            return '';
        return str.length > length ? str.substring(0, length - 2) + '..' : str;
    }
    showAgentDetails(agent) {
        const details = blessed.message({
            parent: this.widget.screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ` Agent: ${agent.name} `,
            tags: true,
            keys: true,
            hidden: false,
            vi: true
        });
        const joinedAt = agent.joinedAt ? new Date(agent.joinedAt).toLocaleString() : 'Unknown';
        const content = `
{bold}Agent Details{/bold}

Name: ${agent.name}
ID: ${agent.agentId}
Role: ${agent.role}
Perspective: ${agent.perspective || 'None'}
Status: ${agent.status}
Joined: ${joinedAt}

{cyan-fg}Press any key to close{/}`;
        details.display(content, 0, () => {
            this.widget.screen.render();
        });
    }
    focus() {
        this.widget.focus();
    }
}
module.exports = AgentList;
//# sourceMappingURL=agent-list.js.map