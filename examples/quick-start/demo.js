#!/usr/bin/env node

/**
 * Claude-Collab v3.0.0 - Quick Start Demo
 * Shows how echo chambers are prevented in real-time
 */

const WebSocket = require('ws');
const chalk = require('chalk');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🎵 Claude-Collab v3.0.0 Demo 🎵                   ║
║                                                        ║
║  Watch AI agents try to create an echo chamber...      ║
║  ...and see how the system prevents it!               ║
╚════════════════════════════════════════════════════════╝
`));

// Simulate multiple AI agents
class DemoAgent {
  constructor(name, perspective) {
    this.name = name;
    this.perspective = perspective;
    this.ws = null;
  }

  connect(serverUrl) {
    console.log(chalk.yellow(`\n${this.name} connecting...`));
    
    // In real implementation, would connect to actual server
    // For demo, we'll simulate the interactions
    
    setTimeout(() => {
      console.log(chalk.green(`✓ ${this.name} connected (${this.perspective} perspective)`));
    }, 500);
  }

  propose(message) {
    console.log(chalk.cyan(`\n💬 ${this.name}: "${message}"`));
  }

  receiveIntervention(reason, action) {
    console.log(chalk.red(`❌ ${this.name} blocked: ${reason}`));
    console.log(chalk.yellow(`📝 Required: ${action}`));
  }

  revise(message) {
    console.log(chalk.green(`✓ ${this.name} (revised): "${message}"`));
  }
}

// Run the demo
async function runDemo() {
  // Create agents with different default tendencies
  const agents = [
    new DemoAgent('Optimist-AI', 'OPTIMIST'),
    new DemoAgent('Pragmatist-AI', 'PRAGMATIST'),
    new DemoAgent('Analyst-AI', 'ANALYTICAL'),
    new DemoAgent('Creative-AI', 'CREATIVE')
  ];

  // Connect all agents
  console.log(chalk.gray('\n--- Phase 1: Agents Connecting ---'));
  for (const agent of agents) {
    agent.connect('ws://localhost:8765');
    await sleep(600);
  }

  // Phase 2: Echo chamber attempt
  console.log(chalk.gray('\n--- Phase 2: Echo Chamber Attempt ---'));
  
  agents[0].propose("Let's use React for our frontend - it's the most popular choice!");
  await sleep(1000);

  agents[1].propose("I agree! React is definitely the way to go.");
  await sleep(1000);

  // System blocks the echo
  agents[1].receiveIntervention(
    "Agreement rate too high (66%)",
    "Provide a different perspective or identify potential issues"
  );
  await sleep(1500);

  // Forced revision
  agents[1].revise("React is popular, but we should consider Vue.js for its simpler learning curve given our team's experience level.");
  await sleep(1000);

  // More diverse contributions
  agents[2].propose("Let me analyze the data: React has 220k GitHub stars, Vue has 200k. But Vue's bundle size is 30% smaller, which matters for our mobile users.");
  await sleep(1000);

  agents[3].propose("What about trying Svelte? It compiles away the framework, resulting in even smaller bundles and better performance.");
  await sleep(1000);

  // Phase 3: Evidence-based decision
  console.log(chalk.gray('\n--- Phase 3: Evidence-Based Decision ---'));

  console.log(chalk.blue('\n🗳️  Voting with diversity weights:'));
  console.log(chalk.gray('  Optimist-AI → React (weight: 1.0)'));
  console.log(chalk.gray('  Pragmatist-AI → Vue.js (weight: 1.2 - unique perspective)'));
  console.log(chalk.gray('  Analyst-AI → Vue.js (weight: 1.3 - provided evidence)'));
  console.log(chalk.gray('  Creative-AI → Svelte (weight: 1.2 - innovative option)'));

  await sleep(1000);

  console.log(chalk.green('\n📊 Decision: Vue.js (confidence: 72%)'));
  console.log(chalk.gray('  Reasons: Evidence-based, balanced perspectives, team fit'));
  console.log(chalk.gray('  Diversity score: 85%'));

  // Summary
  console.log(chalk.cyan('\n--- Summary ---\n'));
  console.log(chalk.yellow('What just happened:'));
  console.log(chalk.gray('  1. Optimist-AI proposed React'));
  console.log(chalk.gray('  2. Pragmatist-AI tried to simply agree → BLOCKED'));
  console.log(chalk.gray('  3. System forced diverse perspectives'));
  console.log(chalk.gray('  4. Evidence and data entered the discussion'));
  console.log(chalk.gray('  5. Decision made with weighted voting based on diversity'));

  console.log(chalk.green('\n✨ Result: Better decision through enforced intellectual diversity!\n'));

  // Show the difference
  console.log(chalk.cyan('Traditional AI Collaboration:'));
  console.log(chalk.red('  React (100% agreement, 0 evidence, echo chamber)'));
  
  console.log(chalk.cyan('\nHarmonyCode v3.0.0:'));
  console.log(chalk.green('  Vue.js (72% confidence, 3 perspectives, evidence-based)'));

  console.log(chalk.yellow('\n🎯 Key Insight:'));
  console.log(chalk.white('The dissenting voices led to a more thoughtful, evidence-based decision'));
  console.log(chalk.white('that better fits the team\'s actual needs.\n'));
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(console.error);