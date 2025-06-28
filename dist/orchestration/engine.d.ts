/**
 * Claude-Collab v3.0.0 - Orchestration Engine
 * Integrates Claude-Flow orchestration capabilities with real-time collaboration
 */
import { EventEmitter } from 'events';
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
export type SPARCMode = 'orchestrator' | 'coder' | 'researcher' | 'tdd' | 'architect' | 'reviewer' | 'debugger' | 'tester' | 'analyzer' | 'optimizer' | 'documenter' | 'designer' | 'innovator' | 'swarm-coordinator' | 'memory-manager' | 'batch-executor' | 'workflow-manager';
export declare class OrchestrationEngine extends EventEmitter {
    private config;
    private tasks;
    private agents;
    private edits;
    private votes;
    private memory;
    private workflowState;
    private projectPath;
    private taskLockManager;
    constructor(config?: OrchestrationConfig);
    /**
     * Initialize orchestration engine
     */
    initialize(): Promise<void>;
    /**
     * Get available SPARC modes
     */
    getAvailableModes(): SPARCMode[];
    /**
     * Process incoming message through orchestration
     */
    processMessage(sessionId: string, message: any): Promise<void>;
    /**
     * Create a new task
     */
    createTask(taskData: Partial<Task>): Promise<Task>;
    /**
     * Assign task to agent with atomic locking
     */
    assignTask(taskId: string, agentId: string): Promise<void>;
    /**
     * Apply edit with conflict detection
     */
    applyEdit(edit: Edit): Promise<{
        conflict: boolean;
        conflicts?: any[];
    }>;
    /**
     * Record a vote
     */
    recordVote(vote: Vote): Promise<void>;
    /**
     * Check if voting is complete
     */
    checkVotingComplete(proposalId: string): Promise<{
        complete: boolean;
        votes?: Vote[];
    }>;
    /**
     * Spawn agents with SPARC modes
     */
    spawnAgents(options: {
        mode: SPARCMode;
        task: string;
        count: number;
        ensureDiversity?: boolean;
    }): Promise<Agent[]>;
    /**
     * Handle agent disconnect
     */
    handleAgentDisconnect(agentId: string): void;
    /**
     * Save orchestration state
     */
    saveState(): Promise<void>;
    /**
     * Load orchestration state
     */
    private loadState;
    /**
     * Initialize memory system
     */
    private initializeMemory;
    /**
     * Handle task-related messages
     */
    private handleTaskMessage;
    /**
     * Handle swarm-related messages
     */
    private handleSwarmMessage;
    /**
     * Handle workflow messages
     */
    private handleWorkflowMessage;
    /**
     * Handle memory messages
     */
    private handleMemoryMessage;
    /**
     * Auto-assign task based on agent capabilities
     */
    private autoAssignTask;
    /**
     * Check if agent can handle task
     */
    private canHandleTask;
    /**
     * Select best agent for task
     */
    private selectBestAgent;
    /**
     * Get capabilities for SPARC mode
     */
    private getModeCapabilities;
    /**
     * Complete a task
     */
    private completeTask;
    /**
     * Handle task timeout
     */
    private handleTaskTimeout;
    /**
     * Write edit to file
     */
    private writeEdit;
    /**
     * Store memory entry
     */
    private storeMemory;
    /**
     * Decompose objective into tasks
     */
    private decomposeObjective;
    /**
     * Select SPARC modes for objective
     */
    private selectModesForObjective;
    /**
     * Start a workflow
     */
    private startWorkflow;
    /**
     * Update workflow progress
     */
    private updateWorkflowProgress;
    /**
     * Complete a workflow
     */
    private completeWorkflow;
}
//# sourceMappingURL=engine.d.ts.map