/**
 * Claude-Collab v3.0.0 - Orchestration Engine
 * Integrates Claude-Flow orchestration capabilities with real-time collaboration
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { TaskLockManager } from './task-lock-manager';

export interface OrchestrationConfig {
  enableSPARC?: boolean;
  swarmMode?: 'centralized' | 'distributed' | 'hierarchical' | 'mesh' | 'hybrid';
  maxAgents?: number;
  taskTimeout?: number;
  enableMemory?: boolean;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  assignedTo?: string;
  dependencies?: string[];
  requiresPerspectives?: string[];
  evidenceRequired?: boolean;
  createdAt: Date;
  deadline?: Date;
  result?: any;
}

export interface Agent {
  id: string;
  mode: SPARCMode;
  capabilities: string[];
  perspective?: string;
  status: 'idle' | 'busy' | 'offline';
  currentTask?: string;
}

export interface Edit {
  file: string;
  edit: any;
  version: number;
  sessionId: string;
}

export interface Vote {
  proposalId: string;
  sessionId: string;
  vote: any;
  weight: number;
  evidence?: any;
  perspective?: string;
}

export type SPARCMode = 
  | 'orchestrator' | 'coder' | 'researcher' | 'tdd' 
  | 'architect' | 'reviewer' | 'debugger' | 'tester'
  | 'analyzer' | 'optimizer' | 'documenter' | 'designer'
  | 'innovator' | 'swarm-coordinator' | 'memory-manager'
  | 'batch-executor' | 'workflow-manager';

export class OrchestrationEngine extends EventEmitter {
  private config: OrchestrationConfig;
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();
  private edits: Map<string, Edit[]> = new Map();
  private votes: Map<string, Vote[]> = new Map();
  private memory: Map<string, any> = new Map();
  private workflowState: Map<string, any> = new Map();
  private projectPath: string;
  private taskLockManager: TaskLockManager;

  constructor(config?: OrchestrationConfig) {
    super();
    this.config = {
      enableSPARC: true,
      swarmMode: 'distributed',
      maxAgents: 10,
      taskTimeout: 300000, // 5 minutes
      enableMemory: true,
      ...config
    };
    this.projectPath = process.cwd();
    this.taskLockManager = new TaskLockManager(path.join(this.projectPath, '.claude-collab'));
  }

  /**
   * Initialize orchestration engine
   */
  async initialize(): Promise<void> {
    // Load persisted state if exists
    await this.loadState();
    
    // Initialize memory system
    if (this.config.enableMemory) {
      await this.initializeMemory();
    }
    
    console.log('🎼 Orchestration engine initialized');
    console.log(`   SPARC modes: ${this.config.enableSPARC ? 'Enabled' : 'Disabled'}`);
    console.log(`   Swarm mode: ${this.config.swarmMode}`);
    console.log(`   Max agents: ${this.config.maxAgents}`);
  }

  /**
   * Get available SPARC modes
   */
  getAvailableModes(): SPARCMode[] {
    if (!this.config.enableSPARC) return [];
    
    return [
      'orchestrator', 'coder', 'researcher', 'tdd',
      'architect', 'reviewer', 'debugger', 'tester',
      'analyzer', 'optimizer', 'documenter', 'designer',
      'innovator', 'swarm-coordinator', 'memory-manager',
      'batch-executor', 'workflow-manager'
    ];
  }

  /**
   * Process incoming message through orchestration
   */
  async processMessage(sessionId: string, message: any): Promise<void> {
    switch (message.type) {
      case 'task':
        await this.handleTaskMessage(sessionId, message);
        break;
        
      case 'swarm':
        await this.handleSwarmMessage(sessionId, message);
        break;
        
      case 'workflow':
        await this.handleWorkflowMessage(sessionId, message);
        break;
        
      case 'memory':
        await this.handleMemoryMessage(sessionId, message);
        break;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: taskData.type || 'general',
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: 'pending',
      requiresPerspectives: taskData.requiresPerspectives || [],
      evidenceRequired: taskData.evidenceRequired || false,
      createdAt: new Date(),
      ...taskData
    };
    
    this.tasks.set(task.id, task);
    
    // Emit event
    this.emit('taskCreated', task);
    
    // Auto-assign if swarm mode
    if (this.config.swarmMode !== 'centralized') {
      await this.autoAssignTask(task);
    }
    
    return task;
  }

  /**
   * Assign task to agent with atomic locking
   */
  async assignTask(taskId: string, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);
    
    if (!task || !agent) {
      throw new Error('Task or agent not found');
    }
    
    if (agent.status === 'busy') {
      throw new Error('Agent is busy');
    }
    
    // Check if task is available
    if (!this.taskLockManager.isTaskAvailable(taskId)) {
      throw new Error('Task is not available - already locked or claimed');
    }
    
    // Try to acquire lock
    const lockToken = this.taskLockManager.acquireLock(taskId, agentId);
    if (!lockToken) {
      throw new Error('Failed to acquire task lock - another agent is claiming this task');
    }
    
    try {
      // Claim the task with lock protection
      const claimed = this.taskLockManager.claimTask(taskId, agentId, lockToken);
      if (!claimed) {
        throw new Error('Failed to claim task - may already be claimed');
      }
      
      // Update internal state
      task.assignedTo = agentId;
      task.status = 'in-progress';
      agent.currentTask = taskId;
      agent.status = 'busy';
      
      this.emit('taskAssigned', { task, agent });
      
      // Set timeout
      setTimeout(() => {
        if (task.status === 'in-progress') {
          this.handleTaskTimeout(taskId);
        }
      }, this.config.taskTimeout!);
      
    } catch (error) {
      // Release lock if claiming fails
      this.taskLockManager.releaseLock(taskId, lockToken);
      throw error;
    }
  }

  /**
   * Apply edit with conflict detection
   */
  async applyEdit(edit: Edit): Promise<{ conflict: boolean; conflicts?: any[] }> {
    const fileEdits = this.edits.get(edit.file) || [];
    
    // Simple conflict detection - check if same file edited recently
    const recentEdits = fileEdits.filter(e => 
      Date.now() - e.version < 5000 && e.sessionId !== edit.sessionId
    );
    
    if (recentEdits.length > 0) {
      return {
        conflict: true,
        conflicts: [...recentEdits, edit]
      };
    }
    
    // No conflict, apply edit
    fileEdits.push(edit);
    this.edits.set(edit.file, fileEdits);
    
    // Actually write to file
    await this.writeEdit(edit);
    
    return { conflict: false };
  }

  /**
   * Record a vote
   */
  async recordVote(vote: Vote): Promise<void> {
    const proposalVotes = this.votes.get(vote.proposalId) || [];
    
    // Check if already voted
    const existingVote = proposalVotes.find(v => v.sessionId === vote.sessionId);
    if (existingVote) {
      // Update vote
      Object.assign(existingVote, vote);
    } else {
      proposalVotes.push(vote);
    }
    
    this.votes.set(vote.proposalId, proposalVotes);
  }

  /**
   * Check if voting is complete
   */
  async checkVotingComplete(proposalId: string): Promise<{
    complete: boolean;
    votes?: Vote[];
  }> {
    const proposalVotes = this.votes.get(proposalId) || [];
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status !== 'offline');
    
    // Complete when all active agents have voted
    const complete = proposalVotes.length >= activeAgents.length;
    
    return {
      complete,
      votes: complete ? proposalVotes : undefined
    };
  }

  /**
   * Spawn agents with SPARC modes
   */
  async spawnAgents(options: {
    mode: SPARCMode;
    task: string;
    count: number;
    ensureDiversity?: boolean;
  }): Promise<Agent[]> {
    const agents: Agent[] = [];
    
    for (let i = 0; i < options.count; i++) {
      const agent: Agent = {
        id: `${options.mode}-${Date.now()}-${i}`,
        mode: options.mode,
        capabilities: this.getModeCapabilities(options.mode),
        status: 'idle'
      };
      
      this.agents.set(agent.id, agent);
      agents.push(agent);
      
      // Create initial task for agent
      if (options.task) {
        const task = await this.createTask({
          type: options.mode,
          description: options.task,
          priority: 'high',
          assignedTo: agent.id
        });
        
        agent.currentTask = task.id;
        agent.status = 'busy';
      }
    }
    
    this.emit('agentsSpawned', agents);
    return agents;
  }

  /**
   * Handle agent disconnect
   */
  handleAgentDisconnect(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    agent.status = 'offline';
    
    // Reassign current task if any
    if (agent.currentTask) {
      const task = this.tasks.get(agent.currentTask);
      if (task && task.status === 'in-progress') {
        task.assignedTo = undefined;
        task.status = 'pending';
        this.autoAssignTask(task);
      }
    }
  }

  /**
   * Save orchestration state
   */
  async saveState(): Promise<void> {
    // Cleanup task lock manager before saving
    this.taskLockManager.destroy();
    
    const state = {
      tasks: Array.from(this.tasks.entries()),
      agents: Array.from(this.agents.entries()),
      memory: this.config.enableMemory ? Array.from(this.memory.entries()) : [],
      workflowState: Array.from(this.workflowState.entries())
    };
    
    const statePath = path.join(this.projectPath, '.claude-collab', 'orchestration-state.json');
    await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load orchestration state
   */
  private async loadState(): Promise<void> {
    const statePath = path.join(this.projectPath, '.claude-collab', 'orchestration-state.json');
    
    try {
      if (fs.existsSync(statePath)) {
        const data = await fs.promises.readFile(statePath, 'utf-8');
        const state = JSON.parse(data);
        
        this.tasks = new Map(state.tasks || []);
        this.agents = new Map(state.agents || []);
        this.memory = new Map(state.memory || []);
        this.workflowState = new Map(state.workflowState || []);
        
        console.log(`📂 Loaded orchestration state: ${this.tasks.size} tasks, ${this.agents.size} agents`);
      }
    } catch (error) {
      console.error('Failed to load orchestration state:', error);
    }
  }

  /**
   * Initialize memory system
   */
  private async initializeMemory(): Promise<void> {
    const memoryPath = path.join(this.projectPath, '.claude-collab', 'memory');
    
    if (!fs.existsSync(memoryPath)) {
      fs.mkdirSync(memoryPath, { recursive: true });
    }
    
    // Load memory files
    const files = await fs.promises.readdir(memoryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.promises.readFile(path.join(memoryPath, file), 'utf-8');
        const key = file.replace('.json', '');
        this.memory.set(key, JSON.parse(data));
      }
    }
    
    console.log(`🧠 Loaded ${this.memory.size} memory entries`);
  }

  /**
   * Handle task-related messages
   */
  private async handleTaskMessage(sessionId: string, message: any): Promise<void> {
    const { action, data } = message;
    
    switch (action) {
      case 'create':
        await this.createTask(data);
        break;
        
      case 'claim':
        try {
          await this.assignTask(data.taskId, sessionId);
        } catch (error: any) {
          // Emit error event for the session to handle
          this.emit('taskClaimError', { 
            sessionId, 
            taskId: data.taskId, 
            error: error.message 
          });
        }
        break;
        
      case 'complete':
        await this.completeTask(data.taskId, data.result);
        break;
        
      case 'list':
        const tasks = Array.from(this.tasks.values());
        this.emit('taskList', { sessionId, tasks });
        break;
    }
  }

  /**
   * Handle swarm-related messages
   */
  private async handleSwarmMessage(sessionId: string, message: any): Promise<void> {
    const { objective, strategy, options } = message;
    
    // Decompose objective into tasks
    const tasks = await this.decomposeObjective(objective, strategy);
    
    // Create task queue
    for (const task of tasks) {
      await this.createTask(task);
    }
    
    // Spawn specialized agents if needed
    if (options?.autoSpawn) {
      const modes = this.selectModesForObjective(objective);
      for (const mode of modes) {
        await this.spawnAgents({
          mode,
          task: objective,
          count: 1,
          ensureDiversity: true
        });
      }
    }
    
    this.emit('swarmInitialized', {
      objective,
      strategy,
      taskCount: tasks.length
    });
  }

  /**
   * Handle workflow messages
   */
  private async handleWorkflowMessage(sessionId: string, message: any): Promise<void> {
    const { workflowId, action, data } = message;
    
    switch (action) {
      case 'start':
        await this.startWorkflow(workflowId, data);
        break;
        
      case 'progress':
        await this.updateWorkflowProgress(workflowId, data);
        break;
        
      case 'complete':
        await this.completeWorkflow(workflowId, data);
        break;
    }
  }

  /**
   * Handle memory messages
   */
  private async handleMemoryMessage(sessionId: string, message: any): Promise<void> {
    if (!this.config.enableMemory) return;
    
    const { action, key, value } = message;
    
    switch (action) {
      case 'store':
        await this.storeMemory(key, value);
        break;
        
      case 'retrieve':
        const data = this.memory.get(key);
        this.emit('memoryRetrieved', { sessionId, key, data });
        break;
        
      case 'list':
        const keys = Array.from(this.memory.keys());
        this.emit('memoryList', { sessionId, keys });
        break;
    }
  }

  /**
   * Auto-assign task based on agent capabilities
   */
  private async autoAssignTask(task: Task): Promise<void> {
    // Only auto-assign if task is available
    if (!this.taskLockManager.isTaskAvailable(task.id)) {
      return;
    }
    
    const availableAgents = Array.from(this.agents.values())
      .filter(a => a.status === 'idle' && this.canHandleTask(a, task));
    
    if (availableAgents.length > 0) {
      // Select best agent based on mode and capabilities
      const bestAgent = this.selectBestAgent(availableAgents, task);
      
      try {
        await this.assignTask(task.id, bestAgent.id);
      } catch (error) {
        // Another agent may have claimed it - that's ok
        console.log(`Auto-assign failed for task ${task.id}: ${error}`);
      }
    }
  }

  /**
   * Check if agent can handle task
   */
  private canHandleTask(agent: Agent, task: Task): boolean {
    // Check mode compatibility
    const modeCompatibility: Record<string, SPARCMode[]> = {
      'code': ['coder', 'tdd', 'debugger'],
      'review': ['reviewer', 'tester', 'analyzer'],
      'design': ['architect', 'designer'],
      'research': ['researcher', 'analyzer'],
      'documentation': ['documenter']
    };
    
    const compatibleModes = modeCompatibility[task.type] || [];
    return compatibleModes.includes(agent.mode);
  }

  /**
   * Select best agent for task
   */
  private selectBestAgent(agents: Agent[], task: Task): Agent {
    // Simple selection - could be enhanced with scoring
    return agents[0];
  }

  /**
   * Get capabilities for SPARC mode
   */
  private getModeCapabilities(mode: SPARCMode): string[] {
    const capabilities: Record<SPARCMode, string[]> = {
      'orchestrator': ['planning', 'coordination', 'delegation'],
      'coder': ['implementation', 'refactoring', 'debugging'],
      'researcher': ['analysis', 'investigation', 'documentation'],
      'tdd': ['testing', 'test-design', 'implementation'],
      'architect': ['design', 'planning', 'system-design'],
      'reviewer': ['code-review', 'analysis', 'feedback'],
      'debugger': ['debugging', 'troubleshooting', 'fixing'],
      'tester': ['testing', 'validation', 'qa'],
      'analyzer': ['analysis', 'metrics', 'reporting'],
      'optimizer': ['optimization', 'performance', 'refactoring'],
      'documenter': ['documentation', 'writing', 'examples'],
      'designer': ['ui-design', 'ux-design', 'architecture'],
      'innovator': ['ideation', 'prototyping', 'experimentation'],
      'swarm-coordinator': ['coordination', 'orchestration', 'management'],
      'memory-manager': ['storage', 'retrieval', 'organization'],
      'batch-executor': ['batch-processing', 'automation', 'execution'],
      'workflow-manager': ['workflow', 'process', 'automation']
    };
    
    return capabilities[mode] || [];
  }

  /**
   * Complete a task
   */
  private async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Update task lock status
    const agentId = task.assignedTo;
    if (agentId) {
      this.taskLockManager.updateTaskStatus(taskId, agentId, 'completed');
    }
    
    task.status = 'completed';
    task.result = result;
    
    const agent = this.agents.get(task.assignedTo!);
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;
    }
    
    this.emit('taskCompleted', task);
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'in-progress') return;
    
    task.status = 'failed';
    
    const agent = this.agents.get(task.assignedTo!);
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;
    }
    
    this.emit('taskTimeout', task);
    
    // Try to reassign
    this.autoAssignTask(task);
  }

  /**
   * Write edit to file
   */
  private async writeEdit(edit: Edit): Promise<void> {
    const filePath = path.join(this.projectPath, edit.file);
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    
    // In real implementation, would apply the specific edit
    // For now, just append a comment
    const comment = `\n// Edit by ${edit.sessionId} at ${new Date().toISOString()}\n`;
    await fs.promises.appendFile(filePath, comment);
  }

  /**
   * Store memory entry
   */
  private async storeMemory(key: string, value: any): Promise<void> {
    this.memory.set(key, value);
    
    // Persist to disk
    const memoryPath = path.join(this.projectPath, '.claude-collab', 'memory', `${key}.json`);
    await fs.promises.writeFile(memoryPath, JSON.stringify(value, null, 2));
    
    this.emit('memoryStored', { key, value });
  }

  /**
   * Decompose objective into tasks
   */
  private async decomposeObjective(objective: string, strategy: string): Promise<Partial<Task>[]> {
    // Simple decomposition - in real implementation would use AI
    const tasks: Partial<Task>[] = [];
    
    // Add exploration phase
    tasks.push({
      type: 'research',
      description: `Research and analyze: ${objective}`,
      priority: 'high',
      requiresPerspectives: ['ANALYTICAL', 'SKEPTIC']
    });
    
    // Add design phase
    tasks.push({
      type: 'design',
      description: `Design solution for: ${objective}`,
      priority: 'high',
      requiresPerspectives: ['ARCHITECT', 'INNOVATOR']
    });
    
    // Add implementation phase
    tasks.push({
      type: 'code',
      description: `Implement: ${objective}`,
      priority: 'medium',
      dependencies: [tasks[1].description!]
    });
    
    // Add testing phase
    tasks.push({
      type: 'test',
      description: `Test implementation: ${objective}`,
      priority: 'medium',
      dependencies: [tasks[2].description!],
      requiresPerspectives: ['SKEPTIC', 'DETAIL_ORIENTED']
    });
    
    return tasks;
  }

  /**
   * Select SPARC modes for objective
   */
  private selectModesForObjective(objective: string): SPARCMode[] {
    // Simple selection based on keywords
    const modes: SPARCMode[] = [];
    
    if (objective.includes('build') || objective.includes('implement')) {
      modes.push('coder', 'architect');
    }
    if (objective.includes('test') || objective.includes('quality')) {
      modes.push('tester', 'reviewer');
    }
    if (objective.includes('research') || objective.includes('analyze')) {
      modes.push('researcher', 'analyzer');
    }
    if (objective.includes('design')) {
      modes.push('designer', 'architect');
    }
    
    // Always include orchestrator for coordination
    if (modes.length > 2) {
      modes.unshift('orchestrator');
    }
    
    return modes;
  }

  /**
   * Start a workflow
   */
  private async startWorkflow(workflowId: string, data: any): Promise<void> {
    this.workflowState.set(workflowId, {
      status: 'running',
      startedAt: new Date(),
      ...data
    });
    
    this.emit('workflowStarted', { workflowId, data });
  }

  /**
   * Update workflow progress
   */
  private async updateWorkflowProgress(workflowId: string, data: any): Promise<void> {
    const workflow = this.workflowState.get(workflowId);
    if (!workflow) return;
    
    Object.assign(workflow, data);
    this.emit('workflowProgress', { workflowId, data });
  }

  /**
   * Complete a workflow
   */
  private async completeWorkflow(workflowId: string, data: any): Promise<void> {
    const workflow = this.workflowState.get(workflowId);
    if (!workflow) return;
    
    workflow.status = 'completed';
    workflow.completedAt = new Date();
    workflow.result = data;
    
    this.emit('workflowCompleted', { workflowId, workflow });
  }
}