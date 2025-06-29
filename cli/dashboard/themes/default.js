/**
 * Default Theme for Claude-Collab Terminal Dashboard
 * Defines colors and styles for the UI
 */

module.exports = {
  screen: {
    bg: 'black',
    fg: 'white'
  },
  
  box: {
    border: {
      fg: 'cyan'
    },
    focus: {
      border: {
        fg: 'green'
      }
    }
  },
  
  list: {
    item: {
      fg: 'white',
      bg: 'black'
    },
    selected: {
      fg: 'black',
      bg: 'cyan',
      bold: true
    }
  },
  
  log: {
    fg: 'white',
    bg: 'black',
    scrollbar: {
      bg: 'blue',
      fg: 'cyan'
    }
  },
  
  dialog: {
    border: {
      fg: 'green'
    },
    shadow: true
  },
  
  helpBar: {
    fg: 'black',
    bg: 'white',
    bold: true
  },
  
  // Color palette
  colors: {
    primary: 'cyan',
    secondary: 'magenta',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    muted: 'gray'
  },
  
  // Status colors
  status: {
    active: 'green',
    idle: 'gray',
    busy: 'yellow',
    error: 'red'
  },
  
  // Message type colors
  messageTypes: {
    chat: 'white',
    system: 'gray',
    error: 'red',
    warning: 'yellow',
    success: 'green',
    task: 'magenta',
    diversity: 'cyan'
  }
};