const WebSocket = require('ws');

// Practical Demo: Code Review with Multiple Perspectives
class CodeReviewer {
  constructor(name, focus) {
    this.name = name;
    this.focus = focus;
    this.ws = null;
    this.messageCount = 0;
  }

  async connect() {
    return new Promise((resolve) => {
      // Register
      const regWs = new WebSocket('ws://localhost:8765');
      
      regWs.on('open', () => {
        regWs.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: 'reviewer'
        }));
      });

      regWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'register-success') {
          const authToken = msg.authToken;
          regWs.close();
          
          // Authenticate
          this.ws = new WebSocket('ws://localhost:8765');
          this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
              type: 'auth',
              agentName: this.name,
              authToken: authToken,
              role: 'reviewer'
            }));
          });
          
          this.ws.on('message', (authData) => {
            const authMsg = JSON.parse(authData.toString());
            if (authMsg.type === 'auth-success') {
              console.log(`✓ ${this.name} joined the review team`);
              resolve();
            }
            this.handleMessage(authMsg);
          });
        }
      });
    });
  }

  handleMessage(msg) {
    if (msg.type === 'diversity-warning') {
      console.log(`\n⚠️  ${this.name} received warning: ${msg.reason}`);
      console.log(`   Suggestion: Try to provide unique insights from ${this.focus} perspective`);
    } else if (msg.type === 'chat' && msg.sender !== this.name) {
      console.log(`\n💬 ${msg.sender}: ${msg.text.substring(0, 100)}...`);
    }
  }

  async reviewCode() {
    const reviews = {
      security: {
        text: `🔒 Security Review of Authentication Module:

CRITICAL ISSUES:
1. SQL Injection vulnerability in login query
   - User input directly concatenated to SQL
   - Fix: Use parameterized queries
   
2. Passwords stored in plain text
   - Major security risk
   - Fix: Use bcrypt with salt rounds >= 10

3. No rate limiting on login attempts
   - Allows brute force attacks
   - Fix: Implement express-rate-limit

RECOMMENDATIONS:
- Add JWT token expiration
- Implement 2FA support
- Log security events for monitoring`,
        evidence: {
          source: 'OWASP Top 10 2023',
          confidence: 'high'
        }
      },
      
      performance: {
        text: `⚡ Performance Review of Authentication Module:

BOTTLENECKS FOUND:
1. Synchronous bcrypt operations
   - Blocks event loop during login
   - Impact: 200ms+ latency per request
   - Fix: Use bcrypt.async methods

2. N+1 query problem in permission checks
   - Separate query for each permission
   - Fix: JOIN user_permissions in initial query

3. No caching of session data
   - Database hit on every request
   - Fix: Implement Redis session store

METRICS:
- Current avg response: 350ms
- Expected after fixes: 50ms
- 7x performance improvement possible`,
        evidence: {
          source: 'Load testing results',
          data: 'Average of 1000 requests'
        }
      },
      
      architecture: {
        text: `🏗️ Architecture Review of Authentication Module:

DESIGN CONCERNS:
1. Tight coupling to Express framework
   - Hard to test in isolation
   - Fix: Extract auth logic to service layer

2. No separation of concerns
   - Validation, auth, and DB queries mixed
   - Fix: Implement clean architecture layers

3. Missing abstraction for auth providers
   - Hard to add OAuth, SAML, etc.
   - Fix: Strategy pattern for auth methods

PROPOSED STRUCTURE:
├── controllers/ (HTTP handling)
├── services/ (business logic)
├── repositories/ (data access)
└── providers/ (auth strategies)`,
        evidence: {
          source: 'Clean Architecture principles',
          reference: 'Martin, R. (2017)'
        }
      },
      
      bestpractices: {
        text: `📋 Best Practices Review of Authentication Module:

CODE QUALITY ISSUES:
1. Inconsistent error handling
   - Some errors caught, others thrown
   - Fix: Centralized error handler

2. No input validation schema
   - Manual checks scattered in code
   - Fix: Use Joi or Zod for validation

3. Missing comprehensive tests
   - Only 30% code coverage
   - Fix: Add unit and integration tests

4. Poor logging and monitoring
   - No structured logging
   - Fix: Use Winston with correlation IDs

POSITIVE ASPECTS:
✓ Good variable naming
✓ Decent code comments
✓ Follows project style guide`,
        evidence: {
          source: 'ESLint and SonarQube analysis',
          metrics: 'Code quality score: C'
        }
      }
    };

    const review = reviews[this.focus];
    
    // Send the review
    this.ws.send(JSON.stringify({
      type: 'message',
      text: review.text,
      evidence: review.evidence
    }));
    
    this.messageCount++;
    console.log(`\n📝 ${this.name} posted ${this.focus} review`);
  }

  async agreeWithSomeone() {
    // Test if agreement is blocked in non-practical mode
    this.ws.send(JSON.stringify({
      type: 'message',
      text: 'I completely agree with the security concerns raised. These are critical issues.',
      evidence: null
    }));
    
    this.messageCount++;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runPracticalDemo() {
  console.log('\n🚀 Claude-Collab Practical Demo: Code Review\n');
  console.log('This demo shows how practical mode allows constructive collaboration\n');
  console.log('while still encouraging diverse perspectives.\n');

  // Create review team
  const reviewers = [
    new CodeReviewer('alex-security', 'security'),
    new CodeReviewer('sam-performance', 'performance'),
    new CodeReviewer('jordan-architecture', 'architecture'),
    new CodeReviewer('taylor-practices', 'bestpractices')
  ];

  // Connect all reviewers
  for (const reviewer of reviewers) {
    await reviewer.connect();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📋 Starting code review of authentication module...\n');

  // Each reviewer posts their perspective
  for (let i = 0; i < reviewers.length; i++) {
    setTimeout(() => {
      reviewers[i].reviewCode();
    }, i * 3000);
  }

  // After reviews, test if agreement is allowed with evidence
  setTimeout(() => {
    console.log('\n🤝 Testing agreement with evidence...');
    reviewers[2].agreeWithSomeone();
  }, 13000);

  // Summary
  setTimeout(() => {
    console.log('\n✅ Code Review Complete!\n');
    console.log('Summary of insights:');
    console.log('- Security: Critical vulnerabilities found');
    console.log('- Performance: 7x improvement possible');
    console.log('- Architecture: Needs refactoring for maintainability');
    console.log('- Best Practices: Improve testing and error handling\n');
    console.log('In PRACTICAL MODE:');
    console.log('✓ All perspectives were shared without blocking');
    console.log('✓ Agreement was allowed when appropriate');
    console.log('✓ Warnings encouraged diversity without disrupting flow\n');
    
    reviewers.forEach(r => r.close());
    process.exit(0);
  }, 16000);
}

runPracticalDemo().catch(console.error);