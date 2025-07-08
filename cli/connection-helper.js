/**
 * Connection Helper for Claude-Collab CLI
 * Provides easy-to-use connection management with auto-reconnection
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class CLIConnectionHelper extends EventEmitter {
  constructor(serverUrl) {
    super();
    this.serverUrl = serverUrl;
    this.ws = null;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 10000;
    this.reconnectBackoffMultiplier = 1.5;
    this.messageQueue = [];
    this.isConnected = false;
    this.isReconnecting = false;
    this.manualDisconnect = false;
  }

  /**
   * Connect to server with automatic retry
   */
  async connect() {
    console.log('- Connecting to server...');
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        let connectionTimeout;
        
        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          console.log('✔ Connected to server');
          this.isConnected = true;
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Process queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.send(msg);
          }
          
          this.emit('connected', { 
            reconnected: this.reconnectAttempts > 0,
            attemptCount: this.reconnectAttempts 
          });
          resolve(this);
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });
        
        this.ws.on('close', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          if (!this.manualDisconnect && !this.isReconnecting) {
            console.log('⚠ Disconnected from server');
            this.emit('disconnected', { manual: false });
            this.attemptReconnect();
          } else if (this.manualDisconnect) {
            this.emit('disconnected', { manual: true });
          }
        });
        
        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          if (error.code === 'ECONNREFUSED') {
            this.emit('serverUnavailable', {
              message: 'Server is not running',
              suggestion: 'Please start the server with: cc server'
            });
            if (!this.isReconnecting) {
              reject(error);
            }
          } else {
            this.emit('error', error);
            if (!this.isReconnecting) {
              reject(error);
            }
          }
        });
        
        // Connection timeout
        connectionTimeout = setTimeout(() => {
          if (!this.isConnected && !this.isReconnecting) {
            this.ws.close();
            this.emit('connectionTimeout', {
              message: 'Connection timeout',
              suggestion: 'Check if the server is running on the correct port'
            });
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        this.handleConnectionError(error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async attemptReconnect() {
    if (this.isReconnecting || this.manualDisconnect) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
      console.error(`\n❌ Failed to reconnect after ${this.reconnectAttempts} attempts`);
      console.log('💡 Please check the server status and try again\n');
      process.exit(1);
      return;
    }
    
    console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts 
    });
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    // Increase delay for next attempt
    this.reconnectDelay = Math.min(
      this.reconnectDelay * this.reconnectBackoffMultiplier,
      this.maxReconnectDelay
    );
    
    try {
      await this.connect();
    } catch (error) {
      // Connection failed, will retry automatically
    }
  }

  /**
   * Send a message to the server
   */
  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message for later
      this.messageQueue.push(data);
      this.emit('messageQueued', { queueLength: this.messageQueue.length });
      console.log(`📋 Message queued (${this.messageQueue.length} in queue)`);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.manualDisconnect = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Force reconnect
   */
  forceReconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.manualDisconnect = false;
    this.isReconnecting = false;
    return this.connect();
  }

  /**
   * Get connection state
   */
  getState() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  /**
   * Handle connection errors with user-friendly messages
   */
  handleConnectionError(error) {
    const errorMessages = {
      'ECONNREFUSED': {
        message: 'Cannot connect to Claude-Collab server',
        solution: "Run 'cc server' in another terminal to start the server"
      },
      'ENOTFOUND': {
        message: 'Server address not found',
        solution: 'Check your server URL or network connection'
      },
      'ETIMEDOUT': {
        message: 'Connection timed out',
        solution: 'Check if the server is running and accessible'
      },
      'ECONNRESET': {
        message: 'Connection was reset',
        solution: 'The server may have restarted. Try reconnecting.'
      }
    };

    const errorInfo = errorMessages[error.code] || {
      message: `Connection error: ${error.message}`,
      solution: 'Check your network connection and server status'
    };

    console.error(`\n❌ ${errorInfo.message}`);
    console.log(`💡 ${errorInfo.solution}\n`);
  }
}

/**
 * Create connection with defaults
 */
async function createConnection(serverUrl = 'ws://localhost:8765') {
  const helper = new CLIConnectionHelper(serverUrl);
  await helper.connect();
  return helper;
}

module.exports = {
  CLIConnectionHelper,
  createConnection
};