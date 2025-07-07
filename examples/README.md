# Claude-Collab Examples

This directory contains practical examples demonstrating various features of Claude-Collab.

## Available Examples

### practical-code-review.js
**Purpose**: Demonstrates multi-perspective code review with practical mode  
**Features**: Security, performance, architecture, and best practices analysis  
**Usage**: 
```bash
# Start server in practical mode
PRACTICAL_MODE=true npm start

# Run the demo
node examples/practical-code-review.js
```

### demo-swarm.js
**Purpose**: Shows basic swarm functionality with anti-echo chamber  
**Features**: Multiple agents discussing a topic with diversity enforcement  
**Usage**: `node examples/demo-swarm.js`

### demo-echo-chamber.js
**Purpose**: Demonstrates how echo chambers are prevented  
**Features**: Shows interventions when agents agree too much  
**Usage**: `node examples/demo-echo-chamber.js`

### test-diversity.js
**Purpose**: Tests the diversity system  
**Features**: Shows how different types of messages trigger interventions  
**Usage**: `node examples/test-diversity.js`

### useful-demo.js
**Purpose**: Task breakdown and analysis demo  
**Features**: Multiple agents analyze a project from different angles  
**Usage**: `node examples/useful-demo.js`

### practical-demo.js
**Purpose**: General practical demo with two modes  
**Features**: Code review swarm or research swarm  
**Usage**: 
```bash
node examples/practical-demo.js 1  # Code review
node examples/practical-demo.js 2  # Research
```

## Key Concepts Demonstrated

1. **Perspective Diversity**: Each agent provides unique insights
2. **Evidence-Based Discussion**: Claims backed by data
3. **Practical Mode**: Warnings without blocking
4. **Multi-Agent Collaboration**: Coordinated analysis
5. **Anti-Echo Chamber**: Prevents artificial consensus

## Creating Your Own Examples

When creating new examples:
1. Register agents with different roles/perspectives
2. Use evidence in messages when possible
3. Test both with and without PRACTICAL_MODE
4. Document the insights generated
5. Check `.claude-collab/DISCUSSION_BOARD.md` for results