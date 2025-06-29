#!/usr/bin/env node

/**
 * Claude-Collab Code Review Demo
 * Simulates a GitHub PR review with multiple agents
 * 
 * Created by Alex - Frontend/UX & Testing Lead
 */

const WebSocket = require('ws');
const chalk = require('chalk');
const { readFileSync } = require('fs');
const path = require('path');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🔍 Claude-Collab Code Review Demo 🔍            ║
║                                                        ║
║  Watch AI agents review code changes collaboratively   ║
║  with diverse perspectives and constructive feedback   ║
╚════════════════════════════════════════════════════════╝
`));

// Demo configuration
const SERVER_URL = 'ws://localhost:8765';
const REVIEWERS = [
  { 
    name: 'Elena', 
    role: 'senior-engineer',
    perspective: 'performance-focused',
    expertise: ['algorithms', 'optimization', 'scalability']
  },
  { 
    name: 'Marcus', 
    role: 'security-expert',
    perspective: 'security-minded',
    expertise: ['authentication', 'encryption', 'vulnerabilities']
  },
  { 
    name: 'Sophia', 
    role: 'ui-specialist',
    perspective: 'user-centric',
    expertise: ['accessibility', 'responsive-design', 'user-experience']
  }
];

// Simulated PR code changes
const PR_CHANGES = `
diff --git a/src/auth/login.js b/src/auth/login.js
index abc123..def456 100644
--- a/src/auth/login.js
+++ b/src/auth/login.js
@@ -12,8 +12,10 @@ export async function login(username, password) {
   try {
-    const user = await db.users.findOne({ username });
-    if (user && user.password === password) {
+    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
+    const user = await db.users.findOne({ username, password: hashedPassword });
+    if (user) {
+      // Store session in memory
+      sessions[user.id] = { loginTime: Date.now() };
       return { success: true, token: generateToken(user) };
     }
     return { success: false, error: 'Invalid credentials' };
@@ -25,7 +27,15 @@ export async function login(username, password) {
 
 function generateToken(user) {
-  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
+  // Simple token generation
+  return Buffer.from(JSON.stringify({
+    userId: user.id,
+    timestamp: Date.now()
+  })).toString('base64');
 }
+
+// Global session storage
+const sessions = {};
`;

class CodeReviewer {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.perspective = config.perspective;
    this.expertise = config.expertise;
    this.ws = null;
    this.hasReviewed = false;
  }

  async register() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`📝 Registering ${this.name}...`));
      
      const ws = new WebSocket(SERVER_URL);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: this.role
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register-success') {
          this.authToken = message.authToken;
          console.log(chalk.green(`✓ ${this.name} registered as ${this.role}`));
          ws.close();
          resolve();
        } else if (message.type === 'register-failed' && message.reason === 'name-taken') {
          console.log(chalk.gray(`ℹ ${this.name} already registered`));
          ws.close();
          resolve();
        }
      });
      
      ws.on('error', reject);
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`🔌 ${this.name} connecting...`));
      
      this.ws = new WebSocket(SERVER_URL);
      
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          type: 'auth',
          agentName: this.name,
          authToken: this.authToken,
          role: this.role,
          perspective: this.perspective,
          clientVersion: '3.2.3'
        }));
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth-success') {
          console.log(chalk.green(`✅ ${this.name} ready to review`));
          resolve();
        } else if (message.type === 'diversity-intervention') {
          console.log(chalk.red(`\n❌ ${this.name} - Diversity Intervention!`));
          console.log(chalk.yellow(`   ${message.reason}`));
          
          // Automatically provide alternative perspective
          setTimeout(() => this.provideAlternativeView(), 2000);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  review(prChanges) {
    if (this.hasReviewed) return;
    this.hasReviewed = true;

    console.log(chalk.blue(`\n💬 ${this.name} is reviewing the changes...`));
    
    // Simulate thinking time
    setTimeout(() => {
      const review = this.generateReview(prChanges);
      this.comment(review);
    }, 2000 + Math.random() * 2000);
  }

  generateReview(changes) {
    const reviews = {
      'senior-engineer': [
        "Performance concern: MD5 is computationally cheap but not secure. Consider using bcrypt or argon2 for password hashing.",
        "The global sessions object could cause memory leaks in production. We should implement session expiration and cleanup.",
        "Removing JWT in favor of base64 encoding reduces security. The timestamp in the token is not validated."
      ],
      'security-expert': [
        "CRITICAL: MD5 is cryptographically broken and should never be used for passwords! This is a severe security vulnerability.",
        "The base64 'token' provides no security - anyone can decode and modify it. We must use proper JWT with signatures.",
        "In-memory session storage means sessions are lost on restart and can't scale across multiple servers."
      ],
      'ui-specialist': [
        "The error handling changes might affect user experience. We should ensure clear error messages are shown for failed logins.",
        "Consider rate limiting to prevent brute force attacks - this impacts UX but is necessary.",
        "Session persistence is important for user experience. Memory storage means users lose sessions on server restart."
      ]
    };

    const expertiseComments = {
      'algorithms': "The O(1) session lookup is good, but consider the memory implications at scale.",
      'encryption': "Base64 is encoding, not encryption. This token can be easily forged.",
      'authentication': "Password should be salted before hashing. Consider implementing proper session management.",
      'accessibility': "Ensure login errors are properly announced to screen readers.",
      'scalability': "In-memory sessions won't work in a distributed environment."
    };

    const roleReviews = reviews[this.role] || ["Interesting changes to the authentication system."];
    const mainReview = roleReviews[Math.floor(Math.random() * roleReviews.length)];
    
    // Add expertise-specific comment
    const relevantExpertise = this.expertise.find(exp => 
      Object.keys(expertiseComments).includes(exp)
    );
    
    if (relevantExpertise && Math.random() > 0.5) {
      return `${mainReview} Additionally, ${expertiseComments[relevantExpertise]}`;
    }
    
    return mainReview;
  }

  comment(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(chalk.cyan(`💬 ${this.name}: "${text}"`));
      this.ws.send(JSON.stringify({
        type: 'message',
        text
      }));
    }
  }

  provideAlternativeView() {
    const alternatives = {
      'performance-focused': "From a performance standpoint, we could use a distributed cache like Redis for sessions.",
      'security-minded': "We should implement OAuth2 or similar standard instead of custom authentication.",
      'user-centric': "Consider implementing 'remember me' functionality with secure, httpOnly cookies."
    };
    
    this.comment(alternatives[this.perspective] || "Let me think about this from a different angle...");
  }

  approve() {
    this.comment("✅ Approved with the suggested changes implemented.");
  }

  requestChanges() {
    this.comment("❌ Requesting changes - the security issues must be addressed before merging.");
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Main demo flow
async function runDemo() {
  try {
    // Check server status
    console.log(chalk.yellow('\n🔍 Checking server status...'));
    
    try {
      const testWs = new WebSocket(SERVER_URL);
      await new Promise((resolve, reject) => {
        testWs.on('open', () => {
          testWs.close();
          resolve();
        });
        testWs.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 2000);
      });
    } catch (error) {
      console.log(chalk.red('❌ Server not running!'));
      console.log(chalk.yellow('💡 Starting server...'));
      
      const { spawn } = require('child_process');
      const serverProcess = spawn('cc', ['server'], {
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(chalk.green('✅ Server is running'));

    // Create reviewers
    const reviewers = REVIEWERS.map(config => new CodeReviewer(config));
    
    // Register all reviewers
    for (const reviewer of reviewers) {
      await reviewer.register();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Connect all reviewers
    for (const reviewer of reviewers) {
      await reviewer.connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(chalk.cyan('\n📋 PR #1234: Update authentication system'));
    console.log(chalk.gray('Branch: feature/update-auth → main'));
    console.log(chalk.gray('Author: developer-bot'));
    console.log(chalk.gray('Files changed: 1 | +15 -3'));

    console.log(chalk.yellow('\n--- Code Changes ---'));
    console.log(chalk.gray(PR_CHANGES));

    console.log(chalk.cyan('\n🎬 Starting code review...\n'));

    // Initial review comments
    await new Promise(resolve => setTimeout(resolve, 2000));
    reviewers[0].comment("I'll review this from a performance perspective.");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    reviewers[1].comment("Let me check the security implications.");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    reviewers[2].comment("I'll focus on the user experience impact.");

    // Main reviews
    for (const reviewer of reviewers) {
      reviewer.review(PR_CHANGES);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Discussion phase
    await new Promise(resolve => setTimeout(resolve, 3000));
    reviewers[0].comment("I agree with the security concerns. We need proper hashing.");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    reviewers[2].comment("Yes, and we should add user-friendly error messages for common issues.");

    // Consensus building
    await new Promise(resolve => setTimeout(resolve, 3000));
    reviewers[1].comment("Suggested implementation: bcrypt for passwords, Redis for sessions, keep JWT for tokens.");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    reviewers[0].comment("That would address both security and scalability. +1");

    // Final decisions
    await new Promise(resolve => setTimeout(resolve, 3000));
    for (const reviewer of reviewers) {
      reviewer.requestChanges();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(chalk.green('\n\n✨ Code Review Complete!'));
    console.log(chalk.yellow('\nReview Summary:'));
    console.log(chalk.gray('• 3 reviewers provided feedback'));
    console.log(chalk.gray('• Critical security issues identified'));
    console.log(chalk.gray('• Performance and scalability concerns raised'));
    console.log(chalk.gray('• Consensus reached on improvements'));
    console.log(chalk.gray('• All reviewers requested changes'));

    console.log(chalk.cyan('\n🎯 Key Benefits Demonstrated:'));
    console.log(chalk.gray('1. Multiple perspectives catch different issues'));
    console.log(chalk.gray('2. Collaborative discussion leads to better solutions'));
    console.log(chalk.gray('3. Anti-echo-chamber ensures thorough review'));
    console.log(chalk.gray('4. Consensus building improves code quality'));

    console.log(chalk.cyan('\n🚀 Try it yourself:'));
    console.log(chalk.gray('   cc server              # Start server'));
    console.log(chalk.gray('   cc watch               # Monitor reviews'));
    console.log(chalk.gray('   cc join <name> --role reviewer'));

    // Cleanup
    reviewers.forEach(reviewer => reviewer.disconnect());
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n❌ Demo error:'), error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();