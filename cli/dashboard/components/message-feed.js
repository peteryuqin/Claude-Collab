/**
 * Message Feed Component for Terminal Dashboard
 * Shows real-time messages from agents with filtering
 */

const blessed = require('blessed');

class MessageFeed {
  constructor(grid, options) {
    this.options = options;
    this.messages = [];
    this.filter = null;
    
    this.widget = grid.set(
      options.row,
      options.col,
      options.rowSpan,
      options.colSpan,
      blessed.log,
      {
        label: options.label || ' Live Messages ',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          scrollbar: { bg: 'blue' }
        },
        scrollable: true,
        alwaysScroll: true,
        mouse: true,
        keys: true,
        vi: true,
        scrollbar: {
          ch: ' ',
          inverse: true
        },
        tags: true
      }
    );

    this.setupEvents();
  }

  setupEvents() {
    // Allow scrolling with mouse wheel
    this.widget.on('wheeldown', () => {
      this.widget.scroll(2);
      this.widget.screen.render();
    });

    this.widget.on('wheelup', () => {
      this.widget.scroll(-2);
      this.widget.screen.render();
    });
  }

  addMessage(message) {
    this.messages.push(message);
    
    if (this.shouldDisplay(message)) {
      const formatted = this.formatMessage(message);
      this.widget.log(formatted);
    }
    
    // Keep only last 1000 messages
    if (this.messages.length > 1000) {
      this.messages.shift();
    }
  }

  addSystemMessage(text) {
    const message = {
      type: 'system',
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    this.addMessage(message);
  }

  formatMessage(message) {
    const time = message.timestamp || new Date().toLocaleTimeString();
    
    if (message.type === 'system') {
      return `{gray-fg}[${time}] {yellow-fg}SYSTEM{/} {gray-fg}${message.text}{/}`;
    }
    
    const role = message.role ? `{magenta-fg}[${message.role}]{/}` : '';
    const perspective = message.perspective ? `{blue-fg}(${message.perspective}){/}` : '';
    const name = message.displayName || message.agentName || 'Unknown';
    
    // Color-code based on message type
    let nameColor = 'green-fg';
    if (message.type === 'diversity-intervention') {
      nameColor = 'red-fg';
    } else if (message.type === 'task-update') {
      nameColor = 'yellow-fg';
    }
    
    return `{gray-fg}[${time}]{/} {${nameColor}}${name}{/}${role}${perspective}: ${this.highlightKeywords(message.text)}`;
  }

  highlightKeywords(text) {
    // Highlight important keywords
    const keywords = {
      'agree': 'green-fg',
      'disagree': 'red-fg',
      'evidence': 'yellow-fg',
      'propose': 'cyan-fg',
      'task': 'magenta-fg',
      'error': 'red-fg',
      'success': 'green-fg',
      'warning': 'yellow-fg'
    };
    
    let highlighted = text;
    Object.entries(keywords).forEach(([word, color]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `{${color}}$&{/}`);
    });
    
    return highlighted;
  }

  shouldDisplay(message) {
    if (!this.filter) return true;
    
    const searchText = this.filter.toLowerCase();
    const messageText = JSON.stringify(message).toLowerCase();
    
    return messageText.includes(searchText);
  }

  setFilter(filter) {
    this.filter = filter;
    this.refresh();
  }

  clear() {
    this.widget.setContent('');
    this.messages = [];
    this.addSystemMessage('Message feed cleared');
  }

  refresh() {
    this.widget.setContent('');
    
    // Re-display all messages with current filter
    this.messages.forEach(message => {
      if (this.shouldDisplay(message)) {
        const formatted = this.formatMessage(message);
        this.widget.log(formatted);
      }
    });
    
    if (this.filter) {
      this.widget.setLabel(` 💬 Live Messages [Filter: ${this.filter}] `);
    } else {
      this.widget.setLabel(` 💬 Live Messages `);
    }
  }

  focus() {
    this.widget.focus();
  }
}

module.exports = MessageFeed;