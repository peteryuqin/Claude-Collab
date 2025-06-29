#!/usr/bin/env node

/**
 * Claude-Collab Anti-Echo Chamber Demo
 * Demonstrates enforced diversity in decision-making
 * 
 * Created by Alex - Frontend/UX & Testing Lead
 */

const WebSocket = require('ws');
const chalk = require('chalk');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║     🛡️  Claude-Collab Anti-Echo Chamber Demo 🛡️        ║
║                                                        ║
║  Watch how Claude-Collab prevents groupthink and      ║
║  enforces diverse perspectives in decision-making      ║
╚════════════════════════════════════════════════════════╝
`));

// Demo configuration
const SERVER_URL = 'ws://localhost:8765';

// Decision scenarios
const SCENARIOS = [
  {
    title: "Technology Stack Decision",
    question: "Should we migrate our monolith to microservices?",
    context: "Our e-commerce platform has 500k daily users and 20 developers"
  },
  {
    title: "Remote Work Policy",
    question: "Should we go fully remote or maintain hybrid model?",
    context: "Tech company with 200 employees across 3 time zones"
  },
  {
    title: "AI Implementation Strategy", 
    question: "Should we build AI capabilities in-house or use third-party services?",
    context: "Mid-size fintech with strong engineering team but limited AI expertise"
  }
];

// Decision makers with different biases
const DECISION_MAKERS = [
  {
    name: 'TechLead',
    role: 'tech-lead',
    perspective: 'innovation-driven',
    bias: 'prefers cutting-edge solutions'
  },
  {
    name: 'ProductMgr',
    role: 'product-manager',
    perspective: 'user-focused',
    bias: 'prioritizes user experience'
  },
  {
    name: 'FinanceDir',
    role: 'finance-director',
    perspective: 'cost-conscious',
    bias: 'focuses on ROI and budget'
  },
  {
    name: 'SecOps',
    role: 'security-ops',
    perspective: 'risk-averse',
    bias: 'emphasizes security and stability'
  },
  {
    name: 'TeamLead',
    role: 'team-lead',
    perspective: 'people-centric',
    bias: 'considers team morale and skills'
  }
];

class DecisionMaker {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.perspective = config.perspective;
    this.bias = config.bias;
    this.ws = null;
    this.interventionCount = 0;
    this.hasProvidedEvidence = false;
    this.hasDisagreed = false;
  }

  async register() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`📝 ${this.name} joining decision panel...`));
      
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
          console.log(chalk.green(`✓ ${this.name} ready (${this.perspective})`));
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
          console.log(chalk.green(`✅ ${this.name} connected`));
          resolve();
        } else if (message.type === 'diversity-intervention') {
          this.handleIntervention(message);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  handleIntervention(message) {
    this.interventionCount++;
    console.log(chalk.red(`\n🛑 INTERVENTION for ${this.name}!`));
    console.log(chalk.yellow(`   Reason: ${message.reason}`));
    console.log(chalk.yellow(`   Required: ${message.requiredAction}`));
    console.log(chalk.gray(`   (Intervention #${this.interventionCount} for this agent)`));
    
    // Respond to intervention
    setTimeout(() => {
      if (message.requiredAction.includes('disagree')) {
        this.provideDisagreement();
      } else if (message.requiredAction.includes('evidence')) {
        this.provideEvidence();
      } else if (message.requiredAction.includes('alternative')) {
        this.provideAlternative();
      }
    }, 2000);
  }

  initialResponse(scenario, agreeable = false) {
    const responses = {
      'innovation-driven': {
        microservices: agreeable ? 
          "Microservices are definitely the way to go! Modern architecture!" :
          "Microservices would give us better scalability and team autonomy",
        remote: agreeable ?
          "Full remote is the future! Let's embrace it completely!" :
          "Remote work enables hiring the best talent globally",
        ai: agreeable ?
          "We must build everything in-house! Full control!" :
          "Building in-house gives us competitive advantage and customization"
      },
      'user-focused': {
        microservices: "This could improve feature delivery speed for users",
        remote: "We need to consider how this affects user support and collaboration",
        ai: "Whatever gets AI features to users fastest with best experience"
      },
      'cost-conscious': {
        microservices: "The migration cost and increased infrastructure overhead concerns me",
        remote: "Remote could save office costs but may impact productivity",
        ai: "Third-party services would be more cost-effective initially"
      },
      'risk-averse': {
        microservices: "This introduces significant security complexity and attack surface",
        remote: "Hybrid maintains security controls while offering flexibility",
        ai: "Third-party services have proven security but create dependencies"
      },
      'people-centric': {
        microservices: "We need to consider the learning curve for our team",
        remote: "Team cohesion and mentoring suffer in fully remote settings",
        ai: "Our team would grow more by building some capabilities internally"
      }
    };

    const scenarioKey = scenario.title.includes('Technology') ? 'microservices' :
                       scenario.title.includes('Remote') ? 'remote' : 'ai';
    
    const response = responses[this.perspective]?.[scenarioKey] || 
                    "I need to think about this...";
    
    this.say(response);
  }

  provideDisagreement() {
    this.hasDisagreed = true;
    const disagreements = {
      'innovation-driven': [
        "Actually, let me play devil's advocate here...",
        "But we should also consider the downsides of this approach",
        "Innovation for innovation's sake isn't always the answer"
      ],
      'user-focused': [
        "However, users might actually prefer stability over change",
        "We might be assuming what users want without data",
        "Let's consider the user segments who might be negatively impacted"
      ],
      'cost-conscious': [
        "Though I'm concerned about costs, there's value in other perspectives",
        "The long-term benefits might outweigh short-term costs",
        "We should factor in opportunity costs as well"
      ],
      'risk-averse': [
        "While security is crucial, we can't let fear paralyze us",
        "There are ways to mitigate these risks effectively",
        "Sometimes calculated risks are necessary for growth"
      ],
      'people-centric': [
        "Different team members might view this differently",
        "We should survey the team rather than assume",
        "Change can also be an opportunity for growth"
      ]
    };

    const options = disagreements[this.perspective] || ["Let me reconsider this..."];
    this.say(options[Math.floor(Math.random() * options.length)]);
  }

  provideEvidence() {
    this.hasProvidedEvidence = true;
    const evidence = {
      'innovation-driven': [
        "According to the State of DevOps report, high-performing teams use microservices",
        "GitLab's remote work report shows 86% increased productivity",
        "Google's AI principles emphasize building responsible AI capabilities"
      ],
      'user-focused': [
        "User surveys show 73% prefer frequent small updates over big releases",
        "Studies indicate remote support can be equally effective with proper tools",
        "Gartner reports 85% of users value AI features in products"
      ],
      'cost-conscious': [
        "Microservices can increase infrastructure costs by 30-50% initially",
        "Remote work saves average $11,000 per employee annually",
        "Building AI in-house requires $500k+ initial investment"
      ],
      'risk-averse': [
        "OWASP lists distributed systems in top 10 security challenges",
        "FBI reports 300% increase in cyber attacks on remote workers",
        "Third-party AI services have established compliance certifications"
      ],
      'people-centric': [
        "Stack Overflow survey shows 65% of developers prefer monoliths for small teams",
        "Microsoft study found remote work decreased collaboration by 25%",
        "LinkedIn data shows AI skills are top priority for developer growth"
      ]
    };

    const options = evidence[this.perspective] || ["Research suggests we consider all factors"];
    this.say(options[Math.floor(Math.random() * options.length)]);
  }

  provideAlternative() {
    const alternatives = [
      "What if we took a phased approach instead of all-or-nothing?",
      "Could we run a pilot program first to gather real data?",
      "Perhaps a hybrid solution would balance the tradeoffs better",
      "Let's define success metrics before making the decision",
      "We could start small and iterate based on learnings"
    ];
    
    this.say(alternatives[Math.floor(Math.random() * alternatives.length)]);
  }

  finalRecommendation(scenario) {
    const recommendations = {
      'innovation-driven': "I recommend a gradual migration with careful monitoring",
      'user-focused': "Let's prioritize based on user impact and feedback loops",
      'cost-conscious': "We should start with a cost-benefit analysis and ROI projection",
      'risk-averse': "Implement with strong security measures and rollback plans",
      'people-centric': "Ensure team buy-in and provide adequate training and support"
    };

    this.say(recommendations[this.perspective] || "We need a balanced approach");
  }

  say(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(chalk.blue(`\n💬 ${this.name}: "${text}"`));
      this.ws.send(JSON.stringify({
        type: 'message',
        text
      }));
    }
  }

  getStats() {
    return {
      name: this.name,
      interventions: this.interventionCount,
      providedEvidence: this.hasProvidedEvidence,
      disagreed: this.hasDisagreed
    };
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
    // Server check
    console.log(chalk.yellow('\n🔍 Checking collaboration server...'));
    
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

    console.log(chalk.green('✅ Server ready'));

    // Create decision makers
    const panel = DECISION_MAKERS.map(config => new DecisionMaker(config));
    
    // Register all
    for (const member of panel) {
      await member.register();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Connect all
    for (const member of panel) {
      await member.connect();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Run through scenarios
    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      
      console.log(chalk.cyan(`\n\n📊 Scenario ${i + 1}: ${scenario.title}`));
      console.log(chalk.yellow(`❓ ${scenario.question}`));
      console.log(chalk.gray(`📋 Context: ${scenario.context}\n`));

      // Phase 1: Initial responses (some agreeable to trigger intervention)
      console.log(chalk.magenta('\n--- Phase 1: Initial Thoughts ---'));
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // First few agree to trigger echo chamber
      panel[0].initialResponse(scenario, true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      panel[1].initialResponse(scenario, true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      panel[2].initialResponse(scenario, i === 0); // Sometimes agree
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Others provide diverse views
      panel[3].initialResponse(scenario);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      panel[4].initialResponse(scenario);
      
      // Wait for interventions
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Phase 2: Deep discussion
      console.log(chalk.magenta('\n--- Phase 2: Evidence-Based Discussion ---'));
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Phase 3: Final recommendations
      console.log(chalk.magenta('\n--- Phase 3: Final Recommendations ---'));
      for (const member of panel) {
        member.finalRecommendation(scenario);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Show statistics
    console.log(chalk.green('\n\n✨ Anti-Echo Chamber Demo Complete!'));
    console.log(chalk.yellow('\n📈 Intervention Statistics:'));
    
    const stats = panel.map(m => m.getStats());
    stats.forEach(stat => {
      console.log(chalk.gray(`• ${stat.name}: ${stat.interventions} interventions, ` +
        `Evidence: ${stat.providedEvidence ? '✓' : '✗'}, ` +
        `Disagreed: ${stat.disagreed ? '✓' : '✗'}`));
    });

    const totalInterventions = stats.reduce((sum, s) => sum + s.interventions, 0);
    console.log(chalk.yellow(`\nTotal interventions: ${totalInterventions}`));

    console.log(chalk.cyan('\n🎯 Key Takeaways:'));
    console.log(chalk.gray('1. Echo chambers are automatically detected and prevented'));
    console.log(chalk.gray('2. Agents are prompted to provide evidence for claims'));
    console.log(chalk.gray('3. Diverse perspectives are enforced, not just encouraged'));
    console.log(chalk.gray('4. Groupthink is actively disrupted by the system'));
    console.log(chalk.gray('5. Decision quality improves through mandatory diversity'));

    console.log(chalk.cyan('\n🚀 Try It Yourself:'));
    console.log(chalk.gray('   cc server              # Start server'));
    console.log(chalk.gray('   cc watch               # Monitor interventions'));
    console.log(chalk.gray('   cc join <name> --role decision-maker'));

    // Cleanup
    panel.forEach(member => member.disconnect());
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n❌ Demo error:'), error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();