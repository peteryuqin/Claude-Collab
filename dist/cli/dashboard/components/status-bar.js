"use strict";
/**
 * Status Bar Component for Terminal Dashboard
 * Shows connection status and server information
 */
const blessed = require('blessed');
class StatusBar {
    constructor(grid, options) {
        this.options = options;
        this.widget = grid.set(options.row, options.col, options.rowSpan, options.colSpan, blessed.box, {
            height: 1,
            tags: true,
            style: {
                fg: 'white',
                bg: 'blue',
                bold: true
            }
        });
        this.status = 'initializing';
        this.message = 'Initializing dashboard...';
        this.serverInfo = {};
        this.lastUpdate = new Date();
        this.update();
        this.startClock();
    }
    setStatus(status, message) {
        this.status = status;
        this.message = message || '';
        this.lastUpdate = new Date();
        this.update();
    }
    setServerInfo(info) {
        this.serverInfo = info;
        this.update();
    }
    update() {
        const statusIcon = this.getStatusIcon();
        const statusColor = this.getStatusColor();
        const time = new Date().toLocaleTimeString();
        const content = ` ${statusIcon} Claude-Collab Monitor | {${statusColor}}${this.message}{/} | Server: v${this.serverInfo.version || '?.?.?'} | ${time} `;
        this.widget.setContent(content);
        this.widget.screen.render();
    }
    getStatusIcon() {
        switch (this.status) {
            case 'connected':
                return '{green-fg}●{/}';
            case 'connecting':
            case 'reconnecting':
                return '{yellow-fg}◐{/}';
            case 'disconnected':
            case 'error':
                return '{red-fg}●{/}';
            default:
                return '{gray-fg}●{/}';
        }
    }
    getStatusColor() {
        switch (this.status) {
            case 'connected':
                return 'green-fg';
            case 'connecting':
            case 'reconnecting':
                return 'yellow-fg';
            case 'disconnected':
            case 'error':
                return 'red-fg';
            default:
                return 'white-fg';
        }
    }
    startClock() {
        // Update clock every second
        setInterval(() => {
            this.update();
        }, 1000);
    }
    focus() {
        // Status bar is not focusable
        return false;
    }
}
module.exports = StatusBar;
//# sourceMappingURL=status-bar.js.map